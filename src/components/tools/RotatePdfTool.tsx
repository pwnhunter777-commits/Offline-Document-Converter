import React, {useEffect, useState} from 'react';
import {CheckCircle2, Download, Loader2, RotateCw} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {rotatePdfPages, type RotationAngle} from '../../services/converters/rotatePdf';
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

export const RotatePdfTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [target, setTarget] = useState<'all' | 'selected'>('all');
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [angle, setAngle] = useState<RotationAngle>(90);
  const [progress, setProgress] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
    }
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;
  const outputName = activeFile ? `${stripExtension(activeFile.name)}_rotated.pdf` : 'rotated.pdf';

  const handleTogglePage = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
    setResultBlob(null);
  };

  const handleRotate = async () => {
    if (!activeFile) {
      onNotify('error', t.noFilesSelected);
      return;
    }
    if (target === 'selected' && selectedPages.length === 0) {
      onNotify('error', t.rotateNoSelection);
      return;
    }

    setProgress(40);
    setResultBlob(null);

    try {
      const blob = await rotatePdfPages(
        activeFile,
        angle,
        target === 'all' ? 'all' : selectedPages
      );
      setResultBlob(blob);

      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: outputName,
        toolId: 'rotate-pdf',
        conversionType: t.tools['rotate-pdf'].name,
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
          setResultBlob(null);
          setSelectedPages([]);
          setTotalPages(0);
        }}
        onRemoveFile={() => {
          setItems([]);
          setResultBlob(null);
          setSelectedPages([]);
          setTotalPages(0);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t.rotateTargetLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTarget('all');
                    setResultBlob(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                    target === 'all'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.rotateAllPages}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTarget('selected');
                    setResultBlob(null);
                  }}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                    target === 'selected'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {t.rotateSelectedPages}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                {t.rotateAngleLabel}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    {val: 90, label: t.rotateAngle90},
                    {val: 180, label: t.rotateAngle180},
                    {val: 270, label: t.rotateAngle270},
                  ] as {val: RotationAngle; label: string}[]
                ).map((a) => (
                  <button
                    key={a.val}
                    type="button"
                    onClick={() => {
                      setAngle(a.val);
                      setResultBlob(null);
                    }}
                    className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                      angle === a.val
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5 shrink-0" />
                    <span>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {target === 'selected' && totalPages > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedPages(Array.from({length: totalPages}, (_, i) => i + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t.selectAll}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPages([])}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                {t.deselectAll}
              </button>
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {t.selectedCount}: {selectedPages.length}
              </span>
            </div>
          )}

          <PdfThumbnailGrid
            file={activeFile}
            t={t}
            mode={target === 'selected' ? 'select' : 'preview'}
            selectedPages={selectedPages}
            onTogglePage={handleTogglePage}
            rotationDelta={angle}
            rotateTarget={target}
            onPageCountLoaded={setTotalPages}
            onLoadError={(msg) => onNotify('error', msg)}
          />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={progress !== null || totalPages === 0}
              onClick={handleRotate}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['rotate-pdf'].actionLabel}</span>
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
