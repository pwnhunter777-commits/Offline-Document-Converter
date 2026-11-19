import React from 'react';
import {ArrowDown, Cpu, FolderOpen, Lock, Sparkles, WifiOff} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';

interface HeroSectionProps {
  t: TranslationDictionary;
  onExploreTools: () => void;
  onSelectFiles: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  t,
  onExploreTools,
  onSelectFiles,
}) => {
  const indicators = [
    {icon: Cpu, label: t.privacyInd1},
    {icon: WifiOff, label: t.privacyInd2},
    {icon: Lock, label: t.privacyInd3},
    {icon: Sparkles, label: t.privacyInd4},
  ];

  return (
    <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
        <div className="max-w-3xl">
          <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 tracking-wide">
            {t.slogan}
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white text-balance leading-[1.12]">
            {t.heroTitle}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            {t.heroDescription}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onExploreTools}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.exploreTools}</span>
              <ArrowDown className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onSelectFiles}
              className="inline-flex items-center justify-center gap-2 min-h-[46px] px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t.selectFiles}</span>
            </button>
          </div>
        </div>

        {/* 4-column privacy proof strip */}
        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {indicators.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
