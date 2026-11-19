import React, {useEffect, useState} from 'react';
import {CheckCircle2, Download, Loader2, RotateCcw} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {
  convertImagesToPdf,
  type ImageFitOption,
  type MarginOption,
  type OrientationOption,
  type PageSizeOption,
} from '../../services/converters/imageToPdf';
import type {HistoryStatus, ToolId} from '../../types';
import {downloadBlob, formatBytes, generateId, stripExtension} from '../../utils/format';
import {FileUploadZone, type UploadedFileItem} from '../FileUploadZone';

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

export const ImageToPdfTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizeOption>('a4');
  const [orientation, setOrientation] = useState<OrientationOption>('auto');
  const [margin, setMargin] = useState<MarginOption>('small');
  const [imageFit, setImageFit] = useState<ImageFitOption>('contain');
  const [progress, setProgress] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [outputName, setOutputName] = useState('images_converted.pdf');

  useEffect(() => {
    if (initialFiles.length > 0) {
      addFiles(initialFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]);

  const addFiles = (newFiles: File[]) => {
    const mapped: UploadedFileItem[] = newFiles.map((file) => ({
      id: generateId(),
      file,
    }));
    setItems((prev) => [...prev, ...mapped]);
    setResultBlob(null);
  };

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setResultBlob(null);
  };

  const handleMove = (index: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const swapIdx = index + dir;
      if (swapIdx < 0 || swapIdx >= next.length) return prev;
      [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
      return next;
    });
    setResultBlob(null);
  };

  const handleClearAll = () => {
    setItems([]);
    setResultBlob(null);
  };

  const handleConvert = async () => {
    if (items.length === 0) {
      onNotify('error', t.noFilesSelected);
      return;
    }
    setProgress(5);
    setResultBlob(null);

    try {
      const files = items.map((i) => i.file);
      const blob = await convertImagesToPdf(
        files,
        {pageSize, orientation, margin, imageFit},
        (curr, total) => setProgress(Math.round((curr / total) * 100))
      );

      const firstBase = stripExtension(files[0].name);
      const outName = files.length === 1 ? `${firstBase}.pdf` : `${firstBase}_and_${files.length - 1}_more.pdf`;
      setOutputName(outName);
      setResultBlob(blob);

      const totalInputSize = files.reduce((sum, f) => sum + f.size, 0);
      await onRecordHistory({
        fileName: files.length === 1 ? files[0].name : `${files[0].name} (+${files.length - 1})`,
        outputFileName: outName,
        toolId: 'image-to-pdf',
        conversionType: t.tools['image-to-pdf'].name,
        inputSize: totalInputSize,
        outputSize: blob.size,
        status: 'success',
      });

      onNotify('success', t.readyToDownload, `${outName} (${formatBytes(blob.size)})`);
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
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        expectedKind="image"
        multiple
        files={items}
        onFilesAdded={addFiles}
        onRemoveFile={handleRemove}
        onMoveFile={handleMove}
        onClearAll={handleClearAll}
        supportedLabel="JPG, JPEG, PNG, WEBP"
        reorderHint={t.imgReorderHint}
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {items.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.imgPageSize}
              </label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value as PageSizeOption);
                  setResultBlob(null);
                }}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              >
                <option value="a4">A4 (210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="legal">US Legal (8.5 × 14 in)</option>
                <option value="fit">{t.imgPageFit}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.imgOrientation}
              </label>
              <select
                value={orientation}
                disabled={pageSize === 'fit'}
                onChange={(e) => {
                  setOrientation(e.target.value as OrientationOption);
                  setResultBlob(null);
                }}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="auto">{t.imgAuto}</option>
                <option value="portrait">{t.imgPortrait}</option>
                <option value="landscape">{t.imgLandscape}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.imgMargins}
              </label>
              <select
                value={margin}
                disabled={pageSize === 'fit'}
                onChange={(e) => {
                  setMargin(e.target.value as MarginOption);
                  setResultBlob(null);
                }}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="none">{t.imgMarginNone}</option>
                <option value="small">{t.imgMarginSmall}</option>
                <option value="normal">{t.imgMarginNormal}</option>
                <option value="large">{t.imgMarginLarge}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.imgFitMode}
              </label>
              <select
                value={imageFit}
                disabled={pageSize === 'fit'}
                onChange={(e) => {
                  setImageFit(e.target.value as ImageFitOption);
                  setResultBlob(null);
                }}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value="contain">{t.imgFitContain}</option>
                <option value="cover">{t.imgFitCover}</option>
                <option value="original">{t.imgFitOriginal}</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={progress !== null}
              onClick={handleConvert}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['image-to-pdf'].actionLabel}</span>
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

            {resultBlob && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center justify-center gap-2 min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.resetWorkspace}</span>
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
