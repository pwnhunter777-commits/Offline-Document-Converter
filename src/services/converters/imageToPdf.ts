import {PDFDocument} from 'pdf-lib';

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

async function loadImageElement(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Unable to decode image: ${file.name}`));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function imageFileToEmbeddedBytes(
  file: File,
  cropAspect?: number
): Promise<{bytes: Uint8Array; isPng: boolean; width: number; height: number}> {
  const img = await loadImageElement(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const needsCanvasConversion = ext === 'webp' || file.type === 'image/webp' || cropAspect !== undefined;

  if (!needsCanvasConversion) {
    const buffer = await file.arrayBuffer();
    const isPng = ext === 'png' || file.type === 'image/png';
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

  const isPng = ext === 'png' || file.type === 'image/png';
  if (!isPng) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const mime = isPng ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to encode image for PDF.'))),
      mime,
      0.92
    );
  });

  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {bytes, isPng, width: canvas.width, height: canvas.height};
}

export async function convertImagesToPdf(
  files: File[],
  options: ImageToPdfOptions,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error('No images selected.');
  }

  const pdfDoc = await PDFDocument.create();
  const margin = options.pageSize === 'fit' ? 0 : MARGIN_PT[options.margin];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const imgEl = await loadImageElement(file);
    const natW = imgEl.naturalWidth || imgEl.width;
    const natH = imgEl.naturalHeight || imgEl.height;

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

    const prepared = await imageFileToEmbeddedBytes(file, cropAspect);
    const embeddedImage = prepared.isPng
      ? await pdfDoc.embedPng(prepared.bytes)
      : await pdfDoc.embedJpg(prepared.bytes);

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
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes as unknown as BlobPart], {type: 'application/pdf'});
}
