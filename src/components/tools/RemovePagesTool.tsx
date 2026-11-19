import React, {useEffect, useState} from 'react';
import {CheckCircle2, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {removePdfPages} from '../../services/converters/removePdfPages';
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

export const RemovePagesTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [pagesToRemove, setPagesToRemove] = useState<number[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
    }
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;
  const outputName = activeFile ? `${stripExtension(activeFile.name)}_cleaned.pdf` : 'cleaned.pdf';

  const handleTogglePage = (pageNum: number) => {
    setPagesToRemove((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
    setResultBlob(null);
    setResultFile(null);
  };

  const handleApply = async () => {
    if (!activeFile) {
      onNotify('error', t.noFilesSelected);
      return;
    }
    if (pagesToRemove.length === 0) {
      onNotify('error', t.removePagesHint);
      return;
    }
    if (pagesToRemove.length >= totalPages) {
      onNotify('error', t.removeAllError);
      return;
    }

    setProgress(40);
    setResultBlob(null);
    setResultFile(null);

    try {
      const blob = await removePdfPages(activeFile, pagesToRemove);
      setResultBlob(blob);
      setResultFile(new File([blob], outputName, {type: 'application/pdf'}));

      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: outputName,
        toolId: 'remove-pages',
        conversionType: t.tools['remove-pages'].name,
        inputSize: activeFile.size,
        outputSize: blob.size,
        status: 'success',
      });

      onNotify('success', t.readyToDownload, outputName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.corruptedFileError;
      onNotify('error', msg);
    } finally {
      setProgress(null);
    }
  };

  const remaining = Math.max(0, totalPages - pagesToRemove.length);

  return (
    <div className="space-y-6">
      <FileUploadZone
        t={t}
        accept=".pdf,application/pdf"
        expectedKind="pdf"
        multiple={false}
        files={items}
        onFilesAdded={(files) => {
          setItems([{id: generateId(), file: files[0]}]);
          setPagesToRemove([]);
          setResultBlob(null);
          setResultFile(null);
          setTotalPages(0);
        }}
        onRemoveFile={() => {
          setItems([]);
          setPagesToRemove([]);
          setResultBlob(null);
          setResultFile(null);
          setTotalPages(0);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-slate-600 dark:text-slate-400">{t.removePagesHint}</p>
            <div className="flex items-center gap-3 font-mono tabular-nums text-slate-700 dark:text-slate-300">
              <span>
                {t.selectedCount}: {pagesToRemove.length}
              </span>
              <span>·</span>
              <span>
                {t.removeRemainingLabel}: {remaining}
              </span>
            </div>
          </div>

          <PdfThumbnailGrid
            file={activeFile}
            t={t}
            mode="remove"
            selectedPages={pagesToRemove}
            onTogglePage={handleTogglePage}
            onPageCountLoaded={setTotalPages}
            onLoadError={(msg) => onNotify('error', msg)}
          />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={progress !== null || pagesToRemove.length === 0 || remaining === 0}
              onClick={handleApply}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['remove-pages'].actionLabel}</span>
            </button>

            {resultBlob && (
              <button
                type="button"
                onClick={() => downloadBlob(resultBlob, outputName)}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {t.downloadResult} ({formatBytes(resultBlob.size)})
                </span>
              </button>
            )}
          </div>

          {resultFile && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {t.readyToDownload} · {t.previewLabel}
                </span>
              </div>
              <PdfThumbnailGrid file={resultFile} t={t} mode="preview" maxPreviewLimit={16} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
