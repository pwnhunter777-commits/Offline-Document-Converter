import React, {useState} from 'react';
import {AlertTriangle, KeyRound, Lock} from 'lucide-react';
import type {TranslationDictionary} from '../i18n/translations';

interface PdfPasswordPromptProps {
  t: TranslationDictionary;
  mode: 'unlock' | 'unsupported';
  incorrectPassword?: boolean;
  onUnlock?: (password: string) => void;
  fileName?: string;
}

export const PdfPasswordPrompt: React.FC<PdfPasswordPromptProps> = ({
  t,
  mode,
  incorrectPassword = false,
  onUnlock,
  fileName,
}) => {
  const [passwordInput, setPasswordInput] = useState('');

  if (mode === 'unsupported') {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-950 dark:text-amber-100 space-y-1">
          <p className="font-semibold">
            {t.passwordProtectedTitle}
            {fileName ? ` (${fileName})` : ''}
          </p>
          <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
            {t.passwordProtectedLibBody}
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    onUnlock?.(passwordInput);
  };

  return (
    <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 p-4 sm:p-5 space-y-3">
      <div className="flex items-start gap-3">
        <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-slate-900 dark:text-white space-y-1">
          <p className="font-semibold">
            {t.passwordProtectedTitle}
            {fileName ? ` — ${fileName}` : ''}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t.passwordProtectedJsBody}
          </p>
        </div>
      </div>

      {incorrectPassword && (
        <div className="flex items-center gap-2 text-xs font-medium text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{t.passwordIncorrectError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <input
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder={t.passwordInputPlaceholder}
          autoComplete="off"
          className="flex-1 h-11 px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={!passwordInput}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Lock className="w-4 h-4" />
          <span>{t.passwordUnlockBtn}</span>
        </button>
      </form>
    </div>
  );
};
