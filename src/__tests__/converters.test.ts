import {describe, expect, it} from 'vitest';
import {PDFDocument} from 'pdf-lib';
import {compressPdfFile} from '../services/converters/compressPdf';
import {extractPdfPages} from '../services/converters/extractPdfPages';
import {mergePdfFiles} from '../services/converters/mergePdf';
import {removePdfPages} from '../services/converters/removePdfPages';
import {rotatePdfPages} from '../services/converters/rotatePdf';
import {splitPdfByGroups} from '../services/converters/splitPdf';
import {
  detectValidFileKind,
  parseFlatPages,
  parsePageRangeGroups,
  verifyFileSignature,
} from '../utils/format';

async function createSamplePdfFile(
  name: string,
  pageCount: number,
  metadata?: {title?: string; author?: string; subject?: string}
): Promise<File> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`Sample page ${i + 1}`, {x: 40, y: 540, size: 16});
  }
  if (metadata?.title) doc.setTitle(metadata.title);
  if (metadata?.author) doc.setAuthor(metadata.author);
  if (metadata?.subject) doc.setSubject(metadata.subject);

  const bytes = await doc.save();
  return new File([bytes as unknown as BlobPart], name, {type: 'application/pdf'});
}

describe('page range parsers', () => {
  it('parses comma-separated groups and single pages', () => {
    expect(parsePageRangeGroups('1-3, 5, 6-7', 10)).toEqual([[1, 2, 3], [5], [6, 7]]);
  });

  it('rejects empty, reversed, out-of-range, and malformed expressions', () => {
    expect(parsePageRangeGroups('', 10)).toBeNull();
    expect(parsePageRangeGroups('5-2', 10)).toBeNull();
    expect(parsePageRangeGroups('0, 2', 10)).toBeNull();
    expect(parsePageRangeGroups('1-11', 10)).toBeNull();
    expect(parsePageRangeGroups('abc', 10)).toBeNull();
  });

  it('flattens, deduplicates, and sorts pages in parseFlatPages', () => {
    expect(parseFlatPages('5, 2-4, 3, 1', 8)).toEqual([1, 2, 3, 4, 5]);
    expect(parseFlatPages('1-9', 8)).toBeNull();
  });
});

describe('file signature verification', () => {
  it('accepts %PDF- at offset 0 and within the first 1024 bytes', async () => {
    const standard = new File(['%PDF-1.7\n...'], 'doc.pdf', {type: 'application/pdf'});
    expect(await verifyFileSignature(standard, 'pdf')).toBe(true);

    const prefix = new Uint8Array(128).fill(0x20);
    const header = new TextEncoder().encode('%PDF-1.4\n');
    const combined = new Uint8Array(prefix.length + header.length);
    combined.set(prefix, 0);
    combined.set(header, prefix.length);
    const offsetPdf = new File([combined], 'offset.pdf', {type: 'application/pdf'});
    expect(await verifyFileSignature(offsetPdf, 'pdf')).toBe(true);
  });

  it('rejects PDF headers beyond 1024 bytes or non-PDF files', async () => {
    const prefix = new Uint8Array(1100).fill(0x20);
    const header = new TextEncoder().encode('%PDF-1.7');
    const tooFar = new Uint8Array(prefix.length + header.length);
    tooFar.set(prefix, 0);
    tooFar.set(header, prefix.length);
    expect(
      await verifyFileSignature(new File([tooFar], 'late.pdf', {type: 'application/pdf'}), 'pdf')
    ).toBe(false);

    const fakePdf = new File(['not a pdf'], 'fake.pdf', {type: 'application/pdf'});
    expect(await verifyFileSignature(fakePdf, 'pdf')).toBe(false);
  });

  it('detects PNG, JPEG, WEBP, and DOCX signatures accurately', async () => {
    const png = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
      'photo.png',
      {type: 'image/png'}
    );
    const jpg = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], 'photo.jpg', {
      type: 'image/jpeg',
    });
    const webp = new File(
      [new TextEncoder().encode('RIFF\x00\x00\x00\x00WEBP')],
      'photo.webp',
      {type: 'image/webp'}
    );
    const docx = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14])], 'doc.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const empty = new File([], 'empty.pdf', {type: 'application/pdf'});

    expect(await detectValidFileKind(png)).toBe('image');
    expect(await detectValidFileKind(jpg)).toBe('image');
    expect(await detectValidFileKind(webp)).toBe('image');
    expect(await detectValidFileKind(docx)).toBe('docx');
    expect(await detectValidFileKind(empty)).toBeNull();
  });
});

describe('PDF converter services', () => {
  it('merges multiple PDFs and preserves total page count', async () => {
    const a = await createSamplePdfFile('a.pdf', 2);
    const b = await createSamplePdfFile('b.pdf', 3);

    const merged = await mergePdfFiles([a, b]);
    expect(merged.totalPages).toBe(5);

    const loaded = await PDFDocument.load(await merged.blob.arrayBuffer());
    expect(loaded.getPageCount()).toBe(5);
  });

  it('throws when merging fewer than two PDFs', async () => {
    const a = await createSamplePdfFile('only.pdf', 2);
    await expect(mergePdfFiles([a])).rejects.toThrow();
  });

  it('splits a PDF into expected groups', async () => {
    const src = await createSamplePdfFile('book.pdf', 4);
    const outputs = await splitPdfByGroups(src, [[1, 2], [3, 4]]);
    expect(outputs).toHaveLength(2);
    expect(outputs[0].pageCount).toBe(2);
    expect(outputs[1].fileName).toBe('book_p3-4.pdf');

    const second = await PDFDocument.load(await outputs[1].blob.arrayBuffer());
    expect(second.getPageCount()).toBe(2);
  });

  it('removes specified pages and guards against removing all pages', async () => {
    const src = await createSamplePdfFile('notes.pdf', 3);
    const cleanedBlob = await removePdfPages(src, [2]);
    const cleaned = await PDFDocument.load(await cleanedBlob.arrayBuffer());
    expect(cleaned.getPageCount()).toBe(2);

    await expect(removePdfPages(src, [1, 2, 3])).rejects.toThrow();
  });

  it('extracts specified pages in order', async () => {
    const src = await createSamplePdfFile('slides.pdf', 4);
    const extractedBlob = await extractPdfPages(src, [3, 1]);
    const extracted = await PDFDocument.load(await extractedBlob.arrayBuffer());
    expect(extracted.getPageCount()).toBe(2);

    await expect(extractPdfPages(src, [])).rejects.toThrow();
  });

  it('rotates only targeted pages by the requested clockwise angle', async () => {
    const src = await createSamplePdfFile('scan.pdf', 3);
    const rotatedBlob = await rotatePdfPages(src, 90, [2]);
    const rotated = await PDFDocument.load(await rotatedBlob.arrayBuffer());
    const pages = rotated.getPages();

    expect(pages[0].getRotation().angle).toBe(0);
    expect(pages[1].getRotation().angle).toBe(90);
    expect(pages[2].getRotation().angle).toBe(0);
  });

  it('strips metadata on the output PDF during lossless compression', async () => {
    const src = await createSamplePdfFile('meta.pdf', 2, {
      title: 'Confidential Report',
      author: 'Jane Doe',
      subject: 'Finance',
    });

    const res = await compressPdfFile(src, 'lossless');
    const compressed = await PDFDocument.load(await res.blob.arrayBuffer());

    expect(compressed.getPageCount()).toBe(2);
    expect(compressed.getTitle() ?? '').toBe('');
    expect(compressed.getAuthor() ?? '').toBe('');
    expect(compressed.getSubject() ?? '').toBe('');
  });
});
