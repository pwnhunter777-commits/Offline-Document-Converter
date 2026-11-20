import {EncryptedPDFError} from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Configure pdf.js worker locally from bundled asset — zero external CDN dependency!
if (typeof pdfWorkerUrl === 'string' && pdfWorkerUrl.length > 0) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export class PdfPasswordError extends Error {
  public readonly incorrect: boolean;

  constructor(incorrect = false) {
    super(
      incorrect
        ? 'Incorrect password for password-protected PDF.'
        : 'This PDF is password-protected.'
    );
    this.name = 'PdfPasswordError';
    this.incorrect = incorrect;
  }
}

export function isPdfEncryptedError(err: unknown): boolean {
  if (err instanceof EncryptedPDFError || err instanceof PdfPasswordError) return true;
  if (err instanceof Error) {
    return (
      err.name === 'EncryptedPDFError' ||
      err.name === 'PasswordException' ||
      /encrypted|password/i.test(err.message)
    );
  }
  return false;
}

export interface ExtractedLine {
  text: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  y: number;
}

export interface ExtractedPageImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface ExtractedPageContent {
  pageNumber: number;
  lines: ExtractedLine[];
  rawText: string;
  images: ExtractedPageImage[];
}

export async function yieldToMainThread(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

export async function loadPdfDocument(data: ArrayBuffer, password?: string) {
  // Pass a copy so pdf.js worker transfer doesn't detach the caller's ArrayBuffer
  const copy = data.slice(0);
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(copy),
    useWorkerFetch: false,
    ...(password !== undefined ? {password} : {}),
  });
  try {
    return await loadingTask.promise;
  } catch (err) {
    const e = err as {name?: string; code?: number};
    if (e?.name === 'PasswordException') {
      throw new PdfPasswordError(e.code === 2);
    }
    throw err;
  }
}

export async function destroyPdfDocument(pdfDoc: pdfjsLib.PDFDocumentProxy): Promise<void> {
  const maybeDestroy = (pdfDoc as unknown as {destroy?: () => Promise<void>}).destroy;
  if (typeof maybeDestroy === 'function') {
    await maybeDestroy.call(pdfDoc);
  } else {
    await pdfDoc.cleanup();
  }
}

