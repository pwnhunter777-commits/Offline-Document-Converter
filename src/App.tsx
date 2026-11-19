import {useCallback, useEffect, useRef, useState} from 'react';
import {Header} from './components/Header';
import {HeroSection} from './components/HeroSection';
import {HistoryView} from './components/HistoryView';
import {QuickFileModal} from './components/QuickFileModal';
import {SettingsView} from './components/SettingsView';
import {ToastContainer} from './components/ToastContainer';
import {ToolGrid} from './components/ToolGrid';
import {ToolWorkspace} from './components/tools/ToolWorkspace';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {TRANSLATIONS} from './i18n/translations';
import {
  addHistoryRecord,
  clearHistoryRecords,
  deleteHistoryRecord,
  getHistoryRecords,
} from './services/historyDb';
import type {
  ActiveView,
  HistoryRecord,
  HistoryStatus,
  LanguageCode,
  ThemeMode,
  ToastMessage,
  ToolId,
} from './types';
import {generateId} from './utils/format';

const THEME_STORAGE_KEY = 'odc-theme';
const LANG_STORAGE_KEY = 'odc-lang';

function getInitialTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // ignore
  }
  return 'system';
}

function getInitialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'ta') return saved;
  } catch {
    // ignore
  }
  return 'en';
}

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage);
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [activeTool, setActiveTool] = useState<ToolId>('image-to-pdf');
  const [preloadedFiles, setPreloadedFiles] = useState<File[]>([]);
  const [quickFiles, setQuickFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const isOnline = useOnlineStatus();
  const t = TRANSLATIONS[language];

  // Apply Light / Dark / System theme cleanly
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyClass = () => {
      const shouldBeDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', shouldBeDark);
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute('content', shouldBeDark ? '#0f172a' : '#2563eb');
      }
    };

    applyClass();
    mediaQuery.addEventListener('change', applyClass);
    return () => mediaQuery.removeEventListener('change', applyClass);
  }, [theme]);

  // Persist language
  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // ignore
    }
    document.documentElement.lang = language;
  }, [language]);

  // Load IndexedDB conversion metadata history
  useEffect(() => {
    void getHistoryRecords().then(setHistory);
  }, []);

  const notify = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = generateId();
      setToasts((prev) => [...prev, {id, type, title, description}]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleRecordHistory = useCallback(
    async (entry: {
      fileName: string;
      outputFileName: string;
      toolId: ToolId;
      conversionType: string;
      inputSize: number;
      outputSize: number;
      status: HistoryStatus;
      note?: string;
    }) => {
      const record: HistoryRecord = {
        id: generateId(),
        timestamp: Date.now(),
        ...entry,
      };
      await addHistoryRecord(record);
      setHistory((prev) => [record, ...prev]);
    },
    []
  );

  const handleDeleteHistory = async (id: string) => {
    await deleteHistoryRecord(id);
    setHistory((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearHistory = async () => {
    await clearHistoryRecords();
    setHistory([]);
  };

  const handleClearCachedData = async () => {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
      localStorage.removeItem(LANG_STORAGE_KEY);
    } catch {
      // ignore
    }
    setTheme('system');
    setLanguage('en');
    notify('success', t.settingsCacheCleared);
  };

  const openTool = (toolId: ToolId, files: File[] = []) => {
    setActiveTool(toolId);
    setPreloadedFiles(files);
    setActiveView('tool');
    window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const handleExploreTools = () => {
    const el = document.getElementById('tools-directory');
    if (el) {
      el.scrollIntoView({behavior: 'smooth'});
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 md:pb-0">
      <Header
        t={t}
        activeView={activeView}
        onNavigate={(view) => {
          setActiveView(view);
          if (view !== 'tool') setPreloadedFiles([]);
          window.scrollTo({top: 0, behavior: 'smooth'});
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeChange={setTheme}
        isOnline={isOnline}
      />

      <main className="flex-1">
        {activeView === 'dashboard' && (
          <>
            <HeroSection
              t={t}
              onExploreTools={handleExploreTools}
              onSelectFiles={() => heroFileInputRef.current?.click()}
            />
            <ToolGrid
              t={t}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSelectTool={(id) => openTool(id, [])}
            />
          </>
        )}

        {activeView === 'tool' && (
          <ToolWorkspace
            key={activeTool}
            toolId={activeTool}
            initialFiles={preloadedFiles}
            t={t}
            onBack={() => {
              setActiveView('dashboard');
              setPreloadedFiles([]);
            }}
            onRecordHistory={handleRecordHistory}
            onNotify={notify}
          />
        )}

        {activeView === 'history' && (
          <HistoryView
            t={t}
            language={language}
            records={history}
            onDeleteRecord={(id) => void handleDeleteHistory(id)}
            onClearAll={() => void handleClearHistory()}
            onOpenTools={() => setActiveView('dashboard')}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            t={t}
            theme={theme}
            onThemeChange={setTheme}
            language={language}
            onLanguageChange={setLanguage}
            historyCount={history.length}
            onClearHistory={handleClearHistory}
            onClearCachedData={handleClearCachedData}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {t.appName} · {t.slogan}
          </p>
          <p>{t.localPrivacyBanner}</p>
        </div>
      </footer>

      {/* Hidden quick-select file input triggered from Hero */}
      <input
        ref={heroFileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const list = e.target.files;
          if (list && list.length > 0) {
            setQuickFiles(Array.from(list));
          }
          e.target.value = '';
        }}
      />

      <QuickFileModal
        open={quickFiles.length > 0}
        files={quickFiles}
        t={t}
        onClose={() => setQuickFiles([])}
        onSelectTool={(toolId, files) => {
          setQuickFiles([]);
          openTool(toolId, files);
        }}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
