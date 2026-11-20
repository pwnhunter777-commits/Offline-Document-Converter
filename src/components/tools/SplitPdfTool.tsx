import React, {useEffect, useState} from 'react';
import {Archive, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {
  bundleSplitOutputsAsZip,
  splitPdfByGroups,
  type SplitOutputItem,
} from '../../services/converters/splitPdf';
import {isPdfEncryptedError} from '../../services/pdfEngine';
import type {HistoryStatus, ToolId} from '../../types';
import {
  downloadBlob,
  formatBytes,
  generateId,
  parseFlatPages,
  parsePageRangeGroups,
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

type SplitMode = 'ranges' | 'individual' | 'selected';

export const SplitPdfTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [rangesInput, setRangesInput] = useState('');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [selectedRangeText, setSelectedRangeText] = useState('');
  const [encryptedError, setEncryptedError] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [outputs, setOutputs] = useState<SplitOutputItem[]>([]);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
      setSelectedPages([]);
      setSelectedRangeText('');
      setEncryptedError(false);
    }
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;

  const handleTogglePage = (page: number) => {
    setSelectedPages((prev) => {
      const next = prev.includes(page)
        ? prev.filter((p) => p !== page)
        : [...prev, page].sort((a, b) => a - b);
      setSelectedRangeText(next.join(', '));
      return next;
    });
    setOutputs([]);
  };

  const handleSelectedRangeChange = (val: string) => {
    setSelectedRangeText(val);
    setOutputs([]);
    if (val.trim() === '') {
      setSelectedPages([]);
      return;
    }
    if (totalPages > 0) {
      const parsed = parseFlatPages(val, totalPages);
      if (parsed) {
        setSelectedPages(parsed);
      }
    }
  };

  const handleSplit = async () => {
    if (!activeFile || totalPages === 0) {
      onNotify('error', t.noFilesSelected);
      return;
    }

    let groups: number[][] | null = null;
    if (mode === 'individual') {
      groups = Array.from({length: totalPages}, (_, idx) => [idx + 1]);
    } else if (mode === 'selected') {
      let chosen = selectedPages;
      if (selectedRangeText.trim().length > 0) {
        const parsed = parseFlatPages(selectedRangeText, totalPages);
        if (!parsed || parsed.length === 0) {
          onNotify('error', t.splitInvalidRanges);
          return;
        }
        chosen = parsed;
      }
      if (chosen.length === 0) {
        onNotify('error', t.splitInvalidRanges);
        return;
      }
      groups = chosen.map((p) => [p]);
    } else {
      groups = parsePageRangeGroups(rangesInput, totalPages);
    }

    if (!groups || groups.length === 0) {
      onNotify('error', t.splitInvalidRanges);
      return;
    }

    setProgress(5);
    setOutputs([]);

    try {
      const res = await splitPdfByGroups(activeFile, groups, (curr, total) =>
        setProgress(Math.round((curr / total) * 100))
      );
      setOutputs(res);

      const totalOutputBytes = res.reduce((sum, item) => sum + item.blob.size, 0);
      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: `${res.length} PDF files`,
        toolId: 'split-pdf',
        conversionType: t.tools['split-pdf'].name,
        inputSize: activeFile.size,
        outputSize: totalOutputBytes,
        status: 'success',
      });

      onNotify('success', t.readyToDownload, `${res.length} PDF`);
    } catch (err) {
      if (isPdfEncryptedError(err)) {
        setEncryptedError(true);
        onNotify('error', t.passwordProtectedTitle, t.passwordProtectedLibBody);
        await onRecordHistory({
          fileName: activeFile.name,
          outputFileName: `${stripExtension(activeFile.name)}_split`,
          toolId: 'split-pdf',
          conversionType: t.tools['split-pdf'].name,
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
          outputFileName: `${stripExtension(activeFile.name)}_split`,
          toolId: 'split-pdf',
          conversionType: t.tools['split-pdf'].name,
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

  const handleDownloadZip = async () => {
    if (!activeFile || outputs.length === 0) return;
    const zipBlob = await bundleSplitOutputsAsZip(outputs);
    downloadBlob(zipBlob, `${stripExtension(activeFile.name)}_split.zip`);
  };

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
          setOutputs([]);
          setSelectedPages([]);
          setSelectedRangeText('');
          setEncryptedError(false);
          setTotalPages(0);
          setRangesInput('');
        }}
        onRemoveFile={() => {
          setItems([]);
          setOutputs([]);
          setSelectedPages([]);
          setSelectedRangeText('');
          setEncryptedError(false);
          setTotalPages(0);
          setRangesInput('');
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
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                  {t.splitModeLabel}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {(
                    [
                      {id: 'ranges', label: t.splitModeRanges},
                      {id: 'individual', label: t.splitModeIndividual},
                      {id: 'selected', label: t.splitModeSelected},
                    ] as {id: SplitMode; label: string}[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setMode(opt.id);
                        setOutputs([]);
                      }}
                      className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium text-left transition-colors cursor-pointer ${
                        mode === opt.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'ranges' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {t.splitRangesInputLabel}
                  </label>
                  <input
                    type="text"
                    value={rangesInput}
                    onChange={(e) => {
                      setRangesInput(e.target.value);
                      setOutputs([]);
                    }}
                    placeholder={t.splitRangesPlaceholder}
                    className="w-full max-w-md h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t.splitRangesHelp}</p>
                </div>
              )}

              {mode === 'selected' && totalPages > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="flex-1 max-w-md">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                      {t.pageRangeInputLabel}
                    </label>
                    <input
                      type="text"
                      value={selectedRangeText}
                      onChange={(e) => handleSelectedRangeChange(e.target.value)}
                      placeholder={t.pageRangePlaceholder}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const all = Array.from({length: totalPages}, (_, i) => i + 1);
                        setSelectedPages(all);
                        setSelectedRangeText(`1-${totalPages}`);
                        setOutputs([]);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {t.selectAll}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPages([]);
                        setSelectedRangeText('');
                        setOutputs([]);
                      }}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {t.deselectAll}
                    </button>
                    <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {t.selectedCount}: {selectedPages.length}
                    </span>
                  </div>
                </div>
              )}

              <PdfThumbnailGrid
                file={activeFile}
                t={t}
                mode={mode === 'selected' ? 'select' : 'preview'}
                selectedPages={selectedPages}
                onTogglePage={handleTogglePage}
                allowPasswordUnlock={false}
                onPageCountLoaded={setTotalPages}
                onLoadError={(msg) => onNotify('error', msg)}
              />

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={progress !== null || totalPages === 0}
                  onClick={handleSplit}
                  className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{t.tools['split-pdf'].actionLabel}</span>
                </button>

                {outputs.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    <Archive className="w-4 h-4" />
                    <span>{t.downloadZip}</span>
                  </button>
                )}
              </div>

              {outputs.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    {t.splitOutputCount}: <span className="font-mono tabular-nums">{outputs.length}</span>
                  </p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                    {outputs.map((item, idx) => (
                      <div key={`${item.fileName}-${idx}`} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                            {item.fileName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {t.pageNumber} {item.pagesLabel} · {formatBytes(item.blob.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadBlob(item.blob, item.fileName)}
                          className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{t.downloadResult}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
