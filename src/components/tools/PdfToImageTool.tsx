import React, {useEffect, useState} from 'react';
import {Archive, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {
  bundleImagesAsZip,
  convertPdfPagesToImages,
  type ImageOutputFormat,
  type RenderedPdfImage,
} from '../../services/converters/pdfToImage';
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

export const PdfToImageTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [format, setFormat] = useState<ImageOutputFormat>('png');
  const [quality, setQuality] = useState<number>(0.85);
  const [scale, setScale] = useState<number>(1.5);
  const [progress, setProgress] = useState<number | null>(null);
  const [images, setImages] = useState<RenderedPdfImage[]>([]);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
    }
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;

  const handleTogglePage = (pageNum: number) => {
    setSelectedPages((prev) =>
      prev.includes(pageNum) ? prev.filter((p) => p !== pageNum) : [...prev, pageNum].sort((a, b) => a - b)
    );
    setImages([]);
  };

  const handleExport = async () => {
    if (!activeFile || totalPages === 0) {
      onNotify('error', t.noFilesSelected);
      return;
    }

    const targets =
      selectedPages.length > 0
        ? selectedPages
        : Array.from({length: totalPages}, (_, idx) => idx + 1);

    setProgress(5);
    setImages([]);

    try {
      const rendered = await convertPdfPagesToImages(
        activeFile,
        targets,
        {format, quality, scale},
        (curr, total) => setProgress(Math.round((curr / total) * 100))
      );
      setImages(rendered);

      const totalBytes = rendered.reduce((sum, r) => sum + r.blob.size, 0);
      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: `${rendered.length} ${format.toUpperCase()} images`,
        toolId: 'pdf-to-image',
        conversionType: t.tools['pdf-to-image'].name,
        inputSize: activeFile.size,
        outputSize: totalBytes,
        status: 'success',
      });

      onNotify('success', t.readyToDownload, `${rendered.length} ${format.toUpperCase()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.corruptedFileError;
      onNotify('error', msg);
    } finally {
      setProgress(null);
    }
  };

  const handleDownloadZip = async () => {
    if (!activeFile || images.length === 0) return;
    const zipBlob = await bundleImagesAsZip(images);
    downloadBlob(zipBlob, `${stripExtension(activeFile.name)}_images.zip`);
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
          setImages([]);
          setSelectedPages([]);
          setTotalPages(0);
        }}
        onRemoveFile={() => {
          setItems([]);
          setImages([]);
          setSelectedPages([]);
          setTotalPages(0);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.imgFormatLabel}
              </label>
              <select
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value as ImageOutputFormat);
                  setImages([]);
                }}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              >
                <option value="png">PNG (Lossless)</option>
                <option value="jpeg">JPG (Compact)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.imgQualityLabel}
              </label>
              <select
                value={quality}
                disabled={format === 'png'}
                onChange={(e) => {
                  setQuality(Number(e.target.value));
                  setImages([]);
                }}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white disabled:opacity-50"
              >
                <option value={0.65}>{t.imgQualityLow}</option>
                <option value={0.82}>{t.imgQualityMed}</option>
                <option value={0.95}>{t.imgQualityHigh}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                {t.imgScaleLabel}
              </label>
              <select
                value={scale}
                onChange={(e) => {
                  setScale(Number(e.target.value));
                  setImages([]);
                }}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
              >
                <option value={1}>1x (Standard)</option>
                <option value={1.5}>1.5x (Sharp)</option>
                <option value={2}>2x (High DPI)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className="text-slate-600 dark:text-slate-400">{t.imgSelectPagesHint}</p>
            {totalPages > 0 && (
              <div className="flex items-center gap-2">
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
              </div>
            )}
          </div>

          <PdfThumbnailGrid
            file={activeFile}
            t={t}
            mode="select"
            selectedPages={selectedPages}
            onTogglePage={handleTogglePage}
            onPageCountLoaded={(count) => {
              setTotalPages(count);
              setSelectedPages(Array.from({length: count}, (_, i) => i + 1));
            }}
            onLoadError={(msg) => onNotify('error', msg)}
          />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={progress !== null || totalPages === 0}
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['pdf-to-image'].actionLabel}</span>
            </button>

            {images.length > 1 && (
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

          {images.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((img) => (
                <div
                  key={img.fileName}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-2.5 bg-slate-50 dark:bg-slate-800/40"
                >
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white dark:bg-slate-900 flex items-center justify-center">
                    <img
                      src={img.dataUrl}
                      alt={img.fileName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate">
                        {img.fileName}
                      </p>
                      <p className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {img.width}×{img.height} · {formatBytes(img.blob.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadBlob(img.blob, img.fileName)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t.imgDownloadSingle}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
