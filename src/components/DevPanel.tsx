import React, { useState } from 'react';
import { useDev } from '../context/DevContext';
import { useToast } from '../context/ToastContext';

export const DevPanel: React.FC = () => {
  const { 
    isAuthenticated, 
    login, 
    logout, 
    planType, 
    setPlanType, 
    developerMode, 
    setDeveloperMode,
    projects,
    activeProjectId,
    updateProject
  } = useDev();

  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [tempDomain, setTempDomain] = useState<string>('');
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);

  const activeProject = projects.find(p => p.id === activeProjectId);

  React.useEffect(() => {
    if (activeProject) {
      setTempDomain(activeProject.customDomain || '');
    }
  }, [activeProject?.customDomain, activeProjectId]);

  const handleResetLocalStorage = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleFinishPremium = () => {
    if (activeProjectId) {
      updateProject(activeProjectId, {
        plan: 'basic',
        tariff: 'Basic',
        premiumExpiredAt: new Date().toISOString()
      });
      toastInfo?.('Начался 7-дневный льготный период (Grace Period)');
    } else {
      toastError('Нет активного проекта');
    }
  };

  const handleFastForward8Days = () => {
    if (activeProjectId) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 8);
      updateProject(activeProjectId, {
        premiumExpiredAt: pastDate.toISOString()
      });
      toastSuccess('Перемотано на 8 дней вперед. Ожидайте отключения.');
    } else {
      toastError('Нет активного проекта');
    }
  };

  const applyCustomDomain = () => {
    if (activeProjectId) {
      updateProject(activeProjectId, {
        customDomain: tempDomain || undefined
      });
      toastSuccess('Custom Domain обновлен');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]" id="dev-tools-panel">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 rounded-full shadow-lg hover:bg-zinc-800 hover:text-white transition-all active:scale-95 cursor-pointer"
          id="dev-btn-collapsed"
        >
          <span className="text-sm">🔧</span>
          <span>Dev Tools</span>
        </button>
      ) : (
        <div 
          className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 text-zinc-100 p-4 rounded-xl shadow-2xl w-80 animate-fade-in max-h-[85vh] overflow-y-auto"
          id="dev-panel-expanded"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔧</span>
              <h3 className="text-sm font-medium tracking-tight text-zinc-200">
                Симуляция фронтенда
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              aria-label="Close"
              id="dev-btn-close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {/* User Role Section */}
          <div className="space-y-2 mb-4" id="dev-section-user-role">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Роль пользователя
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={logout}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  !isAuthenticated
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
                id="dev-btn-role-guest"
              >
                Гость
              </button>
              <button
                type="button"
                onClick={login}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isAuthenticated
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
                id="dev-btn-role-authorized"
              >
                Авторизован
              </button>
            </div>
          </div>

          {/* Plan Type Section */}
          <div className="space-y-2" id="dev-section-plan-type">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Тарифный план
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlanType('unpaid')}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                  planType === 'unpaid'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
                id="dev-btn-plan-unpaid"
              >
                Unpaid
              </button>
              <button
                type="button"
                onClick={() => setPlanType('basic')}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                  planType === 'basic'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
                id="dev-btn-plan-basic"
              >
                Basic
              </button>
              <button
                type="button"
                onClick={() => setPlanType('premium')}
                className={`py-1.5 px-3 rounded-lg text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                  planType === 'premium'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
                id="dev-btn-plan-premium"
              >
                Premium
              </button>
            </div>
          </div>

          {/* Developer Mode Section */}
          <div className="space-y-2 mb-4 mt-3" id="dev-section-dev-mode">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Режим разработчика
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeveloperMode(false);
                  toastSuccess('Режим разработчика выключен. Все изменения шаблонов сохранены! 💾');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  !developerMode
                    ? 'bg-zinc-700 text-white shadow-md font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
                id="dev-btn-devmode-off"
              >
                Выключен
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeveloperMode(true);
                  toastSuccess('Режим разработчика включен! 🚀');
                }}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  developerMode
                    ? 'bg-amber-600 text-white shadow-md font-bold'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750 hover:text-zinc-200'
                }`}
                id="dev-btn-devmode-on"
              >
                Включен 🛠️
              </button>
            </div>
          </div>

          {/* Actions & Tests Section */}
          <div className="border-t border-zinc-800 pt-3 mt-4 space-y-3" id="dev-section-tests">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Симуляция доменов
            </label>
            <div className="space-y-2 mb-2">
              <button
                type="button"
                onClick={handleFinishPremium}
                className="w-full py-1.5 px-2 bg-amber-900/30 hover:bg-amber-800/40 text-amber-400 rounded-lg text-[11px] font-medium border border-amber-800/50 transition-all cursor-pointer text-left"
              >
                🔸 Завершить Premium (Basic + 7 days Grace)
              </button>
              <button
                type="button"
                onClick={handleFastForward8Days}
                className="w-full py-1.5 px-2 bg-rose-900/30 hover:bg-rose-800/40 text-rose-400 rounded-lg text-[11px] font-medium border border-rose-800/50 transition-all cursor-pointer text-left"
              >
                ⏩ Перемотать на 8 дней вперед
              </button>
            </div>
             <div className="space-y-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Custom Domain (agency.com)"
                  value={tempDomain}
                  onChange={(e) => setTempDomain(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-[10px] rounded p-1.5 text-white focus:outline-none"
                />
                <button onClick={applyCustomDomain} className="bg-zinc-800 text-[10px] px-2 rounded hover:bg-zinc-700">Set</button>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-3 mt-4 space-y-3" id="dev-section-tests">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Тесты и сброс
            </label>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toastSuccess('Успешное уведомление! 🎉')}
                className="py-1.5 px-2 bg-zinc-800 hover:bg-emerald-950/30 hover:text-emerald-400 text-zinc-300 rounded-lg text-[11px] font-medium border border-zinc-750 transition-all cursor-pointer"
                id="dev-btn-test-success"
              >
                Test Success
              </button>
              <button
                type="button"
                onClick={() => toastError('Произошла ошибка! ⚠️')}
                className="py-1.5 px-2 bg-zinc-800 hover:bg-rose-950/30 hover:text-rose-400 text-zinc-300 rounded-lg text-[11px] font-medium border border-zinc-750 transition-all cursor-pointer"
                id="dev-btn-test-error"
              >
                Test Error
              </button>
            </div>

            <a
              href="/project.zip"
              download="project.zip"
              className="w-full py-2 px-3 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg text-[11px] font-bold border border-cyan-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              id="dev-btn-download-zip"
            >
              <span>📦 Скачать проект (.zip)</span>
            </a>

            {!showConfirmReset ? (
              <button
                type="button"
                onClick={() => setShowConfirmReset(true)}
                className="w-full py-2 px-3 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 rounded-lg text-[11px] font-bold border border-rose-500/20 transition-all cursor-pointer text-center"
                id="dev-btn-reset-storage"
              >
                🔄 Сбросить LocalStorage
              </button>
            ) : (
              <div className="p-2.5 bg-rose-950/20 border border-rose-500/30 rounded-lg space-y-2 animate-fade-in" id="dev-confirm-reset-box">
                <p className="text-[10px] text-rose-200 font-medium leading-normal text-center">
                  Вы уверены? Это действие сотрет все локальные проекты, шаблоны и настройки!
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleResetLocalStorage}
                    className="py-1 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold transition-all cursor-pointer text-center"
                    id="dev-btn-confirm-reset"
                  >
                    Да, сбросить
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmReset(false)}
                    className="py-1 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-medium transition-all cursor-pointer text-center"
                    id="dev-btn-cancel-reset"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
