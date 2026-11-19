import {degrees, PDFDocument} from 'pdf-lib';

export type RotationAngle = 90 | 180 | 270;

export async function rotatePdfPages(
  file: File,
  angle: RotationAngle,
  targetPageNumbers: number[] | 'all'
): Promise<Blob> {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, {ignoreEncryption: false});
  const pages = pdfDoc.getPages();

  const targetSet = targetPageNumbers === 'all' ? null : new Set(targetPageNumbers);

  pages.forEach((page, idx) => {
    const pageNum = idx + 1;
    if (targetSet === null || targetSet.has(pageNum)) {
      const currentAngle = page.getRotation().angle;
      page.setRotation(degrees((currentAngle + angle) % 360));
    }
  });

  const outBytes = await pdfDoc.save();
  return new Blob([outBytes as unknown as BlobPart], {type: 'application/pdf'});
}
