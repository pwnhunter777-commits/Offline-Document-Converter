import React, {useEffect, useState} from 'react';
import {CheckCircle2, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {extractPdfPages} from '../../services/converters/extractPdfPages';
import type {HistoryStatus, ToolId} from '../../types';
import {
  downloadBlob,
  formatBytes,
  generateId,
  parseFlatPages,
  stripExtension,
} from '../../utils/format';
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

export const ExtractPagesTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeText, setRangeText] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
    }
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;
  const outputName = activeFile ? `${stripExtension(activeFile.name)}_extracted.pdf` : 'extracted.pdf';

  const handleTogglePage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b);
      setRangeText(next.join(', '));
      return next;
    });
    setResultBlob(null);
  };

  const handleRangeChange = (val: string) => {
    setRangeText(val);
    setResultBlob(null);
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

  const handleExtract = async () => {
    if (!activeFile || totalPages === 0) {
      onNotify('error', t.noFilesSelected);
      return;
    }

    let targets: number[];
    if (rangeText.trim().length > 0) {
      const parsed = parseFlatPages(rangeText, totalPages);
      if (!parsed || parsed.length === 0) {
        onNotify('error', t.splitInvalidRanges);
        return;
      }
      targets = parsed;
    } else {
      targets = selectedPages;
    }

    if (targets.length === 0) {
      onNotify('error', t.splitInvalidRanges);
      return;
    }

    setProgress(40);
    setResultBlob(null);

    try {
      const blob = await extractPdfPages(activeFile, targets);
      setResultBlob(blob);

      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: outputName,
        toolId: 'extract-pages',
        conversionType: t.tools['extract-pages'].name,
        inputSize: activeFile.size,
        outputSize: blob.size,
        status: 'success',
      });

      onNotify('success', t.readyToDownload, `${outputName} (${targets.length} pages)`);
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
        multiple={false}
        files={items}
        onFilesAdded={(files) => {
          setItems([{id: generateId(), file: files[0]}]);
          setSelectedPages([]);
          setRangeText('');
          setResultBlob(null);
          setTotalPages(0);
        }}
        onRemoveFile={() => {
          setItems([]);
          setSelectedPages([]);
          setRangeText('');
          setResultBlob(null);
          setTotalPages(0);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex-1 max-w-md">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.extractRangeLabel}
              </label>
              <input
                type="text"
                value={rangeText}
                onChange={(e) => handleRangeChange(e.target.value)}
                placeholder={t.extractRangePlaceholder}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {totalPages > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const all = Array.from({length: totalPages}, (_, i) => i + 1);
                    setSelectedPages(all);
                    setRangeText(`1-${totalPages}`);
                    setResultBlob(null);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t.selectAll}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPages([]);
                    setRangeText('');
                    setResultBlob(null);
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t.deselectAll}
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">{t.extractPagesHint}</p>

          <PdfThumbnailGrid
            file={activeFile}
            t={t}
            mode="select"
            selectedPages={selectedPages}
            onTogglePage={handleTogglePage}
            onPageCountLoaded={setTotalPages}
            onLoadError={(msg) => onNotify('error', msg)}
          />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={progress !== null || selectedPages.length === 0}
              onClick={handleExtract}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['extract-pages'].actionLabel}</span>
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

          {resultBlob && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.readyToDownload}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
