import React, {useEffect, useRef, useState} from 'react';
import {Check, Eye, Loader2, Plus, Trash2, X} from 'lucide-react';
import {useAccessibleDialog} from '../hooks/useAccessibleDialog';
import type {TranslationDictionary} from '../i18n/translations';
import {
  destroyPdfDocument,
  loadPdfDocument,
  PdfPasswordError,
  renderPdfPageToCanvas,
  yieldToMainThread,
} from '../services/pdfEngine';
import {PdfPasswordPrompt} from './PdfPasswordPrompt';

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
  allowPasswordUnlock?: boolean;
  password?: string;
  onPasswordUnlocked?: (password: string) => void;
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
  allowPasswordUnlock = true,
  password: externalPassword,
  onPasswordUnlocked,
}) => {
  const [thumbnails, setThumbnails] = useState<PageThumbnailItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [visibleLimit, setVisibleLimit] = useState<number>(maxPreviewLimit);
  const [loading, setLoading] = useState<boolean>(true);
  const [zoomPage, setZoomPage] = useState<PageThumbnailItem | null>(null);
  const [zoomHiResCanvas, setZoomHiResCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loadingZoomHiRes, setLoadingZoomHiRes] = useState<boolean>(false);
  const [passwordNeeded, setPasswordNeeded] = useState<boolean>(false);
  const [incorrectPassword, setIncorrectPassword] = useState<boolean>(false);
  const [localPassword, setLocalPassword] = useState<string | undefined>(externalPassword);

  const renderedCountRef = useRef(0);
  const thumbnailsRef = useRef<PageThumbnailItem[]>([]);
  const zoomPanelRef = useRef<HTMLDivElement>(null);

  const activePassword = externalPassword !== undefined ? externalPassword : localPassword;

  useAccessibleDialog(zoomPage !== null, () => setZoomPage(null), zoomPanelRef);

  // Reset pagination & password state when file changes
  useEffect(() => {
    setThumbnails([]);
    thumbnailsRef.current = [];
    renderedCountRef.current = 0;
    setTotalPages(0);
    setVisibleLimit(maxPreviewLimit);
    setZoomPage(null);
    setZoomHiResCanvas(null);
    setPasswordNeeded(false);
    setIncorrectPassword(false);
    setLocalPassword(externalPassword);
  }, [file, maxPreviewLimit]);

  useEffect(() => {
    let cancelled = false;

    const renderThumbs = async () => {
      setLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await loadPdfDocument(buffer, activePassword);
        if (cancelled) {
          await destroyPdfDocument(pdfDoc);
          return;
        }

        setPasswordNeeded(false);
        setIncorrectPassword(false);
        if (activePassword) {
          onPasswordUnlocked?.(activePassword);
        }

        const count = pdfDoc.numPages;
        setTotalPages(count);
        onPageCountLoaded?.(count);

        const targetEnd = Math.min(count, visibleLimit);
        const startPage = renderedCountRef.current + 1;
        const batch = [...thumbnailsRef.current];

        for (let p = startPage; p <= targetEnd; p++) {
          if (cancelled) break;
          const renderedCanvas = await renderPdfPageToCanvas(pdfDoc, p, 0.55);
          batch.push({pageNumber: p, sourceCanvas: renderedCanvas});
          renderedCountRef.current = p;
          if (p % 4 === 0 || p === targetEnd) {
            if (!cancelled) {
              thumbnailsRef.current = [...batch];
              setThumbnails(thumbnailsRef.current);
            }
          }
          await yieldToMainThread();
        }
        await destroyPdfDocument(pdfDoc);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof PdfPasswordError) {
            setPasswordNeeded(true);
            setIncorrectPassword(err.incorrect);
            onLoadError?.(err.incorrect ? t.passwordIncorrectError : t.passwordProtectedTitle);
          } else {
            onLoadError?.(t.corruptedFileError);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void renderThumbs();
    return () => {
      cancelled = true;
    };
  }, [file, visibleLimit, activePassword]);

  // Re-render zoomed page at crisp 1.5x scale instead of scaling up the 0.55x thumbnail
  useEffect(() => {
    if (!zoomPage) {
      setZoomHiResCanvas(null);
      setLoadingZoomHiRes(false);
      return;
    }

    let cancelled = false;
    setZoomHiResCanvas(null);
    setLoadingZoomHiRes(true);

    const renderHighRes = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const pdfDoc = await loadPdfDocument(buffer, activePassword);
        if (cancelled) {
          await destroyPdfDocument(pdfDoc);
          return;
        }
        const hiCanvas = await renderPdfPageToCanvas(pdfDoc, zoomPage.pageNumber, 1.5);
        await destroyPdfDocument(pdfDoc);
        if (!cancelled) {
          setZoomHiResCanvas(hiCanvas);
        }
      } catch {
        // Fallback smoothly to thumbnail canvas already shown
      } finally {
        if (!cancelled) setLoadingZoomHiRes(false);
      }
    };

    void renderHighRes();
    return () => {
      cancelled = true;
    };
  }, [zoomPage, file, activePassword]);

  const selectedSet = new Set(selectedPages);
  const shownCount = thumbnails.length;
  const hasMorePages = totalPages > shownCount;

  if (passwordNeeded) {
    return (
      <PdfPasswordPrompt
        t={t}
        mode={allowPasswordUnlock ? 'unlock' : 'unsupported'}
        incorrectPassword={incorrectPassword}
        fileName={file.name}
        onUnlock={(pw) => {
          setLocalPassword(pw);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            {t.totalPages}:{' '}
            <strong className="font-mono tabular-nums text-slate-900 dark:text-white">
              {totalPages}
            </strong>
          </span>
          {totalPages > 0 && totalPages > visibleLimit && (
            <span className="text-slate-500 dark:text-slate-400">
              {t.showingPagesPrefix}{' '}
              <strong className="font-mono tabular-nums">{Math.min(shownCount, totalPages)}</strong>{' '}
              {t.showingPagesOf}{' '}
              <strong className="font-mono tabular-nums">{totalPages}</strong>{' '}
              {t.showingPagesSuffix}
            </span>
          )}
        </div>
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

      {!loading && hasMorePages && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t.showingPagesPrefix}{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {shownCount}
            </span>{' '}
            {t.showingPagesOf}{' '}
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
              {totalPages}
            </span>{' '}
            {t.showingPagesSuffix}
          </p>
          <button
            type="button"
            onClick={() => setVisibleLimit((prev) => prev + maxPreviewLimit)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-500 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.loadMorePages}</span>
          </button>
        </div>
      )}

      {/* High-res zoom preview modal */}
      {zoomPage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
          onClick={() => setZoomPage(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-zoom-modal-title"
        >
          <div
            ref={zoomPanelRef}
            tabIndex={-1}
            className="relative max-w-2xl w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  id="pdf-zoom-modal-title"
                  className="text-sm font-semibold text-slate-900 dark:text-white font-mono tabular-nums"
                >
                  {t.pageNumber} {zoomPage.pageNumber} / {totalPages}
                </span>
                {loadingZoomHiRes && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
                )}
              </div>
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
                sourceCanvas={zoomHiResCanvas ?? zoomPage.sourceCanvas}
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
