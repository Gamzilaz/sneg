/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Landing from './components/Landing';
import { useDev } from './context/DevContext';
import { useToast } from './context/ToastContext';
import { Languages } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const { isAuthenticated, login } = useDev();
  const { info } = useToast();

  const handleAction = () => {
    info(
      lang === 'ru'
        ? 'Добро пожаловать в SLM Cards! Воспользуйтесь Dev Tools в правом нижнем углу для симуляции ролей и тарифов.'
        : 'Welcome to SLM Cards! Use Dev Tools in the bottom right corner for role & plan simulation.'
    );
  };

  return (
    <div className="relative w-full min-h-screen bg-black text-white selection:bg-cyan-500/30">
      {/* Top right language switch button */}
      <div className="fixed top-6 right-6 z-50 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => setLang((prev) => (prev === 'ru' ? 'en' : 'ru'))}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 text-white/90 hover:text-white transition-all active:scale-95 cursor-pointer shadow-lg hover:border-white/20"
          title={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
        >
          <Languages className="w-3.5 h-3.5 text-cyan-400" />
          <span>{lang.toUpperCase()}</span>
        </button>
      </div>

      <Landing
        lang={lang}
        isAuthenticated={isAuthenticated}
        setIsAuthModalOpen={() => {
          login();
          info(lang === 'ru' ? 'Вы авторизованы в системе!' : 'You are now authenticated!');
        }}
        setActiveTab={() => {
          handleAction();
        }}
      />
    </div>
  );
}
