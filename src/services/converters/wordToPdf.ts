import DOMPurify from 'dompurify';
import {jsPDF} from 'jspdf';
import mammoth from 'mammoth';
import {yieldToMainThread} from '../pdfEngine';

export interface WordPreviewResult {
  html: string;
  messages: string[];
}

export function sanitizeWordHtml(rawHtml: string): string {
  const purifier = DOMPurify;
  purifier.addHook('afterSanitizeAttributes', (node) => {
    if (node.hasAttribute('href')) {
      const href = (node.getAttribute('href') ?? '').trim();
      if (!/^(?:https?:|mailto:|#)/i.test(href)) {
        node.removeAttribute('href');
      } else {
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  try {
    return purifier.sanitize(rawHtml, {
      FORBID_TAGS: [
        'script',
        'iframe',
        'object',
        'embed',
        'form',
        'input',
        'textarea',
        'select',
        'button',
        'style',
        'link',
        'meta',
        'base',
      ],
      FORBID_ATTR: ['style'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|data:image\/(?:png|jpeg|jpg|gif|webp);base64,|#)/i,
    });
  } finally {
    purifier.removeHook('afterSanitizeAttributes');
  }
}

export async function extractWordPreview(file: File): Promise<WordPreviewResult> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    {arrayBuffer},
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((imageBuffer) => ({
          src: `data:${image.contentType};base64,${imageBuffer}`,
        }))
      ),
    }
  );
  return {
    html: sanitizeWordHtml(result.value),
    messages: result.messages.map((m) => m.message),
  };
}

// Characters supported directly by jsPDF standard Helvetica WinAnsi encoding
const WINANSI_EXTRAS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

function isWinAnsiString(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13) continue;
    if (code >= 0x20 && code <= 0x7e) continue;
    if (code >= 0xa0 && code <= 0xff) continue;
    if (WINANSI_EXTRAS.has(code)) continue;
    return false;
  }
  return true;
}

interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  href?: string;
}

interface InlineStyleFlags {
  bold: boolean;
  italic: boolean;
  code: boolean;
  href?: string;
}

function collectInlineRuns(node: Node, style: InlineStyleFlags, out: InlineRun[]): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.textContent ?? '';
    if (raw) {
      out.push({
        text: raw,
        bold: style.bold,
        italic: style.italic,
        code: style.code,
        href: style.href,
      });
    }
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (tag === 'br') {
    out.push({text: '\n', bold: style.bold, italic: style.italic, code: style.code});
    return;
  }

  const nextStyle: InlineStyleFlags = {
    bold: style.bold || tag === 'strong' || tag === 'b' || tag === 'th',
    italic: style.italic || tag === 'em' || tag === 'i',
    code: style.code || tag === 'code' || tag === 'pre',
    href: tag === 'a' ? el.getAttribute('href') ?? style.href : style.href,
  };

  for (const child of Array.from(el.childNodes)) {
    collectInlineRuns(child, nextStyle, out);
  }
}

function normalizeInlineRuns(runs: InlineRun[]): InlineRun[] {
  const cleaned: InlineRun[] = [];
  for (const r of runs) {
    const collapsed = r.text.replace(/[ \t\r\n]+/g, ' ');
    if (!collapsed) continue;
    const prev = cleaned[cleaned.length - 1];
    if (
      prev &&
      prev.bold === r.bold &&
      prev.italic === r.italic &&
      prev.code === r.code &&
      prev.href === r.href
    ) {
      prev.text += collapsed;
    } else {
      cleaned.push({...r, text: collapsed});
    }
  }
  if (cleaned.length > 0) {
    cleaned[0].text = cleaned[0].text.replace(/^\s+/, '');
    const last = cleaned[cleaned.length - 1];
    last.text = last.text.replace(/\s+$/, '');
  }
  return cleaned.filter((r) => r.text.length > 0);
}

interface PositionedSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  href?: string;
  widthMm: number;
}

