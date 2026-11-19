import {PDFDocument} from 'pdf-lib';
import {destroyPdfDocument, loadPdfDocument} from '../pdfEngine';

export type CompressionLevel = 'lossless' | 'low' | 'medium' | 'high';

export interface CompressPdfResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  savedBytes: number;
  savedPercent: number;
  reduced: boolean;
}

const RASTER_PRESETS: Record<Exclude<CompressionLevel, 'lossless'>, {scale: number; quality: number}> = {
  low: {scale: 1.5, quality: 0.82},
  medium: {scale: 1.25, quality: 0.62},
  high: {scale: 1.0, quality: 0.42},
};

export async function compressPdfFile(
  file: File,
  level: CompressionLevel,
  onProgress?: (current: number, total: number) => void
): Promise<CompressPdfResult> {
  const originalBuffer = await file.arrayBuffer();
  const originalSize = file.size;

  if (level === 'lossless') {
    onProgress?.(1, 2);
    const srcPdf = await PDFDocument.load(originalBuffer, {ignoreEncryption: false});
    // Strip bloated metadata & rewrite with object streams enabled
    srcPdf.setTitle('');
    srcPdf.setAuthor('');
    srcPdf.setSubject('');
    srcPdf.setKeywords([]);
    srcPdf.setProducer('');
    srcPdf.setCreator('');

    const cleanPdf = await PDFDocument.create();
    const copied = await cleanPdf.copyPages(srcPdf, srcPdf.getPageIndices());
    for (const page of copied) {
      cleanPdf.addPage(page);
    }
    const bytes = await cleanPdf.save({useObjectStreams: true, addDefaultPage: false});
    onProgress?.(2, 2);

    const outBlob = new Blob([bytes as unknown as BlobPart], {type: 'application/pdf'});
    const compressedSize = outBlob.size;
    const savedBytes = originalSize - compressedSize;
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 1000) / 10 : 0;

    return {
      blob: outBlob,
      originalSize,
      compressedSize,
      savedBytes,
      savedPercent,
      reduced: compressedSize < originalSize,
    };
  }

  // Raster re-encoding compression via pdf.js + pdf-lib
  const preset = RASTER_PRESETS[level];
  const pdfDoc = await loadPdfDocument(originalBuffer);
  const totalPages = pdfDoc.numPages;

  try {
    const outPdf = await PDFDocument.create();

    for (let p = 1; p <= totalPages; p++) {
      const page = await pdfDoc.getPage(p);
      const baseViewport = page.getViewport({scale: 1});
      const renderViewport = page.getViewport({scale: preset.scale});

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context unavailable.');
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport: renderViewport,
        canvas,
      }).promise;

      const jpgBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode compressed page image.'))),
          'image/jpeg',
          preset.quality
        );
      });

      const jpgBytes = new Uint8Array(await jpgBlob.arrayBuffer());
      const embedded = await outPdf.embedJpg(jpgBytes);
      const newPage = outPdf.addPage([baseViewport.width, baseViewport.height]);
      newPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height,
      });

      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
      onProgress?.(p, totalPages);
    }

    const bytes = await outPdf.save({useObjectStreams: true});
    const outBlob = new Blob([bytes as unknown as BlobPart], {type: 'application/pdf'});
    const compressedSize = outBlob.size;
    const savedBytes = originalSize - compressedSize;
    const savedPercent = originalSize > 0 ? Math.round((savedBytes / originalSize) * 1000) / 10 : 0;

    return {
      blob: outBlob,
      originalSize,
      compressedSize,
      savedBytes,
      savedPercent,
      reduced: compressedSize < originalSize,
    };
  } finally {
    await destroyPdfDocument(pdfDoc);
  }
}
