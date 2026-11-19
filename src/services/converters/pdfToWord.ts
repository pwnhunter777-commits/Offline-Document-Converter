import {Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun} from 'docx';
import {destroyPdfDocument, extractPdfPagesStructuredText, loadPdfDocument} from '../pdfEngine';

export interface PdfToWordResult {
  blob: Blob;
  previewText: string;
  pageCount: number;
  totalCharacters: number;
  isLowTextDensity: boolean;
}

function median(values: number[]): number {
  if (values.length === 0) return 11;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function convertPdfToWord(
  file: File,
  onProgress?: (current: number, total: number) => void
): Promise<PdfToWordResult> {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await loadPdfDocument(buffer);

  try {
    const pages = await extractPdfPagesStructuredText(pdfDoc, onProgress);
    const allFontSizes = pages.flatMap((p) => p.lines.map((l) => l.fontSize));
    const bodyFontSize = median(allFontSizes);

    const paragraphs: Paragraph[] = [];
    const previewChunks: string[] = [];
    let totalChars = 0;

    pages.forEach((page, pageIdx) => {
      if (pageIdx > 0) {
        paragraphs.push(new Paragraph({children: [new PageBreak()]}));
      }

      if (page.lines.length === 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Page ${page.pageNumber}: No selectable text detected]`,
                italics: true,
                color: '64748B',
              }),
            ],
          })
        );
        return;
      }

      previewChunks.push(`--- Page ${page.pageNumber} ---\n${page.rawText}`);

      // Group consecutive body-sized lines into paragraphs when Y gap is normal
      let bufferParagraphText = '';
      let bufferBold = false;
      let bufferItalic = false;
      let prevY: number | null = null;
      let prevSize = bodyFontSize;

      const flushBuffer = () => {
        if (!bufferParagraphText.trim()) return;
        paragraphs.push(
          new Paragraph({
            spacing: {after: 140, line: 276},
            children: [
              new TextRun({
                text: bufferParagraphText.trim(),
                bold: bufferBold,
                italics: bufferItalic,
                size: 22, // 11pt
              }),
            ],
          })
        );
        bufferParagraphText = '';
      };

      for (const line of page.lines) {
        totalChars += line.text.length;
        const isH1 = line.fontSize >= bodyFontSize * 1.45 && line.text.length < 120;
        const isH2 = !isH1 && line.fontSize >= bodyFontSize * 1.2 && line.text.length < 140;
        const isBullet = /^[•\-–*]\s+/.test(line.text);

        if (isH1 || isH2) {
          flushBuffer();
          paragraphs.push(
            new Paragraph({
              heading: isH1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
              spacing: {before: 200, after: 100},
              children: [
                new TextRun({
                  text: line.text,
                  bold: true,
                }),
              ],
            })
          );
          prevY = line.y;
          prevSize = line.fontSize;
          continue;
        }

        if (isBullet) {
          flushBuffer();
          paragraphs.push(
            new Paragraph({
              bullet: {level: 0},
              spacing: {after: 80},
              children: [
                new TextRun({
                  text: line.text.replace(/^[•\-–*]\s+/, ''),
                  bold: line.isBold,
                  italics: line.isItalic,
                  size: 22,
                }),
              ],
            })
          );
          prevY = line.y;
          prevSize = line.fontSize;
          continue;
        }

        const yGap = prevY !== null ? Math.abs(prevY - line.y) : 0;
        const startsNewParagraph =
          prevY !== null && (yGap > prevSize * 1.85 || bufferBold !== line.isBold);

        if (startsNewParagraph) {
          flushBuffer();
        }

        if (!bufferParagraphText) {
          bufferBold = line.isBold;
          bufferItalic = line.isItalic;
          bufferParagraphText = line.text;
        } else {
          bufferParagraphText += ' ' + line.text;
        }

        prevY = line.y;
        prevSize = line.fontSize;
      }

      flushBuffer();
    });

    const doc = new Document({
      sections: [
        {
          properties: {},
          children:
            paragraphs.length > 0
              ? paragraphs
              : [
                  new Paragraph({
                    children: [new TextRun({text: 'No selectable text could be extracted from this PDF.'})],
                  }),
                ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const avgCharsPerPage = totalChars / Math.max(1, pages.length);

    return {
      blob,
      previewText: previewChunks.join('\n\n'),
      pageCount: pages.length,
      totalCharacters: totalChars,
      isLowTextDensity: avgCharsPerPage < 30,
    };
  } finally {
    await destroyPdfDocument(pdfDoc);
  }
}
