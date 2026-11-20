import React, {useRef, useState} from 'react';
import {Download, X} from 'lucide-react';
import {useAccessibleDialog} from '../hooks/useAccessibleDialog';
import {usePWAInstall} from '../hooks/usePWAInstall';
import type {TranslationDictionary} from '../i18n/translations';

interface PWAInstallButtonProps {
  t: TranslationDictionary;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({t, variant = 'compact'}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [showGuide, setShowGuide] = useState<'ios' | 'desktop' | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useAccessibleDialog(showGuide !== null, () => setShowGuide(null), panelRef);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        aria-label={t.installApp}
        title={t.installApp}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          variant === 'full' ? 'px-4 py-2.5 text-sm min-h-[44px]' : 'px-2.5 sm:px-3 py-2 text-xs min-h-[40px]'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>{t.installApp}</span>
      </button>
    );
  }

  // Show guide button on iOS (WebKit lacks beforeinstallprompt) or in full Settings view
  if (!isIOS && variant !== 'full') {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(isIOS ? 'ios' : 'desktop')}
        aria-label={isIOS ? t.installOnIOS : t.installApp}
        title={isIOS ? t.installOnIOS : t.installApp}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          variant === 'full' ? 'px-4 py-2.5 text-sm min-h-[44px]' : 'px-2.5 sm:px-3 py-2 text-xs min-h-[40px]'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span className={variant === 'compact' ? 'hidden sm:inline' : ''}>
          {isIOS ? t.installOnIOS : t.installApp}
        </span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-guide-title"
          onClick={() => setShowGuide(null)}
        >
          <div
            ref={panelRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-xl outline-none"
          >
            <div className="flex items-start justify-between gap-4">
              <h3 id="pwa-install-guide-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                {showGuide === 'ios' ? t.iosInstallTitle : t.desktopInstallTitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(null)}
                aria-label={t.close}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
              <li>{showGuide === 'ios' ? t.iosInstallStep1 : t.desktopInstallStep1}</li>
              <li>{showGuide === 'ios' ? t.iosInstallStep2 : t.desktopInstallStep2}</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowGuide(null)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