function wrapRunsToLines(
  pdf: jsPDF,
  runs: InlineRun[],
  maxWidthMm: number,
  fontSizePt: number,
  defaultBold = false,
  defaultItalic = false
): PositionedSegment[][] {
  pdf.setFontSize(fontSizePt);

  // Split runs into word + trailing space tokens plus explicit '\n'
  const lines: PositionedSegment[][] = [];
  let currentLine: PositionedSegment[] = [];
  let currentWidth = 0;

  const setFontFor = (seg: {bold: boolean; italic: boolean; code: boolean}) => {
    const family = seg.code ? 'courier' : 'helvetica';
    const b = seg.bold || defaultBold;
    const it = seg.italic || defaultItalic;
    const style = b && it ? 'bolditalic' : b ? 'bold' : it ? 'italic' : 'normal';
    pdf.setFont(family, style);
  };

  for (const run of runs) {
    const parts = run.text.split(/(\n| +)/);
    for (const part of parts) {
      if (!part) continue;
      if (part === '\n') {
        lines.push(currentLine);
        currentLine = [];
        currentWidth = 0;
        continue;
      }

      const isSpace = /^ +$/.test(part);
      if (isSpace && currentLine.length === 0) {
        continue;
      }

      setFontFor(run);
      let partWidth = pdf.getTextWidth(part);

      if (!isSpace && currentLine.length > 0 && currentWidth + partWidth > maxWidthMm) {
        // Trim trailing space on previous segment before breaking
        const last = currentLine[currentLine.length - 1];
        if (last && last.text.endsWith(' ')) {
          last.text = last.text.replace(/ +$/, '');
          setFontFor(last);
          last.widthMm = pdf.getTextWidth(last.text);
        }
        lines.push(currentLine.filter((s) => s.text.length > 0));
        currentLine = [];
        currentWidth = 0;
      }

      // If single word still exceeds maxWidthMm, hard-break by characters
      if (!isSpace && partWidth > maxWidthMm) {
        let chunk = '';
        setFontFor(run);
        for (const ch of part) {
          const w = pdf.getTextWidth(chunk + ch);
          if (chunk && currentWidth + w > maxWidthMm) {
            currentLine.push({
              text: chunk,
              bold: run.bold || defaultBold,
              italic: run.italic || defaultItalic,
              code: run.code,
              href: run.href,
              widthMm: pdf.getTextWidth(chunk),
            });
            lines.push(currentLine);
            currentLine = [];
            currentWidth = 0;
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        if (chunk) {
          partWidth = pdf.getTextWidth(chunk);
          currentLine.push({
            text: chunk,
            bold: run.bold || defaultBold,
            italic: run.italic || defaultItalic,
            code: run.code,
            href: run.href,
            widthMm: partWidth,
          });
          currentWidth += partWidth;
        }
        continue;
      }

      const last = currentLine[currentLine.length - 1];
      if (
        last &&
        last.bold === (run.bold || defaultBold) &&
        last.italic === (run.italic || defaultItalic) &&
        last.code === run.code &&
        last.href === run.href
      ) {
        last.text += part;
        last.widthMm += partWidth;
      } else {
        currentLine.push({
          text: part,
          bold: run.bold || defaultBold,
          italic: run.italic || defaultItalic,
          code: run.code,
          href: run.href,
          widthMm: partWidth,
        });
      }
      currentWidth += partWidth;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }
  return lines.length > 0 ? lines : [[]];
}

function wrapUnicodeCanvasLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/(\s+)/);
    let current = '';
    for (const token of words) {
      if (!token) continue;
      if (/^\s+$/.test(token) && !current) continue;
      const candidate = current + token;
      if (current && ctx.measureText(candidate).width > maxWidthPx) {
        lines.push(current.trimEnd());
        current = token.trimStart();
      } else {
        current = candidate;
      }
    }
    if (current.trimEnd()) {
      lines.push(current.trimEnd());
    }
  }
  return lines.length > 0 ? lines : [''];
}

function renderUnicodeLineToDataUrl(
  lineText: string,
  widthMm: number,
  fontSizePt: number,
  lineHeightMm: number,
  options: {bold?: boolean; italic?: boolean; color?: string; bgColor?: string}
): {dataUrl: string; widthMm: number; heightMm: number} {
  // 3 px per mm * ~3x DPI = crisp ~230 DPI rendering for small single-line strips
  const pxPerMm = 9;
  const canvasW = Math.max(16, Math.ceil(widthMm * pxPerMm));
  const canvasH = Math.max(16, Math.ceil(lineHeightMm * pxPerMm));

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  if (options.bgColor) {
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, canvasW, canvasH);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  const fontSizePx = fontSizePt * 0.352778 * pxPerMm;
  const weight = options.bold ? '700' : '400';
  const slant = options.italic ? 'italic' : 'normal';
  ctx.font = `${slant} ${weight} ${fontSizePx}px 'Noto Sans Tamil', 'DM Sans', system-ui, sans-serif`;
  ctx.fillStyle = options.color ?? '#0f172a';
  ctx.textBaseline = 'middle';
  ctx.fillText(lineText, 0, canvasH / 2);

  const dataUrl = canvas.toDataURL('image/png');
  canvas.width = 0;
  canvas.height = 0;
  return {dataUrl, widthMm, heightMm: lineHeightMm};
}

