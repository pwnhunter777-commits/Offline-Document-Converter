import {useCallback, useEffect, useRef, useState} from 'react';
import {Header} from './components/Header';
import {HeroSection} from './components/HeroSection';
import {HistoryView} from './components/HistoryView';
import {QuickFileModal} from './components/QuickFileModal';
import {SettingsView} from './components/SettingsView';
import {ToastContainer} from './components/ToastContainer';
import {type CategoryFilter, ToolGrid} from './components/ToolGrid';
import {ToolWorkspace} from './components/tools/ToolWorkspace';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {TRANSLATIONS} from './i18n/translations';
import {
  addHistoryRecord,
  clearHistoryRecords,
  deleteHistoryRecord,
  getHistoryRecords,
} from './services/historyDb';
import {
  TOOL_DEFINITIONS,
  type ActiveView,
  type HistoryRecord,
  type HistoryStatus,
  type LanguageCode,
  type ThemeMode,
  type ToastMessage,
  type ToolId,
} from './types';
import {detectValidFileKind, generateId} from './utils/format';

const THEME_STORAGE_KEY = 'odc-theme';
const LANG_STORAGE_KEY = 'odc-lang';
const TOAST_DURATION_MS = 4500;

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

const VALID_TOOL_IDS = new Set<string>(TOOL_DEFINITIONS.map((t) => t.id));

function parseHashRoute(): {view: ActiveView; toolId?: ToolId} {
  const hash = window.location.hash || '#/';
  if (hash === '#/history') return {view: 'history'};
  if (hash === '#/settings') return {view: 'settings'};
  if (hash.startsWith('#/tool/')) {
    const candidate = hash.slice('#/tool/'.length).split(/[?#]/)[0];
    if (VALID_TOOL_IDS.has(candidate)) {
      return {view: 'tool', toolId: candidate as ToolId};
    }
  }
  return {view: 'dashboard'};
}

function buildHashRoute(view: ActiveView, toolId?: ToolId): string {
  if (view === 'history') return '#/history';
  if (view === 'settings') return '#/settings';
  if (view === 'tool' && toolId) return `#/tool/${toolId}`;
  return '#/';
}

export default function App() {
  const initialRoute = parseHashRoute();
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [language, setLanguage] = useState<LanguageCode>(getInitialLanguage);
  const [activeView, setActiveView] = useState<ActiveView>(initialRoute.view);
  const [activeTool, setActiveTool] = useState<ToolId>(initialRoute.toolId ?? 'image-to-pdf');
  const [preloadedFiles, setPreloadedFiles] = useState<File[]>([]);
  const [quickFiles, setQuickFiles] = useState<File[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const toastTimersRef = useRef<
    Map<string, {timer: ReturnType<typeof setTimeout> | null; remaining: number; startedAt: number}>
  >(new Map());
  const isOnline = useOnlineStatus();
  const t = TRANSLATIONS[language];

  // Sync browser Back/Forward with hash route
  useEffect(() => {
    const handleHashChange = () => {
      const next = parseHashRoute();
      setActiveView(next.view);
      if (next.view === 'tool' && next.toolId) {
        setActiveTool(next.toolId);
      } else {
        setPreloadedFiles([]);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateRoute = useCallback((view: ActiveView, toolId?: ToolId) => {
    const targetHash = buildHashRoute(view, toolId);
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    setActiveView(view);
    if (view === 'tool' && toolId) {
      setActiveTool(toolId);
    }
  }, []);

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
    void getHistoryRecords().then(setHistory).catch(() => {});
  }, []);

  const dismissToast = useCallback((id: string) => {
    const entry = toastTimersRef.current.get(id);
    if (entry?.timer) clearTimeout(entry.timer);
    toastTimersRef.current.delete(id);
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const startToastTimer = useCallback(
    (id: string, duration: number) => {
      const existing = toastTimersRef.current.get(id);
      if (existing?.timer) clearTimeout(existing.timer);
      const startedAt = Date.now();
      const timer = setTimeout(() => {
        dismissToast(id);
      }, duration);
      toastTimersRef.current.set(id, {timer, remaining: duration, startedAt});
    },
    [dismissToast]
  );

  const pauseToast = useCallback((id: string) => {
    const entry = toastTimersRef.current.get(id);
    if (!entry || !entry.timer) return;
    clearTimeout(entry.timer);
    const elapsed = Date.now() - entry.startedAt;
    entry.timer = null;
    entry.remaining = Math.max(800, entry.remaining - elapsed);
  }, []);

  const resumeToast = useCallback(
    (id: string) => {
      const entry = toastTimersRef.current.get(id);
      if (!entry || entry.timer !== null) return;
      startToastTimer(id, entry.remaining);
    },
    [startToastTimer]
  );

  const notify = useCallback(
    (type: ToastMessage['type'], title: string, description?: string) => {
      const id = generateId();
      setToasts((prev) => [...prev, {id, type, title, description}]);
      startToastTimer(id, TOAST_DURATION_MS);
    },
    [startToastTimer]
  );

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
      try {
        const record: HistoryRecord = {
          id: generateId(),
          timestamp: Date.now(),
          ...entry,
        };
        await addHistoryRecord(record);
        setHistory((prev) => [record, ...prev]);
      } catch {
        // Non-fatal if IndexedDB quota is unavailable
      }
    },
    []
  );

  const handleDeleteHistory = async (id: string) => {
    try {
      await deleteHistoryRecord(id);
      setHistory((prev) => prev.filter((r) => r.id !== id));
    } catch {
      notify('error', t.historyActionFailed);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearHistoryRecords();
      setHistory([]);
    } catch {
      notify('error', t.historyActionFailed);
    }
  };

  const handleClearCachedData = async () => {
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

  const handleFullOfflineReset = async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
    }
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
    window.location.reload();
  };

  const handleHeroFileSelection = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const selected = Array.from(fileList);
    const kinds = await Promise.all(selected.map((f) => detectValidFileKind(f)));

    if (kinds.some((k) => k === null)) {
      notify('error', t.invalidFileError);
      return;
    }

    const uniqueKinds = new Set(kinds);
    if (uniqueKinds.size > 1 || (uniqueKinds.has('docx') && selected.length > 1)) {
      notify('error', t.quickSelectMixedError);
      return;
    }

    setQuickFiles(selected);
  };

  const openTool = (toolId: ToolId, files: File[] = []) => {
    setPreloadedFiles(files);
    navigateRoute('tool', toolId);
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
          if (view !== 'tool') setPreloadedFiles([]);
          navigateRoute(view);
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
              category={categoryFilter}
              onCategoryChange={setCategoryFilter}
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
              setPreloadedFiles([]);
              navigateRoute('dashboard');
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
            onOpenTools={() => navigateRoute('dashboard')}
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
            onFullOfflineReset={handleFullOfflineReset}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300">{t.appName}</p>
          <p>{t.slogan}</p>
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
          void handleHeroFileSelection(e.target.files);
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

      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        onPause={pauseToast}
        onResume={resumeToast}
      />
    </div>
  );
}
