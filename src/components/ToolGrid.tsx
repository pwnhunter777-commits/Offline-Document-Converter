import React from 'react';
import {ArrowRight, Search, X} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';
import {TOOL_DEFINITIONS, type ToolId} from '../types';
import {ToolIcon} from './ToolIcon';

export type CategoryFilter = 'all' | 'convert' | 'organize' | 'optimize';

interface ToolGridProps {
  t: TranslationDictionary;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  category: CategoryFilter;
  onCategoryChange: (c: CategoryFilter) => void;
  onSelectTool: (toolId: ToolId) => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  t,
  searchQuery,
  onSearchChange,
  category,
  onCategoryChange,
  onSelectTool,
}) => {
  const query = searchQuery.trim().toLowerCase();

  const filteredTools = TOOL_DEFINITIONS.filter((tool) => {
    if (category !== 'all' && tool.category !== category) return false;
    if (!query) return true;
    const copy = t.tools[tool.id];
    return (
      copy.name.toLowerCase().includes(query) ||
      copy.shortDesc.toLowerCase().includes(query) ||
      tool.id.toLowerCase().includes(query)
    );
  });

  const filters: {id: CategoryFilter; label: string}[] = [
    {id: 'all', label: t.filterAll},
    {id: 'convert', label: t.filterConvert},
    {id: 'organize', label: t.filterOrganize},
    {id: 'optimize', label: t.filterOptimize},
  ];

  return (
    <section id="tools-directory" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t.allToolsHeading}
          </h2>
          <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
            {t.allToolsSubheading}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Mobile search input */}
          <div className="relative md:hidden">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label={t.clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Interactive segmented filter control */}
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/90 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onCategoryChange(f.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === f.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredTools.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.noSearchResults}</p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onCategoryChange('all');
            }}
            className="mt-4 inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 cursor-pointer"
          >
            {t.clearSearch}
          </button>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredTools.map((tool) => {
            const copy = t.tools[tool.id];
            return (
              <div
                key={tool.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ToolIcon toolId={tool.id} className="w-5 h-5" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-slate-900 dark:text-white">
                    {copy.name}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {copy.shortDesc}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => onSelectTool(tool.id)}
                    className="w-full min-h-[42px] inline-flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors cursor-pointer"
                  >
                    <span>{t.openTool}</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
