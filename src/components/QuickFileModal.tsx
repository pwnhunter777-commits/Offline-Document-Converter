import React from 'react';
import {ArrowRight, X} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';
import type {ToolId} from '../types';
import {formatBytes} from '../utils/format';
import {ToolIcon} from './ToolIcon';

interface QuickFileModalProps {
  open: boolean;
  files: File[];
  t: TranslationDictionary;
  onClose: () => void;
  onSelectTool: (toolId: ToolId, files: File[]) => void;
}

export const QuickFileModal: React.FC<QuickFileModalProps> = ({
  open,
  files,
  t,
  onClose,
  onSelectTool,
}) => {
  if (!open || files.length === 0) return null;

  const first = files[0];
  const ext = first.name.split('.').pop()?.toLowerCase() ?? '';
  const allImages = files.every((f) =>
    ['jpg', 'jpeg', 'png', 'webp'].includes(f.name.split('.').pop()?.toLowerCase() ?? '')
  );
  const allPdfs = files.every(
    (f) => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf'
  );
  const isDocx = ext === 'docx';

  let candidateTools: ToolId[] = [];
  if (allImages) {
    candidateTools = ['image-to-pdf'];
  } else if (isDocx && files.length === 1) {
    candidateTools = ['word-to-pdf'];
  } else if (allPdfs && files.length > 1) {
    candidateTools = ['merge-pdf'];
  } else if (allPdfs && files.length === 1) {
    candidateTools = [
      'pdf-to-word',
      'pdf-to-image',
      'compress-pdf',
      'split-pdf',
      'rotate-pdf',
      'remove-pages',
      'extract-pages',
    ];
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              {t.quickSelectTitle}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {files.length === 1
                ? `${first.name} (${formatBytes(first.size)})`
                : `${files.length} files selected`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {candidateTools.length === 0 ? (
          <div className="mt-5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-4 text-sm text-rose-800 dark:text-rose-200">
            {t.invalidFileError}
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto">
            {candidateTools.map((toolId) => (
              <button
                key={toolId}
                type="button"
                onClick={() => onSelectTool(toolId, files)}
                className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/40 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <ToolIcon toolId={toolId} className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                    {t.tools[toolId].name}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
