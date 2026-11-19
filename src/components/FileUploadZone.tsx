import React, {useRef, useState} from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  File as FileIcon,
  FileText,
  Image as ImageIcon,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';
import {formatBytes, verifyFileSignature} from '../utils/format';

export interface UploadedFileItem {
  id: string;
  file: File;
}

interface FileUploadZoneProps {
  t: TranslationDictionary;
  accept: string;
  expectedKind: 'pdf' | 'docx' | 'image';
  multiple?: boolean;
  files: UploadedFileItem[];
  onFilesAdded: (newFiles: File[]) => void;
  onRemoveFile: (id: string) => void;
  onMoveFile?: (index: number, direction: -1 | 1) => void;
  onClearAll?: () => void;
  supportedLabel: string;
  reorderHint?: string;
  onValidationError: (message: string) => void;
  uploadProgress?: number | null;
}

const LARGE_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  t,
  accept,
  expectedKind,
  multiple = false,
  files,
  onFilesAdded,
  onRemoveFile,
  onMoveFile,
  onClearAll,
  supportedLabel,
  reorderHint,
  onValidationError,
  uploadProgress = null,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndEmit = async (rawList: FileList | null) => {
    if (!rawList || rawList.length === 0) return;
    const candidates = Array.from(rawList);
    const selected = multiple ? candidates : [candidates[0]];
    const valid: File[] = [];

    for (const file of selected) {
      if (file.size === 0) {
        onValidationError(`${file.name}: ${t.corruptedFileError}`);
        continue;
      }
      const ok = await verifyFileSignature(file, expectedKind);
      if (!ok) {
        onValidationError(`${file.name}: ${t.invalidFileError}`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length > 0) {
      onFilesAdded(valid);
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const hasLargeFile = files.some((item) => item.file.size > LARGE_FILE_BYTES);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void validateAndEmit(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-colors cursor-pointer select-none ${
          isDragging
            ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/40'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => void validateAndEmit(e.target.files)}
        />

        <div className="mx-auto w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>

        <p className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
          {multiple ? t.dropzoneTitleMulti : t.dropzoneTitle}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <span className="inline-flex items-center justify-center min-h-[42px] px-5 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">
            {t.browseFiles}
          </span>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {t.supportedFormatsLabel}: <span className="font-mono text-slate-700 dark:text-slate-300">{supportedLabel}</span>
        </p>
      </div>

      {/* Privacy assurance line */}
      <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 px-1">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>{t.localPrivacyBanner}</span>
      </div>

      {/* Large file warning */}
      {hasLargeFile && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>{t.largeFileWarning}</span>
        </div>
      )}

      {/* Progress bar when active */}
      {uploadProgress !== null && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-200 mb-2">
            <span>{t.processing}</span>
            <span className="font-mono tabular-nums">{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-150"
              style={{width: `${Math.max(4, Math.min(100, uploadProgress))}%`}}
            />
          </div>
        </div>
      )}

      {/* Uploaded file list */}
      {files.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                {files.length}
              </span>{' '}
              {reorderHint && <span className="hidden sm:inline">· {reorderHint}</span>}
            </div>
            {onClearAll && files.length > 1 && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                {t.clearAll}
              </button>
            )}
          </div>

          {files.map((item, idx) => (
            <div key={item.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                {expectedKind === 'image' ? (
                  <ImageIcon className="w-5 h-5" />
                ) : expectedKind === 'pdf' ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <FileIcon className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                  {formatBytes(item.file.size)}
                  {multiple ? ` · #${idx + 1}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onMoveFile && files.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveFile(idx, -1)}
                      aria-label={t.moveUp}
                      title={t.moveUp}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => onMoveFile(idx, 1)}
                      aria-label={t.moveDown}
                      title={t.moveDown}
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => onRemoveFile(item.id)}
                  aria-label={t.removeFile}
                  title={t.removeFile}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
