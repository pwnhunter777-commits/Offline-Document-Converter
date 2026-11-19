import React, {useState} from 'react';
import {
  Database,
  Globe,
  Info,
  Monitor,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';
import type {TranslationDictionary} from '../i18n/translations';
import type {LanguageCode, ThemeMode} from '../types';
import {ConfirmDialog} from './ConfirmDialog';
import {PWAInstallButton} from './PWAInstallButton';

interface SettingsViewProps {
  t: TranslationDictionary;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  historyCount: number;
  onClearHistory: () => Promise<void>;
  onClearCachedData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  t,
  theme,
  onThemeChange,
  language,
  onLanguageChange,
  historyCount,
  onClearHistory,
  onClearCachedData,
}) => {
  const {isInstalled} = usePWAInstall();
  const [confirmAction, setConfirmAction] = useState<'history' | 'cache' | null>(null);

  const themes: {id: ThemeMode; label: string; icon: React.ComponentType<{className?: string}>}[] = [
    {id: 'light', label: t.themeLight, icon: Sun},
    {id: 'dark', label: t.themeDark, icon: Moon},
    {id: 'system', label: t.themeSystem, icon: Monitor},
  ];

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          {t.settingsTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t.settingsSubtitle}</p>
      </div>

      {/* Appearance & Language */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-6">
        <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
          {t.settingsAppearance}
        </h2>

        <div className="space-y-2.5">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.themeLabel}
          </label>
          <div className="grid grid-cols-3 gap-2.5 max-w-md">
            {themes.map((item) => {
              const Icon = item.icon;
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onThemeChange(item.id)}
                  className={`min-h-[44px] px-3 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t.languageLabel}</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5 max-w-md">
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                language === 'en'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.languageEnglish}
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('ta')}
              className={`min-h-[44px] px-4 py-2 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                language === 'ta'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.languageTamil}
            </button>
          </div>
        </div>
      </div>

      {/* Local Storage & PWA Installation */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            {t.settingsDataTitle}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {t.settingsClearHistoryBtn} (<span className="font-mono tabular-nums">{historyCount}</span>)
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.settingsClearHistoryDesc}
            </p>
          </div>
          <button
            type="button"
            disabled={historyCount === 0}
            onClick={() => setConfirmAction('history')}
            className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.historyClearAll}</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {t.settingsClearCacheBtn}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.settingsClearCacheDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setConfirmAction('cache')}
            className="inline-flex items-center justify-center gap-2 min-h-[42px] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>{t.settingsClearCacheBtn}</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {isInstalled ? t.settingsInstalledStatus : t.installApp}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t.onlineReadyLabel}
              </p>
            </div>
          </div>
          <PWAInstallButton t={t} variant="full" />
        </div>
      </div>

      {/* Privacy & About */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {t.settingsPrivacyTitle}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.settingsPrivacyBody}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-3">
          <Info className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {t.settingsAboutTitle}
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {t.settingsAboutBody}
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {t.settingsVersionLabel}: 1.0.0 · PWA
            </p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        message={
          confirmAction === 'history' ? t.historyClearConfirm : t.settingsClearCacheConfirm
        }
        t={t}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction;
          setConfirmAction(null);
          if (action === 'history') {
            void onClearHistory();
          } else if (action === 'cache') {
            void onClearCachedData();
          }
        }}
      />
    </section>
  );
};
