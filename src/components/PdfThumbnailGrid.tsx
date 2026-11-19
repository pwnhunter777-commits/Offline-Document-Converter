import React, {useEffect, useRef, useState} from 'react';
import {Check, Eye, Loader2, Trash2, X} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';
import {destroyPdfDocument, loadPdfDocument, renderPdfPageToCanvas} from '../services/pdfEngine';

export interface PageThumbnailItem {
  pageNumber: number;
  sourceCanvas: HTMLCanvasElement;
}

const CanvasSnapshot: React.FC<{
  sourceCanvas: HTMLCanvasElement;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel: string;
}> = ({sourceCanvas, className, style, ariaLabel}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const dest = canvasRef.current;
    if (!dest) return;
    dest.width = sourceCanvas.width;
    dest.height = sourceCanvas.height;
    const ctx = dest.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, dest.width, dest.height);
    ctx.drawImage(sourceCanvas, 0, 0);
  }, [sourceCanvas]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={ariaLabel}
      role="img"
      className={className}
      style={style}
    />
  );
};

interface PdfThumbnailGridProps {
  file: File;
  t: TranslationDictionary;
  mode?: 'preview' | 'select' | 'remove';
  selectedPages?: number[];
  onTogglePage?: (pageNumber: number) => void;
  rotationDelta?: number;
  rotateTarget?: 'all' | 'selected';
  onPageCountLoaded?: (count: number) => void;
  onLoadError?: (message: string) => void;
  maxPreviewLimit?: number;
}

export const PdfThumbnailGrid: React.FC<PdfThumbnailGridProps> = ({
  file,
  t,
  mode = 'preview',
  selectedPages = [],
  onTogglePage,
  rotationDelta = 0,
  rotateTarget = 'all',
  onPageCountLoaded,
  onLoadError,
  maxPreviewLimit = 60,
}) => {
  const [thumbnails, setThumbnails] = useState<PageThumbnailItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomPage, setZoomPage] = useState<PageThumbnailItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderThumbs = async () => {
      setLoading(true);
      setThumbnails([]);
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await loadPdfDocument(buffer);
        if (cancelled) {
          await destroyPdfDocument(pdfDoc);
          return;
        }

        const count = pdfDoc.numPages;
        setTotalPages(count);
        onPageCountLoaded?.(count);

        const limit = Math.min(count, maxPreviewLimit);
        const batch: PageThumbnailItem[] = [];
        for (let p = 1; p <= limit; p++) {
          if (cancelled) break;
          const renderedCanvas = await renderPdfPageToCanvas(pdfDoc, p, 0.55);
          batch.push({pageNumber: p, sourceCanvas: renderedCanvas});
          if (p % 4 === 0 || p === limit) {
            if (!cancelled) setThumbnails([...batch]);
          }
        }
        await destroyPdfDocument(pdfDoc);
      } catch {
        if (!cancelled) {
          onLoadError?.(t.corruptedFileError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void renderThumbs();
    return () => {
      cancelled = true;
    };
  }, [file, maxPreviewLimit]);

  const selectedSet = new Set(selectedPages);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span>
          {t.totalPages}:{' '}
          <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
            {totalPages}
          </strong>
        </span>
        {loading && (
          <span className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.loadingPreviews}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {thumbnails.map((thumb) => {
          const isSelected = selectedSet.has(thumb.pageNumber);
          const shouldRotate =
            rotationDelta !== 0 &&
            (rotateTarget === 'all' || (rotateTarget === 'selected' && isSelected));

          const borderClass =
            mode === 'remove' && isSelected
              ? 'border-rose-500 ring-2 ring-rose-500/25 bg-rose-50/40 dark:bg-rose-950/30'
              : mode === 'select' && isSelected
                ? 'border-blue-600 ring-2 ring-blue-600/25 bg-blue-50/40 dark:bg-blue-950/30'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400';

          return (
            <div
              key={thumb.pageNumber}
              className={`group relative rounded-xl border p-2 transition-all ${borderClass}`}
            >
              <button
                type="button"
                onClick={() => {
                  if (mode === 'preview') {
                    setZoomPage(thumb);
                  } else {
                    onTogglePage?.(thumb.pageNumber);
                  }
                }}
                className="w-full text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded-lg"
              >
                <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <CanvasSnapshot
                    sourceCanvas={thumb.sourceCanvas}
                    ariaLabel={`${t.pageNumber} ${thumb.pageNumber}`}
                    className={`max-w-full max-h-full object-contain transition-transform duration-200 ${
                      mode === 'remove' && isSelected ? 'opacity-45' : ''
                    }`}
                    style={shouldRotate ? {transform: `rotate(${rotationDelta}deg)`} : undefined}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between px-1">
                  <span className="text-xs font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                    {t.pageNumber} {thumb.pageNumber}
                  </span>
                  {mode !== 'preview' && (
                    <span
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-white ${
                        isSelected
                          ? mode === 'remove'
                            ? 'bg-rose-600'
                            : 'bg-blue-600'
                          : 'border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isSelected &&
                        (mode === 'remove' ? (
                          <Trash2 className="w-3 h-3" />
                        ) : (
                          <Check className="w-3 h-3" />
                        ))}
                    </span>
                  )}
                </div>
              </button>

              {mode !== 'preview' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomPage(thumb);
                  }}
                  title={t.previewLabel}
                  aria-label={`${t.previewLabel} ${thumb.pageNumber}`}
                  className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-900/75 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Zoom preview modal */}
      {zoomPage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          onClick={() => setZoomPage(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                {t.pageNumber} {zoomPage.pageNumber} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setZoomPage(null)}
                aria-label={t.close}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl p-4">
              <CanvasSnapshot
                sourceCanvas={zoomPage.sourceCanvas}
                ariaLabel={`${t.pageNumber} ${zoomPage.pageNumber}`}
                className="max-w-full max-h-[68vh] object-contain rounded shadow"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
