import JSZip from 'jszip';
import {stripExtension} from '../../utils/format';
import {destroyPdfDocument, loadPdfDocument, renderPdfPageToBlob} from '../pdfEngine';

export type ImageOutputFormat = 'png' | 'jpeg';

export interface RenderedPdfImage {
  pageNumber: number;
  fileName: string;
  width: number;
  height: number;
  blob: Blob;
}

export async function convertPdfPagesToImages(
  file: File,
  pageNumbers: number[],
  options: {
    format: ImageOutputFormat;
    quality: number;
    scale: number;
  },
  onProgress?: (current: number, total: number) => void
): Promise<RenderedPdfImage[]> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await loadPdfDocument(buffer);
  const baseName = stripExtension(file.name);
  const ext = options.format === 'png' ? 'png' : 'jpg';
  const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';

  try {
    const results: RenderedPdfImage[] = [];
    for (let i = 0; i < pageNumbers.length; i++) {
      const pageNum = pageNumbers[i];
      const rendered = await renderPdfPageToBlob(
        pdfDoc,
        pageNum,
        options.scale,
        mime,
        options.quality
      );
      results.push({
        pageNumber: pageNum,
        fileName: `${baseName}_page_${pageNum}.${ext}`,
        width: rendered.width,
        height: rendered.height,
        blob: rendered.blob,
      });
      onProgress?.(i + 1, pageNumbers.length);
    }
    return results;
  } finally {
    await destroyPdfDocument(pdfDoc);
  }
}

export async function bundleImagesAsZip(images: RenderedPdfImage[]): Promise<Blob> {
  const zip = new JSZip();
  for (const img of images) {
    zip.file(img.fileName, img.blob);
  }
  return await zip.generateAsync({type: 'blob'});
}
