import React, {useEffect, useRef, useState} from 'react';
import {Archive, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {
  bundleImagesAsZip,
  convertPdfPagesToImages,
  type ImageOutputFormat,
  type RenderedPdfImage,
} from '../../services/converters/pdfToImage';
import {PdfPasswordError} from '../../services/pdfEngine';
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

const BlobCanvasPreview: React.FC<{blob: Blob; ariaLabel: string; className?: string}> = ({
  blob,
  ariaLabel,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let active = true;
    const draw = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const bitmap = await createImageBitmap(blob);
        if (!active) {
          bitmap.close();
          return;
        }
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(bitmap, 0, 0);
        }
        bitmap.close();
      } catch {
        // ignore preview draw failure
      }
    };
    void draw();
    return () => {
      active = false;
    };
  }, [blob]);

  return <canvas ref={canvasRef} aria-label={ariaLabel} role="img" className={className} />;
};

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
  const [rangeText, setRangeText] = useState('');
  const [format, setFormat] = useState<ImageOutputFormat>('png');
  const [quality, setQuality] = useState<number>(0.85);
  const [scale, setScale] = useState<number>(1.5);
  const [pdfPassword, setPdfPassword] = useState<string | undefined>(undefined);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [incorrectPassword, setIncorrectPassword] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [images, setImages] = useState<RenderedPdfImage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialFiles.length > 0) {
      setItems([{id: generateId(), file: initialFiles[0]}]);
      setPdfPassword(undefined);
      setNeedsPassword(false);
      setIncorrectPassword(false);
      setRangeText('');
      setSelectedPages([]);
    }
  }, [initialFiles]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const activeFile = items[0]?.file ?? null;

  const handleTogglePage = (pageNum: number) => {
    setSelectedPages((prev) => {
      const next = prev.includes(pageNum)
        ? prev.filter((p) => p !== pageNum)
        : [...prev, pageNum].sort((a, b) => a - b);
      setRangeText(next.length === totalPages && totalPages > 0 ? `1-${totalPages}` : next.join(', '));
      return next;
    });
    setImages([]);
  };

  const handleRangeChange = (val: string) => {
    setRangeText(val);
    setImages([]);
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

  const runExport = async (passwordOverride?: string) => {
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
    } else if (selectedPages.length > 0) {
      targets = selectedPages;
    } else {
      targets = Array.from({length: totalPages}, (_, idx) => idx + 1);
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(5);
    setImages([]);

    try {
      const rendered = await convertPdfPagesToImages(
        activeFile,
        targets,
        {format, quality, scale},
        (curr, total) => setProgress(Math.round((curr / total) * 100)),
        passwordOverride ?? pdfPassword,
        controller.signal
      );
      setImages(rendered);
      setNeedsPassword(false);
      setIncorrectPassword(false);

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
      if (err instanceof DOMException && err.name === 'AbortError') {
        onNotify('info', t.processingCancelled);
      } else if (err instanceof PdfPasswordError) {
        setNeedsPassword(true);
        setIncorrectPassword(err.incorrect);
        onNotify('error', err.incorrect ? t.passwordIncorrectError : t.passwordProtectedTitle);
      } else {
        const msg = err instanceof Error ? err.message : t.corruptedFileError;
        onNotify('error', msg);
        await onRecordHistory({
          fileName: activeFile.name,
          outputFileName: `${format.toUpperCase()} images`,
          toolId: 'pdf-to-image',
          conversionType: t.tools['pdf-to-image'].name,
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
          setRangeText('');
          setTotalPages(0);
          setPdfPassword(undefined);
          setNeedsPassword(false);
          setIncorrectPassword(false);
        }}
        onRemoveFile={() => {
          abortRef.current?.abort();
          setItems([]);
          setImages([]);
          setSelectedPages([]);
          setRangeText('');
          setTotalPages(0);
          setPdfPassword(undefined);
          setNeedsPassword(false);
          setIncorrectPassword(false);
        }}
        supportedLabel="PDF"
        onValidationError={(msg) => onNotify('error', msg)}
        onInfo={(msg) => onNotify('info', msg)}
        confirmLargeFileBytes={100 * 1024 * 1024}
        uploadProgress={progress}
        onCancelProcessing={() => abortRef.current?.abort()}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          {needsPassword && (
            <PdfPasswordPrompt
              t={t}
              mode="unlock"
              incorrectPassword={incorrectPassword}
              fileName={activeFile.name}
              onUnlock={(pw) => {
                setPdfPassword(pw);
                void runExport(pw);
              }}
            />
          )}

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

            {totalPages > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPages(Array.from({length: totalPages}, (_, i) => i + 1));
                    setRangeText(`1-${totalPages}`);
                    setImages([]);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t.selectAll}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPages([]);
                    setRangeText('');
                    setImages([]);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {t.deselectAll}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">{t.imgSelectPagesHint}</p>
            {totalPages > 0 && selectedPages.length === 0 && rangeText.trim() === '' && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {t.imgExportingAllPages}
              </span>
            )}
          </div>

          <PdfThumbnailGrid
            file={activeFile}
            t={t}
            mode="select"
            selectedPages={selectedPages}
            onTogglePage={handleTogglePage}
            password={pdfPassword}
            onPasswordUnlocked={(pw) => setPdfPassword(pw)}
            onPageCountLoaded={(count) => {
              setTotalPages(count);
              setSelectedPages((prev) =>
                prev.length === 0 ? Array.from({length: count}, (_, i) => i + 1) : prev
              );
              setRangeText((prev) => (prev === '' && count > 0 ? `1-${count}` : prev));
            }}
            onLoadError={(msg) => onNotify('error', msg)}
          />

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={progress !== null || totalPages === 0}
              onClick={() => void runExport()}
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
                    <BlobCanvasPreview
                      blob={img.blob}
                      ariaLabel={img.fileName}
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
