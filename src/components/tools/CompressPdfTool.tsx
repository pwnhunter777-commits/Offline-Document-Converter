import React, {useEffect, useRef, useState} from 'react';
import {AlertTriangle, CheckCircle2, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {
  compressPdfFile,
  type CompressionLevel,
  type CompressPdfResult,
} from '../../services/converters/compressPdf';
import {isPdfEncryptedError, PdfPasswordError} from '../../services/pdfEngine';
import type {HistoryStatus, ToolId} from '../../types';
import {downloadBlob, formatBytes, generateId, stripExtension} from '../../utils/format';
import {FileUploadZone, type UploadedFileItem} from '../FileUploadZone';
import {PdfPasswordPrompt} from '../PdfPasswordPrompt';

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

const HUNDRED_MB = 100 * 1024 * 1024;

export const CompressPdfTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [level, setLevel] = useState<CompressionLevel>('lossless');
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<CompressPdfResult | null>(null);
  const [pdfPassword, setPdfPassword] = useState<string | undefined>(undefined);
  const [passwordPromptMode, setPasswordPromptMode] = useState<'none' | 'unlock' | 'unsupported'>('none');
  const [incorrectPassword, setIncorrectPassword] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
      setResult(null);
      setPdfPassword(undefined);
      setPasswordPromptMode('none');
      setIncorrectPassword(false);
    }
  }, [initialFiles]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const activeFile = items[0]?.file ?? null;
  const outputName = activeFile ? `${stripExtension(activeFile.name)}_compressed.pdf` : 'compressed.pdf';

  const runCompress = async (passwordOverride?: string) => {
    if (!activeFile) {
      onNotify('error', t.noFilesSelected);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(5);
    setResult(null);

    try {
      const res = await compressPdfFile(
        activeFile,
        level,
        (curr, total) => setProgress(Math.round((curr / total) * 100)),
        passwordOverride ?? pdfPassword,
        controller.signal
      );
      setResult(res);
      setPasswordPromptMode('none');
      setIncorrectPassword(false);

      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: res.reduced ? outputName : activeFile.name,
        toolId: 'compress-pdf',
        conversionType: t.tools['compress-pdf'].name,
        inputSize: res.originalSize,
        outputSize: res.compressedSize,
        status: res.reduced ? 'success' : 'warning',
        note: res.reduced ? `Saved ${res.savedPercent}%` : 'No size reduction achieved',
      });

      if (res.reduced) {
        onNotify('success', t.readyToDownload, `-${res.savedPercent}% (${formatBytes(res.compressedSize)})`);
      } else {
        onNotify('warning', t.compressNoReductionTitle, t.compressNoReductionBody);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        onNotify('info', t.processingCancelled);
      } else if (err instanceof PdfPasswordError) {
        setPasswordPromptMode('unlock');
        setIncorrectPassword(err.incorrect);
        onNotify('error', err.incorrect ? t.passwordIncorrectError : t.passwordProtectedTitle);
      } else if (isPdfEncryptedError(err)) {
        setPasswordPromptMode('unsupported');
        onNotify('error', t.passwordProtectedTitle, t.passwordProtectedLibBody);
        await onRecordHistory({
          fileName: activeFile.name,
          outputFileName: outputName,
          toolId: 'compress-pdf',
          conversionType: t.tools['compress-pdf'].name,
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
          toolId: 'compress-pdf',
          conversionType: t.tools['compress-pdf'].name,
          inputSize: activeFile.size,
          outputSize: 0,
          status: 'error',
          note: msg,
        });
      }
    } finally {
      abortRef.current = null;
      setProgress(null);
    }
  };

  const options: {id: CompressionLevel; label: string; desc: string}[] = [
    {id: 'lossless', label: t.compressModeLossless, desc: t.compressModeDescLossless},
    {id: 'low', label: t.compressModeLow, desc: t.compressModeDescRaster},
    {id: 'medium', label: t.compressModeMedium, desc: t.compressModeDescRaster},
    {id: 'high', label: t.compressModeHigh, desc: t.compressModeDescRaster},
  ];

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
          setResult(null);
          setPdfPassword(undefined);
          setPasswordPromptMode('none');
          setIncorrectPassword(false);
        }}
        onRemoveFile={() => {
          abortRef.current?.abort();
          setItems([]);
          setResult(null);
          setPdfPassword(undefined);
          setPasswordPromptMode('none');
          setIncorrectPassword(false);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        onInfo={(msg) => onNotify('info', msg)}
        confirmLargeFileBytes={HUNDRED_MB}
        uploadProgress={progress}
        onCancelProcessing={() => abortRef.current?.abort()}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
              {t.compressModeLabel}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setLevel(opt.id);
                    setResult(null);
                    setPasswordPromptMode('none');
                  }}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    level === opt.id
                      ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/60'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      level === opt.id
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {opt.label}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {level !== 'lossless' && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 dark:text-amber-100 space-y-1">
                <p className="font-semibold">{t.compressRasterWarningTitle}</p>
                <p className="leading-relaxed text-amber-900 dark:text-amber-200">
                  {t.compressRasterWarningBody}
                </p>
              </div>
            </div>
          )}

          {passwordPromptMode !== 'none' && (
            <PdfPasswordPrompt
              t={t}
              mode={passwordPromptMode}
              incorrectPassword={incorrectPassword}
              fileName={activeFile.name}
              onUnlock={(pw) => {
                setPdfPassword(pw);
                void runCompress(pw);
              }}
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={progress !== null}
              onClick={() => void runCompress()}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['compress-pdf'].actionLabel}</span>
            </button>

            {result && result.reduced && (
              <button
                type="button"
                onClick={() => downloadBlob(result.blob, outputName)}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {t.downloadResult} ({formatBytes(result.compressedSize)})
                </span>
              </button>
            )}
          </div>

          {result && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.compressOriginalSize}</p>
                  <p className="mt-0.5 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatBytes(result.originalSize)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.compressNewSize}</p>
                  <p className="mt-0.5 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatBytes(result.compressedSize)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.compressSavings}</p>
                  <p
                    className={`mt-0.5 text-lg font-bold font-mono tabular-nums ${
                      result.reduced
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {result.reduced ? `-${result.savedPercent}%` : '0%'}
                  </p>
                </div>
              </div>

              {!result.reduced ? (
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      <p className="font-semibold">{t.compressNoReductionTitle}</p>
                      <p className="leading-relaxed">{t.compressNoReductionBody}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadBlob(result.blob, outputName)}
                    className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs font-semibold text-amber-900 dark:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-950/60 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {t.compressDownloadAnyway} ({formatBytes(result.compressedSize)})
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{t.readyToDownload}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
