import React, { useState } from 'react';
import { useDev } from '../context/DevContext';
import { useToast } from '../context/ToastContext';

export const DevPanel: React.FC = () => {
  const { developerMode, setDeveloperMode } = useDev();
  const { success: toastSuccess } = useToast();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <div className="fixed bottom-4 right-4 z-[9999]" id="dev-tools-panel">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-200 bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-full shadow-lg hover:bg-zinc-800 hover:text-white transition-all active:scale-95 cursor-pointer"
          id="dev-btn-collapsed"
        >
          <span className="text-sm">🔧</span>
          <span>Dev Tools</span>
        </button>
      ) : (
        <div 
          className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 text-zinc-100 p-4 rounded-xl shadow-2xl w-72 animate-fade-in"
          id="dev-panel-expanded"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔧</span>
              <h3 className="text-xs font-semibold tracking-tight text-zinc-200">
                Панель разработчика
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

          {/* Developer Mode Section */}
          <div className="space-y-2" id="dev-section-dev-mode">
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Режим разработчика
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeveloperMode(false);
                  toastSuccess('Режим разработчика выключен');
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
        </div>
      )}
    </div>
  );
};
