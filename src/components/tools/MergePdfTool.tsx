import React, {useEffect, useState} from 'react';
import {CheckCircle2, Download, Eye, Loader2, X} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {mergePdfFiles} from '../../services/converters/mergePdf';
import type {HistoryStatus, ToolId} from '../../types';
import {downloadBlob, formatBytes, generateId, stripExtension} from '../../utils/format';
import {FileUploadZone, type UploadedFileItem} from '../FileUploadZone';
import {PdfThumbnailGrid} from '../PdfThumbnailGrid';

interface ToolProps {
  t: TranslationDictionary;
  initialFiles?: File[];
  onRecordHistory: (entry: {
    fileName: string;
    outputFileName: string;
    toolId: ToolId;
    conversionType: string;
    inputSize: number;
    outputSize: number;
    status: HistoryStatus;
    note?: string;
  }) => Promise<void>;
  onNotify: (type: 'success' | 'error' | 'warning' | 'info', title: string, desc?: string) => void;
}

export const MergePdfTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{blob: Blob; totalPages: number} | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems(initialFiles.map((file) => ({id: generateId(), file})));
    }
  }, [initialFiles]);

  const handleMove = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  };

  const outputName =
    items.length > 0 ? `${stripExtension(items[0].file.name)}_merged.pdf` : 'merged.pdf';

  const handleMerge = async () => {
    if (items.length < 2) {
      onNotify('error', t.mergeNeedTwo);
      return;
    }
    setProgress(10);
    setResult(null);

    try {
      const files = items.map((i) => i.file);
      const res = await mergePdfFiles(files, (curr, total) =>
        setProgress(Math.round((curr / total) * 100))
      );
      setResult(res);

      const totalInputSize = files.reduce((sum, f) => sum + f.size, 0);
      await onRecordHistory({
        fileName: `${files[0].name} (+${files.length - 1})`,
        outputFileName: outputName,
        toolId: 'merge-pdf',
        conversionType: t.tools['merge-pdf'].name,
        inputSize: totalInputSize,
        outputSize: res.blob.size,
        status: 'success',
      });

      onNotify('success', t.readyToDownload, `${outputName} (${res.totalPages} pages)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.corruptedFileError;
      onNotify('error', msg);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      <FileUploadZone
        t={t}
        accept=".pdf,application/pdf"
        expectedKind="pdf"
        multiple
        files={items}
        onFilesAdded={(files) => {
          setItems((prev) => [...prev, ...files.map((file) => ({id: generateId(), file}))]);
          setResult(null);
        }}
        onRemoveFile={(id) => {
          setItems((prev) => prev.filter((i) => i.id !== id));
          setResult(null);
        }}
        onMoveFile={handleMove}
        onClearAll={() => {
          setItems([]);
          setResult(null);
        }}
        supportedLabel="PDF"
        reorderHint={t.mergeOrderHint}
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          {/* Quick file preview switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPreviewFile(item.file)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span className="truncate max-w-[160px]">
                  #{idx + 1} {item.file.name}
                </span>
              </button>
            ))}
          </div>

          {items.length < 2 && (
            <p className="text-sm text-amber-700 dark:text-amber-300">{t.mergeNeedTwo}</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={items.length < 2 || progress !== null}
              onClick={handleMerge}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['merge-pdf'].actionLabel}</span>
            </button>

            {result && (
              <button
                type="button"
                onClick={() => downloadBlob(result.blob, outputName)}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {t.downloadResult} ({formatBytes(result.blob.size)})
                </span>
              </button>
            )}
          </div>

          {result && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {t.readyToDownload} · <span className="font-mono tabular-nums">{result.totalPages}</span> {t.totalPages}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Modal preview for individual PDF */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
          onClick={() => setPreviewFile(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {previewFile.name}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                aria-label={t.close}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <PdfThumbnailGrid file={previewFile} t={t} mode="preview" maxPreviewLimit={16} />
          </div>
        </div>
      )}
    </div>
  );
};
