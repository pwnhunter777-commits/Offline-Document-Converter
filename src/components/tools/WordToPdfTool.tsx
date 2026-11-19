import React, {useEffect, useState} from 'react';
import {CheckCircle2, Download, Loader2} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import {convertWordHtmlToPdf, extractWordPreview} from '../../services/converters/wordToPdf';
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

export const WordToPdfTool: React.FC<ToolProps> = ({
  t,
  initialFiles = [],
  onRecordHistory,
  onNotify,
}) => {
  const [items, setItems] = useState<UploadedFileItem[]>([]);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const loadDocx = async (file: File) => {
    setLoadingPreview(true);
    setResultBlob(null);
    try {
      const res = await extractWordPreview(file);
      setPreviewHtml(res.html);
    } catch {
      onNotify('error', t.corruptedFileError);
      setItems([]);
      setPreviewHtml('');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (initialFiles.length > 0) {
      const file = initialFiles[0];
      setItems([{id: generateId(), file}]);
      void loadDocx(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiles]);

  const activeFile = items[0]?.file ?? null;
  const outputName = activeFile ? `${stripExtension(activeFile.name)}.pdf` : 'document.pdf';

  const handleConvert = async () => {
    if (!activeFile) {
      onNotify('error', t.noFilesSelected);
      return;
    }
    setProgress(10);
    setResultBlob(null);

    try {
      const blob = await convertWordHtmlToPdf(previewHtml, (p) => setProgress(p));
      setResultBlob(blob);

      await onRecordHistory({
        fileName: activeFile.name,
        outputFileName: outputName,
        toolId: 'word-to-pdf',
        conversionType: t.tools['word-to-pdf'].name,
        inputSize: activeFile.size,
        outputSize: blob.size,
        status: 'success',
      });

      onNotify('success', t.readyToDownload, `${outputName} (${formatBytes(blob.size)})`);
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
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        expectedKind="docx"
        multiple={false}
        files={items}
        onFilesAdded={(files) => {
          setItems([{id: generateId(), file: files[0]}]);
          void loadDocx(files[0]);
        }}
        onRemoveFile={() => {
          setItems([]);
          setPreviewHtml('');
          setResultBlob(null);
        }}
        supportedLabel="DOCX"
        onValidationError={(msg) => onNotify('error', msg)}
        uploadProgress={progress}
      />

      {activeFile && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t.wordToPdfPreviewTitle}
            </h3>
            {loadingPreview && (
              <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.loadingPreviews}
              </span>
            )}
          </div>

          <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white text-slate-900 p-6 sm:p-8 shadow-inner">
            <div
              className="prose prose-sm max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_img]:max-w-full [&_img]:my-3"
              dangerouslySetInnerHTML={{__html: previewHtml || '<p>—</p>'}}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loadingPreview || progress !== null}
              onClick={handleConvert}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {progress !== null && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{t.tools['word-to-pdf'].actionLabel}</span>
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
