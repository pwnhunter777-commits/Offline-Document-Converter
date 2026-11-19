import React, {useEffect, useState} from 'react';
import {AlertTriangle, CheckCircle2, Download, Info, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {convertPdfToWord, type PdfToWordResult} from '../../services/converters/pdfToWord';
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

export const PdfToWordTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<PdfToWordResult | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
    }
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;

  const handleConvert = async () => {
    if (!activeFile) {
      onNotify('error', t.noFilesSelected);
      return;
    }

    setProgress(5);
    setResult(null);

    try {
      const res = await convertPdfToWord(activeFile, (curr, total) =>
        setProgress(Math.round((curr / total) * 100))
      );
      setResult(res);

      const outName = `${stripExtension(activeFile.name)}.docx`;
      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: outName,
        toolId: 'pdf-to-word',
        conversionType: t.tools['pdf-to-word'].name,
        inputSize: activeFile.size,
        outputSize: res.blob.size,
        status: res.isLowTextDensity ? 'warning' : 'success',
        note: res.isLowTextDensity ? 'Low selectable text density' : undefined,
      });

      if (res.isLowTextDensity) {
        onNotify('warning', t.readyToDownload, t.pdfToWordScannedWarning);
      } else {
        onNotify('success', t.readyToDownload, outName);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.corruptedFileError;
      onNotify('error', msg);
    } finally {
      setProgress(null);
    }
  };

  const outputName = activeFile ? `${stripExtension(activeFile.name)}.docx` : 'document.docx';

  return (
    <div className="space-y-6">
      {/* Honest limitation disclosure */}
      <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-700 dark:text-slate-300">
          <p className="font-semibold text-slate-900 dark:text-white">{t.pdfToWordNoticeTitle}</p>
          <p className="mt-1 leading-relaxed">{t.pdfToWordNoticeBody}</p>
        </div>
      </div>

      <FileUploadZone
        t={t}
        accept=".pdf,application/pdf"
        expectedKind="pdf"
        multiple={false}
        files={items}
        onFilesAdded={(files) => {
          setItems([{id: generateId(), file: files[0]}]);
          setResult(null);
        }}
        onRemoveFile={() => {
          setItems([]);
          setResult(null);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <PdfThumbnailGrid
            file={activeFile}
            t={t}
            mode="preview"
            maxPreviewLimit={12}
            onLoadError={(msg) => onNotify('error', msg)}
          />

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={progress !== null}
              onClick={handleConvert}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['pdf-to-word'].actionLabel}</span>
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
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              {result.isLowTextDensity ? (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <span>{t.pdfToWordScannedWarning}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {t.readyToDownload} ·{' '}
                    <span className="font-mono tabular-nums">{result.totalCharacters}</span>{' '}
                    {t.pdfToWordCharsExtracted}
                  </span>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  {t.pdfToWordExtractedPreview}
                </p>
                <pre className="max-h-72 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {result.previewText || '—'}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
