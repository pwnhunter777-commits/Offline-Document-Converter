import React, {useEffect, useState} from 'react';
import {CheckCircle2, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {removePdfPages} from '../../services/converters/removePdfPages';
import {isPdfEncryptedError} from '../../services/pdfEngine';
import type {HistoryStatus, ToolId} from '../../types';
import {
  downloadBlob,
  formatBytes,
  generateId,
  parseFlatPages,
  stripExtension,
} from '../../utils/format';
import {FileUploadZone, type UploadedFileItem} from '../FileUploadZone';
import {PdfPasswordPrompt} from '../PdfPasswordPrompt';
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
  const [rangeText, setRangeText] = useState('');
  const [encryptedError, setEncryptedError] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFile, setResultFile] = useState<File | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
      setPagesToRemove([]);
      setRangeText('');
      setEncryptedError(false);
    }
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;
  const outputName = activeFile ? `${stripExtension(activeFile.name)}_cleaned.pdf` : 'cleaned.pdf';

  const handleTogglePage = (pageNum: number) => {
    setPagesToRemove((prev) => {
      const next = prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b);
      setRangeText(next.join(', '));
      return next;
    });
    setResultBlob(null);
    setResultFile(null);
  };

  const handleRangeChange = (val: string) => {
    setRangeText(val);
    setResultBlob(null);
    setResultFile(null);
    if (val.trim() === '') {
      setPagesToRemove([]);
      return;
    }
    if (totalPages > 0) {
      const parsed = parseFlatPages(val, totalPages);
      if (parsed) {
        setPagesToRemove(parsed);
      }
    }
  };

  const handleApply = async () => {
    if (!activeFile) {
      onNotify('error', t.noFilesSelected);
      return;
    }

    let targets = pagesToRemove;
    if (rangeText.trim().length > 0 && totalPages > 0) {
      const parsed = parseFlatPages(rangeText, totalPages);
      if (!parsed || parsed.length === 0) {
        onNotify('error', t.splitInvalidRanges);
        return;
      }
      targets = parsed;
    }

    if (targets.length === 0) {
      onNotify('error', t.removePagesHint);
      return;
    }
    if (targets.length >= totalPages) {
      onNotify('error', t.removeAllError);
      return;
    }

    setProgress(40);
    setResultBlob(null);
    setResultFile(null);

    try {
      const blob = await removePdfPages(activeFile, targets);
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
      if (isPdfEncryptedError(err)) {
        setEncryptedError(true);
        onNotify('error', t.passwordProtectedTitle, t.passwordProtectedLibBody);
        await onRecordHistory({
          fileName: activeFile.name,
          outputFileName: outputName,
          toolId: 'remove-pages',
          conversionType: t.tools['remove-pages'].name,
          inputSize: activeFile.size,
          outputSize: 0,
          status: 'error',
          note: t.passwordProtectedTitle,
        });
      } else {
        const msg = err instanceof Error ? err.message : t.corruptedFileError;
        onNotify('error', msg);
        await onRecordHistory({
          fileName: activeFile.name,
          outputFileName: outputName,
          toolId: 'remove-pages',
          conversionType: t.tools['remove-pages'].name,
          inputSize: activeFile.size,
          outputSize: 0,
          status: 'error',
          note: msg,
        });
      }
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
          setRangeText('');
          setEncryptedError(false);
          setResultBlob(null);
          setResultFile(null);
          setTotalPages(0);
        }}
        onRemoveFile={() => {
          setItems([]);
          setPagesToRemove([]);
          setRangeText('');
          setEncryptedError(false);
          setResultBlob(null);
          setResultFile(null);
          setTotalPages(0);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        onInfo={(msg) => onNotify('info', msg)}
        uploadProgress={progress}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          {encryptedError ? (
            <PdfPasswordPrompt t={t} mode="unsupported" fileName={activeFile.name} />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1 max-w-md">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t.pageRangeInputLabel}
                  </label>
                  <input
                    type="text"
                    value={rangeText}
                    onChange={(e) => handleRangeChange(e.target.value)}
                    placeholder={t.pageRangePlaceholder}
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  <span>
                    {t.selectedCount}: {pagesToRemove.length}
                  </span>
                  <span>·</span>
                  <span>
                    {t.removeRemainingLabel}: {remaining}
                  </span>
                  {pagesToRemove.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setPagesToRemove([]);
                        setRangeText('');
                        setResultBlob(null);
                        setResultFile(null);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-sans cursor-pointer"
                    >
                      {t.deselectAll}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">{t.removePagesHint}</p>

              <PdfThumbnailGrid
                file={activeFile}
                t={t}
                mode="remove"
                selectedPages={pagesToRemove}
                onTogglePage={handleTogglePage}
                onPageCountLoaded={setTotalPages}
                allowPasswordUnlock={false}
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
            </>
          )}
        </div>
      )}
    </div>
  );
};
