import React from 'react';
import {
  FileCheck2,
  FileImage,
  FileMinus2,
  FileOutput,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  Images,
  Minimize2,
  RotateCw,
  Scissors,
} from 'lucide-react';
import type {ToolId} from '../types';

export const ToolIcon: React.FC<{toolId: ToolId; className?: string}> = ({
  toolId,
  className = 'w-5 h-5',
}) => {
  switch (toolId) {
    case 'image-to-pdf':
      return <Images className={className} />;
    case 'pdf-to-word':
      return <FileText className={className} />;
    case 'word-to-pdf':
      return <FileCheck2 className={className} />;
    case 'merge-pdf':
      return <FilePlus2 className={className} />;
    case 'split-pdf':
      return <Scissors className={className} />;
    case 'compress-pdf':
      return <Minimize2 className={className} />;
    case 'pdf-to-image':
      return <FileImage className={className} />;
    case 'rotate-pdf':
      return <RotateCw className={className} />;
    case 'remove-pages':
      return <FileMinus2 className={className} />;
    case 'extract-pages':
      return <FileOutput className={className} />;
    default:
      return <FileSpreadsheet className={className} />;
  }
};
