export type ToolId =
  | 'image-to-pdf'
  | 'pdf-to-word'
  | 'word-to-pdf'
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'pdf-to-image'
  | 'rotate-pdf'
  | 'remove-pages'
  | 'extract-pages';

export type ActiveView = 'dashboard' | 'tool' | 'history' | 'settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export type LanguageCode = 'en' | 'ta';

export type HistoryStatus = 'success' | 'warning' | 'error';

export interface HistoryRecord {
  id: string;
  fileName: string;
  outputFileName: string;
  toolId: ToolId;
  conversionType: string;
  inputSize: number;
  outputSize: number;
  timestamp: number;
  status: HistoryStatus;
  note?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
}

export interface ToolDefinition {
  id: ToolId;
  category: 'convert' | 'organize' | 'optimize';
  accepts: string;
  multiple: boolean;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {id: 'image-to-pdf', category: 'convert', accepts: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp', multiple: true},
  {id: 'pdf-to-word', category: 'convert', accepts: '.pdf,application/pdf', multiple: false},
  {id: 'word-to-pdf', category: 'convert', accepts: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document', multiple: false},
  {id: 'merge-pdf', category: 'organize', accepts: '.pdf,application/pdf', multiple: true},
  {id: 'split-pdf', category: 'organize', accepts: '.pdf,application/pdf', multiple: false},
  {id: 'compress-pdf', category: 'optimize', accepts: '.pdf,application/pdf', multiple: false},
  {id: 'pdf-to-image', category: 'convert', accepts: '.pdf,application/pdf', multiple: false},
  {id: 'rotate-pdf', category: 'organize', accepts: '.pdf,application/pdf', multiple: false},
  {id: 'remove-pages', category: 'organize', accepts: '.pdf,application/pdf', multiple: false},
  {id: 'extract-pages', category: 'organize', accepts: '.pdf,application/pdf', multiple: false},
];
