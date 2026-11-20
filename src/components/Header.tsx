import React, {useState} from 'react';
import {
  Clock,
  FileText,
  Globe,
  Grid,
  Monitor,
  Moon,
  Search,
  Settings,
  Sun,
  WifiOff,
  X,
} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';
import type {ActiveView, LanguageCode, ThemeMode} from '../types';
import {PWAInstallButton} from './PWAInstallButton';

interface HeaderProps {
  t: TranslationDictionary;
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  language: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  t,
  activeView,
  onNavigate,
  searchQuery,
  onSearchChange,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  isOnline,
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const cycleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    onThemeChange(next);
  };

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const themeText =
    theme === 'dark' ? t.themeDark : theme === 'light' ? t.themeLight : t.themeSystem;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Zone 1: Brand mark */}
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-left min-w-0 shrink cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded-lg"
          >
            <span className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </span>
            <span className="font-display font-bold text-sm sm:text-lg tracking-tight text-slate-900 dark:text-white whitespace-nowrap truncate max-w-[130px] sm:max-w-none">
              {t.appName}
            </span>
          </button>

          {/* Zone 2: Desktop nav + tool search */}
          <div className="hidden md:flex items-center gap-6 flex-1 min-w-0 justify-center">
            <nav className="flex items-center gap-5 text-sm font-medium">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeView === 'dashboard' || activeView === 'tool'
                    ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.navTools}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeView === 'history'
                    ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.navHistory}
              </button>
              <button
                type="button"
                onClick={() => onNavigate('settings')}
                className={`py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  activeView === 'settings'
                    ? 'text-blue-600 dark:text-blue-400 underline underline-offset-8 decoration-2'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.navSettings}
              </button>
            </nav>

            <div className="relative w-full max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeView !== 'dashboard') {
                    onNavigate('dashboard');
                  }
                }}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  aria-label={t.clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Zone 3: Mobile Search, Language, Theme, Settings & Install */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              aria-label={t.searchPlaceholder}
              aria-expanded={mobileSearchOpen}
              className={`md:hidden inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg border transition-colors shrink-0 cursor-pointer ${
                mobileSearchOpen
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onLanguageChange(language === 'en' ? 'ta' : 'en')}
              aria-label={t.languageLabel}
              title={t.languageLabel}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{language === 'en' ? 'EN' : 'தமிழ்'}</span>
            </button>

            <button
              type="button"
              onClick={cycleTheme}
              aria-label={`${t.themeLabel}: ${themeText}`}
              title={`${t.themeLabel}: ${themeText}`}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ThemeIcon className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
              <span className="hidden lg:inline">{themeText}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('settings')}
              aria-label={t.navSettings}
              title={t.navSettings}
              className={`hidden sm:inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg border transition-colors shrink-0 cursor-pointer ${
                activeView === 'settings'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
            </button>

            <PWAInstallButton t={t} />
          </div>
        </div>

        {/* Expandable mobile search bar */}
        {mobileSearchOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  if (activeView !== 'dashboard') {
                    onNavigate('dashboard');
                  }
                }}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchPlaceholder}
                className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
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
          </div>
        )}

        {/* Real Offline Indicator Banner (shown strictly when navigator.onLine is false) */}
        {!isOnline && (
          <div className="border-t border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/60 px-4 py-1.5 text-center text-xs font-medium text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2">
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>{t.offlineBanner}</span>
          </div>
        )}
      </header>

      {/* Mobile Bottom Navigation Bar (<= 15% mobile viewport cap with compact 56px height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md grid grid-cols-3"
      >
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeView === 'dashboard' || activeView === 'tool'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Grid className="w-5 h-5" />
          <span>{t.navTools}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('history')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeView === 'history'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span>{t.navHistory}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium cursor-pointer ${
            activeView === 'settings'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>{t.navSettings}</span>
        </button>
      </nav>
    </>
  );
};