export async function getPdfPageCount(file: File, password?: string): Promise<number> {
  const buffer = await file.arrayBuffer();
  const doc = await loadPdfDocument(buffer, password);
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

interface PdfRawImageObj {
  width?: number;
  height?: number;
  kind?: number;
  data?: Uint8ClampedArray | Uint8Array;
  bitmap?: ImageBitmap;
}

async function pdfImageObjToPng(obj: PdfRawImageObj): Promise<ExtractedPageImage | null> {
  if (!obj || typeof obj.width !== 'number' || typeof obj.height !== 'number') return null;
  const w = obj.width;
  const h = obj.height;
  if (w < 12 || h < 12) return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    if (obj.bitmap) {
      ctx.drawImage(obj.bitmap, 0, 0, w, h);
    } else if (obj.data) {
      const src = obj.data;
      const rgba = new Uint8ClampedArray(w * h * 4);
      if (src.length === w * h * 4) {
        rgba.set(src);
      } else if (src.length === w * h * 3) {
        for (let i = 0, j = 0; i < src.length; i += 3, j += 4) {
          rgba[j] = src[i];
          rgba[j + 1] = src[i + 1];
          rgba[j + 2] = src[i + 2];
          rgba[j + 3] = 255;
        }
      } else if (src.length === w * h) {
        for (let i = 0, j = 0; i < src.length; i++, j += 4) {
          const g = src[i];
          rgba[j] = g;
          rgba[j + 1] = g;
          rgba[j + 2] = g;
          rgba[j + 3] = 255;
        }
      } else if (obj.kind === 1) {
        // 1-bit grayscale mask
        const rowBytes = Math.ceil(w / 8);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const byte = src[y * rowBytes + (x >> 3)] ?? 0;
            const bit = (byte >> (7 - (x & 7))) & 1;
            const v = bit ? 255 : 0;
            const idx = (y * w + x) * 4;
            rgba[idx] = v;
            rgba[idx + 1] = v;
            rgba[idx + 2] = v;
            rgba[idx + 3] = 255;
          }
        }
      } else {
        return null;
      }
      ctx.putImageData(new ImageData(rgba, w, h), 0, 0);
    } else {
      return null;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) return null;
    return {
      data: new Uint8Array(await blob.arrayBuffer()),
      width: w,
      height: h,
    };
  } catch {
    return null;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function extractImagesFromPage(page: pdfjsLib.PDFPageProxy): Promise<ExtractedPageImage[]> {
  const images: ExtractedPageImage[] = [];
  const seenNames = new Set<string>();

  try {
    const opList = await page.getOperatorList();
    for (let i = 0; i < opList.fnArray.length; i++) {
      const fn = opList.fnArray[i];
      const args = opList.argsArray[i];

      if (fn === pdfjsLib.OPS.paintImageXObject && args && typeof args[0] === 'string') {
        const imgName = args[0];
        if (seenNames.has(imgName)) continue;
        seenNames.add(imgName);

        const rawObj = await new Promise<PdfRawImageObj | null>((resolve) => {
          try {
            if (page.objs.has(imgName)) {
              resolve(page.objs.get(imgName) as PdfRawImageObj);
              return;
            }
            const timer = setTimeout(() => resolve(null), 400);
            page.objs.get(imgName, (obj: unknown) => {
              clearTimeout(timer);
              resolve((obj as PdfRawImageObj) ?? null);
            });
          } catch {
            resolve(null);
          }
        });

        if (rawObj) {
          const converted = await pdfImageObjToPng(rawObj);
          if (converted) images.push(converted);
        }
      } else if (fn === pdfjsLib.OPS.paintInlineImageXObject && args && args[0]) {
        const converted = await pdfImageObjToPng(args[0] as PdfRawImageObj);
        if (converted) images.push(converted);
      }
    }
  } catch {
    // Non-fatal: continue with text extraction even if operator list fails
  }

  return images;
}

export async function extractPdfPagesStructuredText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<ExtractedPageContent[]> {
  const pages: ExtractedPageContent[] = [];
  const total = pdfDoc.numPages;

  for (let p = 1; p <= total; p++) {
    if (signal?.aborted) {
      throw new DOMException('Operation cancelled', 'AbortError');
    }

    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const styles = textContent.styles ?? {};
    const images = await extractImagesFromPage(page);

    interface RawToken {
      str: string;
      x: number;
      width: number;
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
      const fontSize = Math.max(
        6,
        Math.hypot(transform[0], transform[1]) || Math.abs(transform[3]) || 11
      );
      const x = transform[4];
      const y = transform[5];
      const width = typeof item.width === 'number' ? item.width : text.length * fontSize * 0.5;

      const styleMeta = styles[item.fontName];
      let realFontName = '';
      try {
        if (page.commonObjs.has(item.fontName)) {
          const fontObj = page.commonObjs.get(item.fontName) as {name?: string} | undefined;
          realFontName = fontObj?.name ?? '';
        }
      } catch {
        realFontName = '';
      }

      const combinedFontDesc = `${realFontName} ${styleMeta?.fontFamily ?? ''} ${item.fontName ?? ''}`.toLowerCase();
      const isBold =
        /\b(bold|semibold|demibold|extrabold|black|heavy)\b|[-_,](bd|bold|blk|heavy|semibold|demi)/i.test(
          combinedFontDesc
        ) ||
        combinedFontDesc.includes('bold') ||
        combinedFontDesc.includes('black') ||
        combinedFontDesc.includes('heavy');
      const isItalic =
        /\b(italic|oblique|slanted)\b|[-_,](it|ital|obl)/i.test(combinedFontDesc) ||
        combinedFontDesc.includes('italic') ||
        combinedFontDesc.includes('oblique');

      tokens.push({str: text, x, width, y, fontSize, isBold, isItalic});
    }

    // Group tokens into horizontal bands by Y first (transitive Y sort -> band clustering -> X sort within each band)
    tokens.sort((a, b) => b.y - a.y);

    interface RawBand {
      anchorY: number;
      maxFontSize: number;
      tokens: RawToken[];
    }

    const bands: RawBand[] = [];
    for (const tok of tokens) {
      const currentBand = bands[bands.length - 1];
      if (
        currentBand &&
        Math.abs(currentBand.anchorY - tok.y) <=
          Math.max(currentBand.maxFontSize, tok.fontSize) * 0.45
      ) {
        currentBand.tokens.push(tok);
        currentBand.maxFontSize = Math.max(currentBand.maxFontSize, tok.fontSize);
      } else {
        bands.push({
          anchorY: tok.y,
          maxFontSize: tok.fontSize,
          tokens: [tok],
        });
      }
    }

    // Ensure bands are ordered top-to-bottom and tokens within each band left-to-right
    bands.sort((a, b) => b.anchorY - a.anchorY);

    const lines: ExtractedLine[] = [];
    for (const band of bands) {
      band.tokens.sort((a, b) => a.x - b.x);
      let lineText = '';
      let prevEndX: number | null = null;
      let boldChars = 0;
      let italicChars = 0;
      let totalBandChars = 0;

      for (const tok of band.tokens) {
        const cleanLen = tok.str.trim().length;
        totalBandChars += cleanLen;
        if (tok.isBold) boldChars += cleanLen;
        if (tok.isItalic) italicChars += cleanLen;

        if (!lineText) {
          lineText = tok.str.trimStart();
        } else {
          const gap = prevEndX !== null ? tok.x - prevEndX : 0;
          const needsSpace =
            !lineText.endsWith(' ') &&
            !tok.str.startsWith(' ') &&
            gap > tok.fontSize * 0.14;
          lineText += (needsSpace ? ' ' : '') + tok.str;
        }
        prevEndX = tok.x + tok.width;
      }

      const cleanedText = lineText.replace(/\s+/g, ' ').trim();
      if (cleanedText.length > 0) {
        lines.push({
          text: cleanedText,
          fontSize: band.maxFontSize,
          isBold: totalBandChars > 0 && boldChars >= totalBandChars * 0.6,
          isItalic: totalBandChars > 0 && italicChars >= totalBandChars * 0.6,
          y: band.anchorY,
        });
      }
    }

    pages.push({
      pageNumber: p,
      lines,
      rawText: lines.map((l) => l.text).join('\n'),
      images,
    });

    page.cleanup();
    onProgress?.(p, total);
    await yieldToMainThread();
  }

  return pages;
}
