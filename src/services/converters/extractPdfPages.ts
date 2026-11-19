import {PDFDocument} from 'pdf-lib';

export async function extractPdfPages(file: File, pagesToExtract: number[]): Promise<Blob> {
  if (pagesToExtract.length === 0) {
    throw new Error('Select at least one page to extract.');
  }
  const bytes = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(bytes, {ignoreEncryption: false});
  const totalPages = srcPdf.getPageCount();

  const validIndices = pagesToExtract
    .filter((p) => p >= 1 && p <= totalPages)
    .map((p) => p - 1);

  if (validIndices.length === 0) {
    throw new Error('Selected pages are out of range.');
  }

  const outPdf = await PDFDocument.create();
  const copied = await outPdf.copyPages(srcPdf, validIndices);
  for (const page of copied) {
    outPdf.addPage(page);
  }

  const outBytes = await outPdf.save();
  return new Blob([outBytes as unknown as BlobPart], {type: 'application/pdf'});
}
