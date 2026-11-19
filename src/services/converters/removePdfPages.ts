import {PDFDocument} from 'pdf-lib';

export async function removePdfPages(file: File, pagesToRemove: number[]): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(bytes, {ignoreEncryption: false});
  const totalPages = srcPdf.getPageCount();
  const removeSet = new Set(pagesToRemove);

  const keepIndices: number[] = [];
  for (let i = 0; i < totalPages; i++) {
    if (!removeSet.has(i + 1)) {
      keepIndices.push(i);
    }
  }

  if (keepIndices.length === 0) {
    throw new Error('Cannot remove all pages from the PDF.');
  }

  const outPdf = await PDFDocument.create();
  const copied = await outPdf.copyPages(srcPdf, keepIndices);
  for (const page of copied) {
    outPdf.addPage(page);
  }

  const outBytes = await outPdf.save();
  return new Blob([outBytes as unknown as BlobPart], {type: 'application/pdf'});
}
