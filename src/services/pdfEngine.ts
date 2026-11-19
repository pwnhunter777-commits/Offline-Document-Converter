import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdf.js worker locally from bundled asset — zero external CDN dependency!
if (typeof pdfWorkerUrl === 'string' && pdfWorkerUrl.length > 0) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ExtractedLine {
  text: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  y: number;
}

export interface ExtractedPageContent {
  pageNumber: number;
  lines: ExtractedLine[];
  rawText: string;
}

export async function loadPdfDocument(data: ArrayBuffer) {
  // Pass a copy so pdf.js worker transfer doesn't detach the caller's ArrayBuffer
  const copy = data.slice(0);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(copy),
    useWorkerFetch: false,
  });
  return await loadingTask.promise;
}

export async function destroyPdfDocument(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<void> {
  const maybeDestroy = (pdfDoc as unknown as {destroy?: () => Promise<void>}).destroy;
  if (typeof maybeDestroy === 'function') {
    await maybeDestroy.call(pdfDoc);
  } else {
    await pdfDoc.cleanup();
  }
}

export async function getPdfPageCount(file: File): Promise<number> {
  const buffer = await file.arrayBuffer();
  const doc = await loadPdfDocument(buffer);
  const count = doc.numPages;
  await destroyPdfDocument(doc);
  return count;
}

export async function renderPdfPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 0.45
): Promise<HTMLCanvasElement> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({scale});
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  page.cleanup();
  return canvas;
}

export async function renderPdfPageToDataUrl(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 0.45,
  format: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.78
): Promise<{dataUrl: string; width: number; height: number}> {
  const canvas = await renderPdfPageToCanvas(pdfDoc, pageNumber, scale);
  const width = canvas.width;
  const height = canvas.height;
  const dataUrl = canvas.toDataURL(format, quality);
  canvas.width = 0;
  canvas.height = 0;
  return {dataUrl, width, height};
}

export async function renderPdfPageToBlob(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number,
  mimeType: 'image/png' | 'image/jpeg',
  quality: number
): Promise<{blob: Blob; width: number; height: number}> {
  const page = await pdfDoc.getPage(pageNumber);
  const viewport = page.getViewport({scale});
  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.floor(viewport.width));
  const height = Math.max(1, Math.floor(viewport.height));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  await page.render({
    canvasContext: ctx,
    viewport,
    canvas,
  }).promise;

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image from canvas.'))),
      mimeType,
      quality
    );
  });
  page.cleanup();
  canvas.width = 0;
  canvas.height = 0;
  return {blob, width, height};
}

export async function extractPdfPagesStructuredText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedPageContent[]> {
  const pages: ExtractedPageContent[] = [];
  const total = pdfDoc.numPages;

  for (let p = 1; p <= total; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const styles = textContent.styles ?? {};

    interface RawToken {
      str: string;
      x: number;
      y: number;
      fontSize: number;
      isBold: boolean;
      isItalic: boolean;
    }

    const tokens: RawToken[] = [];
    for (const item of textContent.items) {
      if (!('str' in item)) continue;
      const text = item.str;
      if (!text || text.trim() === '') {
        if (text === ' ' && tokens.length > 0) {
          tokens[tokens.length - 1].str += ' ';
        }
        continue;
      }
      const transform = item.transform;
      const fontSize = Math.max(6, Math.hypot(transform[0], transform[1]) || Math.abs(transform[3]) || 11);
      const x = transform[4];
      const y = transform[5];
      const styleMeta = styles[item.fontName];
      const fontFamily = (styleMeta?.fontFamily ?? item.fontName ?? '').toLowerCase();
      const isBold = fontFamily.includes('bold') || fontFamily.includes('black') || fontFamily.includes('heavy');
      const isItalic = fontFamily.includes('italic') || fontFamily.includes('oblique');

      tokens.push({str: text, x, y, fontSize, isBold, isItalic});
    }

    // Group tokens into lines by Y proximity (within ~0.45 * fontSize)
    tokens.sort((a, b) => {
      if (Math.abs(b.y - a.y) > Math.max(a.fontSize, b.fontSize) * 0.45) {
        return b.y - a.y;
      }
      return a.x - b.x;
    });

    const lines: ExtractedLine[] = [];
    for (const tok of tokens) {
      const lastLine = lines[lines.length - 1];
      if (lastLine && Math.abs(lastLine.y - tok.y) <= Math.max(lastLine.fontSize, tok.fontSize) * 0.45) {
        const needsSpace =
          !lastLine.text.endsWith(' ') && !tok.str.startsWith(' ') && tok.str.length > 0;
        lastLine.text += (needsSpace ? ' ' : '') + tok.str;
        lastLine.fontSize = Math.max(lastLine.fontSize, tok.fontSize);
        lastLine.isBold = lastLine.isBold && tok.isBold;
      } else {
        lines.push({
          text: tok.str.trimStart(),
          fontSize: tok.fontSize,
          isBold: tok.isBold,
          isItalic: tok.isItalic,
          y: tok.y,
        });
      }
    }

    const cleanedLines = lines
      .map((l) => ({...l, text: l.text.replace(/\s+/g, ' ').trim()}))
      .filter((l) => l.text.length > 0);

    pages.push({
      pageNumber: p,
      lines: cleanedLines,
      rawText: cleanedLines.map((l) => l.text).join('\n'),
    });

    page.cleanup();
    onProgress?.(p, total);
  }

  return pages;
}
