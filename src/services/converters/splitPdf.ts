import JSZip from 'jszip';
import {PDFDocument} from 'pdf-lib';
import {stripExtension} from '../../utils/format';

export interface SplitOutputItem {
  fileName: string;
  pagesLabel: string;
  pageCount: number;
  blob: Blob;
}

export async function splitPdfByGroups(
  file: File,
  groups: number[][],
  onProgress?: (current: number, total: number) => void
): Promise<SplitOutputItem[]> {
  const bytes = await file.arrayBuffer();
  const srcPdf = await PDFDocument.load(bytes, {ignoreEncryption: false});
  const baseName = stripExtension(file.name);
  const outputs: SplitOutputItem[] = [];

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const outPdf = await PDFDocument.create();
    const zeroBased = group.map((p) => p - 1);
    const copied = await outPdf.copyPages(srcPdf, zeroBased);
    for (const page of copied) {
      outPdf.addPage(page);
    }
    const outBytes = await outPdf.save();
    const pagesLabel =
      group.length === 1
        ? `p${group[0]}`
        : `p${group[0]}-${group[group.length - 1]}`;
    const fileName = `${baseName}_${pagesLabel}.pdf`;
    outputs.push({
      fileName,
      pagesLabel: group.length === 1 ? `${group[0]}` : `${group[0]}–${group[group.length - 1]}`,
      pageCount: group.length,
      blob: new Blob([outBytes as unknown as BlobPart], {type: 'application/pdf'}),
    });
    onProgress?.(i + 1, groups.length);
  }

  return outputs;
}

export async function bundleSplitOutputsAsZip(items: SplitOutputItem[]): Promise<Blob> {
  const zip = new JSZip();
  const usedNames = new Map<string, number>();

  for (const item of items) {
    const count = usedNames.get(item.fileName) ?? 0;
    usedNames.set(item.fileName, count + 1);
    const uniqueName =
      count === 0 ? item.fileName : item.fileName.replace(/\.pdf$/i, `_${count + 1}.pdf`);
    zip.file(uniqueName, item.blob);
  }

  return await zip.generateAsync({type: 'blob'});
}
