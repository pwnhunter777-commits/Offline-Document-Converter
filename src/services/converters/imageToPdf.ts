import {PDFDocument} from 'pdf-lib';
import {yieldToMainThread} from '../pdfEngine';

export type PageSizeOption = 'a4' | 'letter' | 'legal' | 'fit';
export type OrientationOption = 'portrait' | 'landscape' | 'auto';
export type MarginOption = 'none' | 'small' | 'normal' | 'large';
export type ImageFitOption = 'contain' | 'cover' | 'original';

export interface ImageToPdfOptions {
  pageSize: PageSizeOption;
  orientation: OrientationOption;
  margin: MarginOption;
  imageFit: ImageFitOption;
}

const PAGE_DIMENSIONS_PT: Record<Exclude<PageSizeOption, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
};

const MARGIN_PT: Record<MarginOption, number> = {
  none: 0,
  small: 28.35, // 10mm
  normal: 56.69, // 20mm
  large: 85.04, // 30mm
};

interface DecodedImageSource {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  cleanup: () => void;
}

async function decodeImageWithExifOrientation(file: File): Promise<DecodedImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {imageOrientation: 'from-image'});
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Unable to decode image: ${file.name}`));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      cleanup: () => {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageFileToEmbeddedBytes(
  file: File,
  cropAspect?: number,
  forceCanvas = false
): Promise<{bytes: Uint8Array; isPng: boolean; width: number; height: number}> {
  const decoded = await decodeImageWithExifOrientation(file);
  try {
    const srcW = decoded.width;
    const srcH = decoded.height;

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const isPng = ext === 'png' || file.type === 'image/png';
    const isJpeg = ext === 'jpg' || ext === 'jpeg' || file.type === 'image/jpeg';

    // Always draw JPEGs and WebP through canvas so EXIF orientation is baked into upright pixels
    const needsCanvasConversion =
      forceCanvas ||
      isJpeg ||
      ext === 'webp' ||
      file.type === 'image/webp' ||
      cropAspect !== undefined;

    if (!needsCanvasConversion) {
      const buffer = await file.arrayBuffer();
      return {
        bytes: new Uint8Array(buffer),
        isPng,
        width: srcW,
        height: srcH,
      };
    }

    let sx = 0;
    let sy = 0;
    let sw = srcW;
    let sh = srcH;

    if (cropAspect !== undefined && srcW > 0 && srcH > 0) {
      const currentAspect = srcW / srcH;
      if (currentAspect > cropAspect) {
        sw = Math.round(srcH * cropAspect);
        sx = Math.round((srcW - sw) / 2);
      } else if (currentAspect < cropAspect) {
        sh = Math.round(srcW / cropAspect);
        sy = Math.round((srcH - sh) / 2);
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable.');
    }

    if (!isPng) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(decoded.source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const mime = isPng ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to encode image for PDF.'))),
        mime,
        0.92
      );
    });

    const width = canvas.width;
    const height = canvas.height;
    canvas.width = 0;
    canvas.height = 0;

    const bytes = new Uint8Array(await blob.arrayBuffer());
    return {bytes, isPng, width, height};
  } finally {
    decoded.cleanup();
  }
}

export async function convertImagesToPdf(
  files: File[],
  options: ImageToPdfOptions,
  onProgress?: (current: number, total: number) => void,
  signal?: AbortSignal
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('No images selected.');
  }

  const pdfDoc = await PDFDocument.create();
  const margin = options.pageSize === 'fit' ? 0 : MARGIN_PT[options.margin];

  for (let i = 0; i < files.length; i++) {
    if (signal?.aborted) {
      throw new DOMException('Operation cancelled', 'AbortError');
    }

    const file = files[i];
    const decoded = await decodeImageWithExifOrientation(file);
    const natW = decoded.width;
    const natH = decoded.height;
    decoded.cleanup();

    let pageWidth: number;
    let pageHeight: number;

    if (options.pageSize === 'fit') {
      // Convert pixels to points (assuming 96 DPI -> 72pt/in)
      const ptScale = 72 / 96;
      pageWidth = Math.max(72, natW * ptScale);
      pageHeight = Math.max(72, natH * ptScale);
    } else {
      const [baseW, baseH] = PAGE_DIMENSIONS_PT[options.pageSize];
      const useLandscape =
        options.orientation === 'landscape' ||
        (options.orientation === 'auto' && natW > natH);
      pageWidth = useLandscape ? baseH : baseW;
      pageHeight = useLandscape ? baseW : baseH;
    }

    const availW = Math.max(20, pageWidth - margin * 2);
    const availH = Math.max(20, pageHeight - margin * 2);

    const cropAspect =
      options.imageFit === 'cover' && options.pageSize !== 'fit' ? availW / availH : undefined;

    let prepared = await imageFileToEmbeddedBytes(file, cropAspect, false);
    let embeddedImage;
    try {
      embeddedImage = prepared.isPng
        ? await pdfDoc.embedPng(prepared.bytes)
        : await pdfDoc.embedJpg(prepared.bytes);
    } catch {
      prepared = await imageFileToEmbeddedBytes(file, cropAspect, true);
      embeddedImage = prepared.isPng
        ? await pdfDoc.embedPng(prepared.bytes)
        : await pdfDoc.embedJpg(prepared.bytes);
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    let drawW: number;
    let drawH: number;

    if (options.pageSize === 'fit') {
      drawW = pageWidth;
      drawH = pageHeight;
    } else if (options.imageFit === 'cover') {
      drawW = availW;
      drawH = availH;
    } else if (options.imageFit === 'original') {
      const ptW = prepared.width * (72 / 96);
      const ptH = prepared.height * (72 / 96);
      const clampScale = Math.min(1, availW / ptW, availH / ptH);
      drawW = ptW * clampScale;
      drawH = ptH * clampScale;
    } else {
      const scale = Math.min(availW / prepared.width, availH / prepared.height);
      drawW = prepared.width * scale;
      drawH = prepared.height * scale;
    }

    const x = margin + (availW - drawW) / 2;
    const y = margin + (availH - drawH) / 2;

    page.drawImage(embeddedImage, {
      x,
      y,
      width: drawW,
      height: drawH,
    });

    onProgress?.(i + 1, files.length);
    await yieldToMainThread();
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], {type: 'application/pdf'});
}
