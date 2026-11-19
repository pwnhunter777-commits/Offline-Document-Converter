import {PDFDocument} from 'pdf-lib';

export async function mergePdfFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<{blob: Blob; totalPages: number}> {
  if (files.length < 2) {
    throw new Error('At least 2 PDF files are required to merge.');
  }

  const mergedPdf = await PDFDocument.create();
  let totalPages = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const bytes = await file.arrayBuffer();
    const srcPdf = await PDFDocument.load(bytes, {ignoreEncryption: false});
    const pageIndices = srcPdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndices);
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
      totalPages++;
    }
    onProgress?.(i + 1, files.length);
  }

  const mergedBytes = await mergedPdf.save();
  return {
    blob: new Blob([mergedBytes as unknown as BlobPart], {type: 'application/pdf'}),
    totalPages,
  };
}
