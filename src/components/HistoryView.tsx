import React, {useState} from 'react';
import {AlertTriangle, CheckCircle2, Clock, Search, Trash2, XCircle} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';
import type {HistoryRecord, LanguageCode, ToolId} from '../types';
import {TOOL_DEFINITIONS} from '../types';
import {formatBytes, formatDateTime} from '../utils/format';
import {ConfirmDialog} from './ConfirmDialog';

interface HistoryViewProps {
  t: TranslationDictionary;
  language: LanguageCode;
  records: HistoryRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onOpenTools: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  t,
  language,
  records,
  onDeleteRecord,
  onClearAll,
  onOpenTools,
}) => {
  const [search, setSearch] = useState('');
  const [toolFilter, setToolFilter] = useState<ToolId | 'all'>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const q = search.trim().toLowerCase();
  const filtered = records.filter((rec) => {
    if (toolFilter !== 'all' && rec.toolId !== toolFilter) return false;
    if (!q) return true;
    return (
      rec.fileName.toLowerCase().includes(q) ||
      rec.outputFileName.toLowerCase().includes(q) ||
      rec.conversionType.toLowerCase().includes(q)
    );
  });

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.historyTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t.historySubtitle}
          </p>
        </div>

        {records.length > 0 && (
          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/70 bg-white dark:bg-slate-900 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.historyClearAll}</span>
          </button>
        )}
      </div>

      {/* Filters */}
      {records.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.historySearchPlaceholder}
              className="w-full h-11 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={toolFilter}
            onChange={(e) => setToolFilter(e.target.value as ToolId | 'all')}
            aria-label={t.historyFilterAll}
            className="h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          >
            <option value="all">{t.historyFilterAll}</option>
            {TOOL_DEFINITIONS.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {t.tools[tool.id].name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty or Populated */}
      {records.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900 dark:text-white">
            {t.historyEmptyTitle}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {t.historyEmptyDesc}
          </p>
          <button
            type="button"
            onClick={onOpenTools}
            className="mt-5 inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 cursor-pointer"
          >
            {t.exploreTools}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {t.noSearchResults}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            {t.historyMetadataNote}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">{t.historyColFile}</th>
                  <th className="py-3 px-4">{t.historyColTool}</th>
                  <th className="py-3 px-4 text-right">{t.historyColSize}</th>
                  <th className="py-3 px-4">{t.historyColDate}</th>
                  <th className="py-3 px-4">{t.historyColStatus}</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filtered.map((rec) => {
                  const StatusIcon =
                    rec.status === 'success'
                      ? CheckCircle2
                      : rec.status === 'warning'
                        ? AlertTriangle
                        : XCircle;
                  const statusColor =
                    rec.status === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : rec.status === 'warning'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-rose-600 dark:text-rose-400';
                  const statusText =
                    rec.status === 'success'
                      ? t.statusSuccess
                      : rec.status === 'warning'
                        ? t.statusWarning
                        : t.statusError;

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 max-w-[220px]">
                        <p className="font-medium text-slate-900 dark:text-white truncate">
                          {rec.outputFileName || rec.fileName}
                        </p>
                        {rec.outputFileName && rec.outputFileName !== rec.fileName && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {rec.fileName}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {t.tools[rec.toolId]?.name ?? rec.conversionType}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatBytes(rec.outputSize > 0 ? rec.outputSize : rec.inputSize)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatDateTime(rec.timestamp, language)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusColor}`}>
                          <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{statusText}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(rec.id)}
                          aria-label={t.historyDeleteRecord}
                          title={t.historyDeleteRecord}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmClearOpen}
        message={t.historyClearConfirm}
        t={t}
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          setConfirmClearOpen(false);
          onClearAll();
        }}
      />
    </section>
  );
};