function measureUnicodeLines(
  text: string,
  widthMm: number,
  fontSizePt: number,
  bold: boolean,
  italic: boolean
): string[] {
  const pxPerMm = 9;
  const maxWidthPx = Math.max(24, widthMm * pxPerMm);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return [text];
  const fontSizePx = fontSizePt * 0.352778 * pxPerMm;
  const weight = bold ? '700' : '400';
  const slant = italic ? 'italic' : 'normal';
  ctx.font = `${slant} ${weight} ${fontSizePx}px 'Noto Sans Tamil', 'DM Sans', system-ui, sans-serif`;
  const lines = wrapUnicodeCanvasLines(ctx, text, maxWidthPx);
  canvas.width = 0;
  canvas.height = 0;
  return lines;
}

async function decodeImageForPdf(
  src: string
): Promise<{dataUrl: string; format: 'PNG' | 'JPEG'; widthPx: number; heightPx: number} | null> {
  if (!src || !src.startsWith('data:image/')) return null;

  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (w <= 0 || h <= 0) {
        resolve(null);
        return;
      }
      // Normalize via canvas so unsupported subformats (e.g., WEBP/GIF) become clean JPEG/PNG
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      const isPng = src.startsWith('data:image/png');
      if (!isPng) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);
      const format = isPng ? 'PNG' : 'JPEG';
      const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.92);
      canvas.width = 0;
      canvas.height = 0;
      resolve({dataUrl, format, widthPx: w, heightPx: h});
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function convertWordHtmlToPdf(
  htmlContent: string,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  onProgress?.(5);
  const safeHtml = sanitizeWordHtml(htmlContent);

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(safeHtml || '<p></p>', 'text/html');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const PAGE_W = pdf.internal.pageSize.getWidth(); // 210mm
  const PAGE_H = pdf.internal.pageSize.getHeight(); // 297mm
  const MARGIN = 18;
  const CONTENT_W = PAGE_W - MARGIN * 2; // 174mm
  const TOP_Y = MARGIN;
  const BOTTOM_Y = PAGE_H - MARGIN; // 279mm

  let cursorY = TOP_Y;

  const checkAbort = () => {
    if (signal?.aborted) {
      throw new DOMException('Operation cancelled', 'AbortError');
    }
  };

  const ensureSpace = (neededMm: number) => {
    if (cursorY > TOP_Y && cursorY + neededMm > BOTTOM_Y) {
      pdf.addPage();
      cursorY = TOP_Y;
    }
  };

  const drawTextParagraph = (
    runs: InlineRun[],
    opts: {
      xMm: number;
      widthMm: number;
      fontSizePt: number;
      lineHeightFactor?: number;
      spaceAfterMm?: number;
      spaceBeforeMm?: number;
      defaultBold?: boolean;
      defaultItalic?: boolean;
      colorRgb?: [number, number, number];
      leftBarColor?: [number, number, number];
      prefixText?: string;
      prefixWidthMm?: number;
      keepWithNextMm?: number;
    }
  ) => {
    const normalized = normalizeInlineRuns(runs);
    if (normalized.length === 0 && !opts.prefixText) return;

    if (opts.spaceBeforeMm && cursorY > TOP_Y) {
      cursorY += opts.spaceBeforeMm;
    }

    const lineHeightMm = opts.fontSizePt * 0.352778 * (opts.lineHeightFactor ?? 1.45);
    const fullText = normalized.map((r) => r.text).join('') + (opts.prefixText ?? '');
    const colorRgb = opts.colorRgb ?? [15, 23, 42];
    const colorHex = `#${colorRgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

    // Check keep-with-next so headings never sit alone at the bottom of a page
    if (opts.keepWithNextMm) {
      ensureSpace(lineHeightMm * 1.2 + opts.keepWithNextMm);
    }

    if (!isWinAnsiString(fullText)) {
      // Render line-by-line via small per-line canvas strips for full Unicode/Tamil shaping with zero mid-line cuts
      const textOnly = normalized.map((r) => r.text).join('');
      const wrapped = measureUnicodeLines(
        textOnly,
        opts.widthMm,
        opts.fontSizePt,
        Boolean(opts.defaultBold || normalized.some((r) => r.bold)),
        Boolean(opts.defaultItalic || normalized.every((r) => r.italic))
      );

      for (let i = 0; i < wrapped.length; i++) {
        ensureSpace(lineHeightMm);
        const lineY = cursorY;

        if (opts.leftBarColor) {
          pdf.setDrawColor(...opts.leftBarColor);
          pdf.setLineWidth(0.9);
          pdf.line(opts.xMm - 4, lineY, opts.xMm - 4, lineY + lineHeightMm);
        }

        if (i === 0 && opts.prefixText && opts.prefixWidthMm) {
          if (isWinAnsiString(opts.prefixText)) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(opts.fontSizePt);
            pdf.setTextColor(...colorRgb);
            pdf.text(opts.prefixText, opts.xMm - opts.prefixWidthMm, lineY + lineHeightMm * 0.72);
          } else {
            const pStrip = renderUnicodeLineToDataUrl(
              opts.prefixText,
              opts.prefixWidthMm,
              opts.fontSizePt,
              lineHeightMm,
              {color: colorHex}
            );
            pdf.addImage(pStrip.dataUrl, 'PNG', opts.xMm - opts.prefixWidthMm, lineY, pStrip.widthMm, pStrip.heightMm);
          }
        }

        const strip = renderUnicodeLineToDataUrl(
          wrapped[i],
          opts.widthMm,
          opts.fontSizePt,
          lineHeightMm,
          {
            bold: Boolean(opts.defaultBold || normalized.every((r) => r.bold)),
            italic: Boolean(opts.defaultItalic || normalized.every((r) => r.italic)),
            color: colorHex,
          }
        );
        pdf.addImage(strip.dataUrl, 'PNG', opts.xMm, lineY, strip.widthMm, strip.heightMm);
        cursorY += lineHeightMm;
      }

      if (opts.spaceAfterMm) cursorY += opts.spaceAfterMm;
      return;
    }

    // Native selectable vector PDF text path
    const wrappedLines = wrapRunsToLines(
      pdf,
      normalized,
      opts.widthMm,
      opts.fontSizePt,
      Boolean(opts.defaultBold),
      Boolean(opts.defaultItalic)
    );

    for (let i = 0; i < wrappedLines.length; i++) {
      ensureSpace(lineHeightMm);
      const baselineY = cursorY + opts.fontSizePt * 0.352778 * 0.92;

      if (opts.leftBarColor) {
        pdf.setDrawColor(...opts.leftBarColor);
        pdf.setLineWidth(0.9);
        pdf.line(opts.xMm - 4, cursorY, opts.xMm - 4, cursorY + lineHeightMm);
      }

      if (i === 0 && opts.prefixText && opts.prefixWidthMm) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(opts.fontSizePt);
        pdf.setTextColor(...colorRgb);
        pdf.text(opts.prefixText, opts.xMm - opts.prefixWidthMm, baselineY);
      }

      let xCursor = opts.xMm;
      pdf.setFontSize(opts.fontSizePt);
      for (const seg of wrappedLines[i]) {
        const family = seg.code ? 'courier' : 'helvetica';
        const style =
          seg.bold && seg.italic
            ? 'bolditalic'
            : seg.bold
              ? 'bold'
              : seg.italic
                ? 'italic'
                : 'normal';
        pdf.setFont(family, style);
        if (seg.href) {
          pdf.setTextColor(29, 78, 216);
          pdf.textWithLink(seg.text, xCursor, baselineY, {url: seg.href});
        } else {
          pdf.setTextColor(...colorRgb);
          pdf.text(seg.text, xCursor, baselineY);
        }
        xCursor += seg.widthMm;
      }

      cursorY += lineHeightMm;
    }

    if (opts.spaceAfterMm) {
      cursorY += opts.spaceAfterMm;
    }
  };

  const renderTable = async (tableEl: Element) => {
    const trs = Array.from(tableEl.querySelectorAll('tr'));
    if (trs.length === 0) return;

    interface CellSpec {
      text: string;
      isHeader: boolean;
      runs: InlineRun[];
    }
    interface RowSpec {
      isHeaderRow: boolean;
      cells: CellSpec[];
    }

    const rows: RowSpec[] = trs.map((tr) => {
      const cells = Array.from(tr.children).filter((c) => {
        const t = c.tagName.toLowerCase();
        return t === 'th' || t === 'td';
      });
      const isHeaderRow =
        tr.parentElement?.tagName.toLowerCase() === 'thead' ||
        (cells.length > 0 && cells.every((c) => c.tagName.toLowerCase() === 'th'));
      return {
        isHeaderRow,
        cells: cells.map((cell) => {
          const runs: InlineRun[] = [];
          collectInlineRuns(
            cell,
            {bold: isHeaderRow || cell.tagName.toLowerCase() === 'th', italic: false, code: false},
            runs
          );
          const normalized = normalizeInlineRuns(runs);
          return {
            text: normalized.map((r) => r.text).join(''),
            isHeader: isHeaderRow || cell.tagName.toLowerCase() === 'th',
            runs: normalized,
          };
        }),
      };
    });

    const maxCols = Math.max(...rows.map((r) => r.cells.length), 1);
    const colW = CONTENT_W / maxCols;
    const cellPadX = 2.4;
    const cellPadY = 2.0;
    const fontSizePt = 9.5;
    const lineHeightMm = fontSizePt * 0.352778 * 1.38;
    const textColW = Math.max(8, colW - cellPadX * 2);

    const drawTableRow = (row: RowSpec): boolean => {
      // Pre-wrap every cell in the row to find exact height
      const cellLayouts = row.cells.map((cell) => {
        const useUnicode = !isWinAnsiString(cell.text);
        if (useUnicode) {
          const lines = measureUnicodeLines(cell.text, textColW, fontSizePt, cell.isHeader, false);
          return {useUnicode: true, unicodeLines: lines, vectorLines: [] as PositionedSegment[][]};
        }
        const vectorLines = wrapRunsToLines(
          pdf,
          cell.runs,
          textColW,
          fontSizePt,
          cell.isHeader,
          false
        );
        return {useUnicode: false, unicodeLines: [] as string[], vectorLines};
      });

      const maxLines = Math.max(
        1,
        ...cellLayouts.map((l) => (l.useUnicode ? l.unicodeLines.length : l.vectorLines.length))
      );
      const rowH = Math.min(BOTTOM_Y - TOP_Y, maxLines * lineHeightMm + cellPadY * 2);

      let pageAdded = false;
      if (cursorY > TOP_Y && cursorY + rowH > BOTTOM_Y) {
        pdf.addPage();
        cursorY = TOP_Y;
        pageAdded = true;
      }

      for (let cIdx = 0; cIdx < maxCols; cIdx++) {
        const cellX = MARGIN + cIdx * colW;
        const cell = row.cells[cIdx];
        const layout = cellLayouts[cIdx];

        if (row.isHeaderRow || cell?.isHeader) {
          pdf.setFillColor(241, 245, 249);
          pdf.rect(cellX, cursorY, colW, rowH, 'FD');
        } else {
          pdf.setDrawColor(203, 213, 225);
          pdf.setLineWidth(0.25);
          pdf.rect(cellX, cursorY, colW, rowH, 'S');
        }

        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.25);
        pdf.rect(cellX, cursorY, colW, rowH, 'S');

        if (!cell || !layout) continue;

        if (layout.useUnicode) {
          const bgHex = cell.isHeader ? '#f1f5f9' : '#ffffff';
          layout.unicodeLines.forEach((line, lIdx) => {
            const y = cursorY + cellPadY + lIdx * lineHeightMm;
            if (y + lineHeightMm <= cursorY + rowH + 0.2) {
              const strip = renderUnicodeLineToDataUrl(line, textColW, fontSizePt, lineHeightMm, {
                bold: cell.isHeader,
                bgColor: bgHex,
                color: '#0f172a',
              });
              pdf.addImage(strip.dataUrl, 'PNG', cellX + cellPadX, y, strip.widthMm, strip.heightMm);
            }
          });
        } else {
          pdf.setFontSize(fontSizePt);
          layout.vectorLines.forEach((lineSegs, lIdx) => {
            const baselineY =
              cursorY + cellPadY + lIdx * lineHeightMm + fontSizePt * 0.352778 * 0.9;
            let xCursor = cellX + cellPadX;
            for (const seg of lineSegs) {
              const family = seg.code ? 'courier' : 'helvetica';
              const style =
                seg.bold && seg.italic
                  ? 'bolditalic'
                  : seg.bold
                    ? 'bold'
                    : seg.italic
                      ? 'italic'
                      : 'normal';
              pdf.setFont(family, style);
              pdf.setTextColor(15, 23, 42);
              pdf.text(seg.text, xCursor, baselineY);
              xCursor += seg.widthMm;
            }
          });
        }
      }

      cursorY += rowH;
      return pageAdded;
    };

    const measureRowH = (row: RowSpec): number => {
      let maxLines = 1;
      for (const cell of row.cells) {
        const linesCount = !isWinAnsiString(cell.text)
          ? measureUnicodeLines(cell.text, textColW, fontSizePt, cell.isHeader, false).length
          : wrapRunsToLines(pdf, cell.runs, textColW, fontSizePt, cell.isHeader, false).length;
        maxLines = Math.max(maxLines, linesCount);
      }
      return Math.min(BOTTOM_Y - TOP_Y, maxLines * lineHeightMm + cellPadY * 2);
    };

    const headerRow = rows[0]?.isHeaderRow ? rows[0] : null;
    if (cursorY > TOP_Y) cursorY += 2;

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      checkAbort();
      const row = rows[rIdx];
      const estimatedH = measureRowH(row);
      if (cursorY > TOP_Y && cursorY + estimatedH > BOTTOM_Y) {
        pdf.addPage();
        cursorY = TOP_Y;
        if (headerRow && rIdx > 0 && !row.isHeaderRow) {
          drawTableRow(headerRow);
        }
      }
      drawTableRow(row);
      if (rIdx % 5 === 0) await yieldToMainThread();
    }

    // Add spacing after table
    cursorY += 3.5;
  };

  const renderElement = async (el: Element, listDepth = 0): Promise<void> => {
    checkAbort();
    const tag = el.tagName.toLowerCase();

    if (tag === 'img') {
      const src = el.getAttribute('src') ?? '';
      const decoded = await decodeImageForPdf(src);
      if (!decoded) return;
      const maxImgW = CONTENT_W;
      const maxImgH = BOTTOM_Y - TOP_Y - 4;
      // Convert px to mm assuming 96dpi (~0.26458mm/px), capped cleanly
      let wMm = decoded.widthPx * 0.264583;
      let hMm = decoded.heightPx * 0.264583;
      if (wMm > maxImgW) {
        const s = maxImgW / wMm;
        wMm *= s;
        hMm *= s;
      }
      if (hMm > maxImgH) {
        const s = maxImgH / hMm;
        wMm *= s;
        hMm *= s;
      }
      ensureSpace(hMm + 2);
      pdf.addImage(decoded.dataUrl, decoded.format, MARGIN, cursorY, wMm, hMm);
      cursorY += hMm + 3.5;
      return;
    }

    if (tag === 'hr') {
      ensureSpace(6);
      cursorY += 2.5;
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.3);
      pdf.line(MARGIN, cursorY, PAGE_W - MARGIN, cursorY);
      cursorY += 3.5;
      return;
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      // Render any standalone images inside headings as well
      const imgs = Array.from(el.querySelectorAll('img'));
      for (const img of imgs) {
        await renderElement(img, listDepth);
      }
      const runs: InlineRun[] = [];
      collectInlineRuns(el, {bold: true, italic: false, code: false}, runs);
      const sizeMap: Record<string, number> = {h1: 18, h2: 14.5, h3: 12, h4: 11};
      const beforeMap: Record<string, number> = {h1: 3, h2: 4, h3: 3, h4: 2.5};
      drawTextParagraph(runs, {
        xMm: MARGIN,
        widthMm: CONTENT_W,
        fontSizePt: sizeMap[tag],
        lineHeightFactor: 1.32,
        spaceBeforeMm: beforeMap[tag],
        spaceAfterMm: 2.8,
        defaultBold: true,
        colorRgb: [15, 23, 42],
        keepWithNextMm: 8,
      });
      return;
    }

    if (tag === 'p') {
      const imgs = Array.from(el.querySelectorAll('img'));
      const runs: InlineRun[] = [];
      collectInlineRuns(el, {bold: false, italic: false, code: false}, runs);
      if (runs.length > 0) {
        drawTextParagraph(runs, {
          xMm: MARGIN,
          widthMm: CONTENT_W,
          fontSizePt: 10.5,
          lineHeightFactor: 1.48,
          spaceAfterMm: 2.8,
        });
      }
      for (const img of imgs) {
        await renderElement(img, listDepth);
      }
      return;
    }

    if (tag === 'blockquote') {
      const runs: InlineRun[] = [];
      collectInlineRuns(el, {bold: false, italic: true, code: false}, runs);
      drawTextParagraph(runs, {
        xMm: MARGIN + 6,
        widthMm: CONTENT_W - 6,
        fontSizePt: 10.5,
        lineHeightFactor: 1.48,
        spaceBeforeMm: 1.5,
        spaceAfterMm: 3.2,
        defaultItalic: true,
        colorRgb: [51, 65, 85],
        leftBarColor: [148, 163, 184],
      });
      return;
    }

    if (tag === 'pre') {
      const text = el.textContent ?? '';
      if (!text.trim()) return;
      drawTextParagraph(
        [{text, bold: false, italic: false, code: true}],
        {
          xMm: MARGIN + 3,
          widthMm: CONTENT_W - 6,
          fontSizePt: 9.5,
          lineHeightFactor: 1.4,
          spaceBeforeMm: 1.5,
          spaceAfterMm: 3.5,
          colorRgb: [30, 41, 59],
        }
      );
      return;
    }

    if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === 'li');
      for (let idx = 0; idx < items.length; idx++) {
        const li = items[idx];
        const indentMm = (listDepth + 1) * 7;
        const prefix = tag === 'ol' ? `${idx + 1}.` : '•';

        // Separate nested lists/sub-blocks from inline text of this li
        const inlineRuns: InlineRun[] = [];
        const nestedBlocks: Element[] = [];
        for (const child of Array.from(li.childNodes)) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const cTag = (child as Element).tagName.toLowerCase();
            if (cTag === 'ul' || cTag === 'ol' || cTag === 'table' || cTag === 'img') {
              nestedBlocks.push(child as Element);
              continue;
            }
          }
          collectInlineRuns(child, {bold: false, italic: false, code: false}, inlineRuns);
        }

        drawTextParagraph(inlineRuns, {
          xMm: MARGIN + indentMm,
          widthMm: CONTENT_W - indentMm,
          fontSizePt: 10.5,
          lineHeightFactor: 1.45,
          spaceAfterMm: 1.6,
          prefixText: prefix,
          prefixWidthMm: 5.5,
        });

        for (const nb of nestedBlocks) {
          await renderElement(nb, listDepth + 1);
        }
      }
      if (listDepth === 0) cursorY += 1.8;
      return;
    }

    if (tag === 'table') {
      await renderTable(el);
      return;
    }

    // Generic container (div, section, article, etc.)
    const children = Array.from(el.children);
    if (children.length > 0) {
      for (const child of children) {
        await renderElement(child, listDepth);
      }
    } else {
      const runs: InlineRun[] = [];
      collectInlineRuns(el, {bold: false, italic: false, code: false}, runs);
      drawTextParagraph(runs, {
        xMm: MARGIN,
        widthMm: CONTENT_W,
        fontSizePt: 10.5,
        lineHeightFactor: 1.48,
        spaceAfterMm: 2.5,
      });
    }
  };

  const bodyNodes = Array.from(parsedDoc.body.childNodes);
  const totalTopNodes = Math.max(1, bodyNodes.length);

  for (let i = 0; i < bodyNodes.length; i++) {
    checkAbort();
    const node = bodyNodes[i];
    if (node.nodeType === Node.ELEMENT_NODE) {
      await renderElement(node as Element, 0);
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) {
      drawTextParagraph(
        [{text: node.textContent, bold: false, italic: false, code: false}],
        {
          xMm: MARGIN,
          widthMm: CONTENT_W,
          fontSizePt: 10.5,
          lineHeightFactor: 1.48,
          spaceAfterMm: 2.5,
        }
      );
    }

    onProgress?.(Math.min(95, 10 + Math.round(((i + 1) / totalTopNodes) * 85)));
    if (i % 6 === 0) {
      await yieldToMainThread();
    }
  }

  onProgress?.(100);
  return pdf.output('blob');
}
