import React from 'react';
import {ArrowLeft} from 'lucide-react';
import type {TranslationDictionary} from '../../i18n/translations';
import type {HistoryStatus, ToolId} from '../../types';
import {ToolIcon} from '../ToolIcon';
import {CompressPdfTool} from './CompressPdfTool';
import {ExtractPagesTool} from './ExtractPagesTool';
import {ImageToPdfTool} from './ImageToPdfTool';
import {MergePdfTool} from './MergePdfTool';
import {PdfToImageTool} from './PdfToImageTool';
import {PdfToWordTool} from './PdfToWordTool';
import {RemovePagesTool} from './RemovePagesTool';
import {RotatePdfTool} from './RotatePdfTool';
import {SplitPdfTool} from './SplitPdfTool';
import {WordToPdfTool} from './WordToPdfTool';

interface ToolWorkspaceProps {
  toolId: ToolId;
  initialFiles?: File[];
  t: TranslationDictionary;
  onBack: () => void;
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

export const ToolWorkspace: React.FC<ToolWorkspaceProps> = ({
  toolId,
  initialFiles = [],
  t,
  onBack,
  onRecordHistory,
  onNotify,
}) => {
  const meta = t.tools[toolId];

  const renderTool = () => {
    const props = {t, initialFiles, onRecordHistory, onNotify};
    switch (toolId) {
      case 'image-to-pdf':
        return <ImageToPdfTool {...props} />;
      case 'pdf-to-word':
        return <PdfToWordTool {...props} />;
      case 'word-to-pdf':
        return <WordToPdfTool {...props} />;
      case 'merge-pdf':
        return <MergePdfTool {...props} />;
      case 'split-pdf':
        return <SplitPdfTool {...props} />;
      case 'compress-pdf':
        return <CompressPdfTool {...props} />;
      case 'pdf-to-image':
        return <PdfToImageTool {...props} />;
      case 'rotate-pdf':
        return <RotatePdfTool {...props} />;
      case 'remove-pages':
        return <RemovePagesTool {...props} />;
      case 'extract-pages':
        return <ExtractPagesTool {...props} />;
    }
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 min-h-[40px] px-3 -ml-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.backToTools}</span>
      </button>

      <div className="mt-4 flex items-start gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
          <ToolIcon toolId={toolId} className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {meta.name}
          </h1>
          <p className="mt-1 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {meta.shortDesc}
          </p>
        </div>
      </div>

      <div className="mt-6">{renderTool()}</div>
    </section>
  );
};
