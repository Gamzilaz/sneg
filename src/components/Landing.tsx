import React, { useState, useRef } from 'react';
import RainOfArthurPage from '../rain_effect/RainOfArthurPage';
import SmoothEqualizer from './effects/SmoothEqualizer';

interface LandingProps {
  lang: 'en' | 'ru';
  isAuthenticated: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
}

const Landing: React.FC<LandingProps> = ({ lang, isAuthenticated, setIsAuthModalOpen, setActiveTab }) => {
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const clickTimesRef = useRef<number[]>([]);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    // Keep only clicks within the last 1000ms
    clickTimesRef.current = [...clickTimesRef.current.filter(t => now - t < 1000), now];
    if (clickTimesRef.current.length >= 3) {
      clickTimesRef.current = [];
      window.dispatchEvent(new CustomEvent('trigger-lightning'));
    }
  };

  return (
    <div className="relative w-full bg-black min-h-screen">
      {/* ШАГ 1: Архитектура слоев (Параллакс-эффект) */}
      <RainOfArthurPage onAnalyserReady={setAnalyser}>
        <div className="relative z-10 w-full min-h-screen overflow-y-auto scroll-smooth">
          {/* HERO SECTION (Adapted from App.tsx) */}
          <div className="w-full flex flex-col items-center py-12 sm:py-20 px-4 sm:px-6 md:px-8 text-center relative min-h-[calc(100vh-64px)] z-0">
          {/* Top region: Logo centered between top and headline */}
          <div className="flex-1 w-full flex flex-col items-center justify-center relative z-10 translate-y-5">
            <img 
              src="/SLM%20cards%20logo.svg" 
              alt="SLM Cards Logo" 
              className="h-16 w-auto opacity-90 drop-shadow-2xl cursor-pointer select-none transition-none transform-none hover:scale-100 active:scale-100"
              style={{ filter: 'brightness(0) invert(1)' }}
              onClick={handleLogoClick}
            />
            {/* Siri Wave Equalizer */}
            <div className="my-8">
              <SmoothEqualizer analyser={analyser} />
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-12 relative z-10 flex flex-col items-center">
            {/* Header Title */}
            <div className="space-y-8 max-w-2xl flex flex-col items-center">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
                  {lang === 'en' 
                    ? 'Create Stunning Digital Cards & Micro-Landings' 
                    : 'Создавайте стильные цифровые визитки и микролендинги'}
                </h2>
                <p className="text-sm sm:text-base text-zinc-300 leading-relaxed drop-shadow-md">
                  {lang === 'en'
                    ? 'The ultimate responsive builder with glass effects, 3D overlays, instant QR code distribution, and order catalogs. No coding required.'
                    : 'Профессиональный адаптивный конструктор с эффектами стекла, 3D фонами, мгновенной генерацией QR-кодов и каталогами заказов. Без единой строчки кода.'}
                </p>
              </div>
            </div>

            {/* Interactive CTA buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md justify-center">
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    setIsAuthModalOpen(true);
                  } else {
                    setActiveTab('projects');
                  }
                }}
                className="w-full sm:w-auto px-12 py-5 backdrop-blur-2xl hover:bg-white/5 text-white font-bold text-sm rounded-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center pointer-events-auto"
              >
                <span>{lang === 'en' ? 'CREATE PROJECT' : 'СОЗДАТЬ ПРОЕКТ'}</span>
              </button>
            </div>

            {/* BENTO GRID / FEATURES HIGHLIGHT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 w-full pt-12 text-center pointer-events-auto">
              {[
                {
                  title: lang === 'en' ? 'Dynamic Layouts' : 'Умные эффекты',
                },
                {
                  title: lang === 'en' ? '100% Adaptive' : '100% Адаптивность',
                },
                {
                  title: lang === 'en' ? 'Real-Time Stats' : 'Аналитика кликов',
                },
                {
                  title: lang === 'en' ? 'Order Catalogs' : 'Каталог продуктов',
                }
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center">
                  <h4 className="text-xs font-bold text-white tracking-[0.2em] uppercase opacity-70">{item.title}</h4>
                </div>
              ))}
            </div>
          </div>
          {/* Bottom region: Equal spacer to keep center content centered */}
          <div className="flex-1 w-full" />
        </div>

        {/* ШАГ 2: Секция «Три Столпа» (01, 02, 03) */}
        <section className="py-32 md:py-48 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-24">
            {/* Element 01 */}
            <div className="flex flex-col">
              <span className="text-white/20 font-light text-xl tracking-[0.2em] block mb-4">01 /</span>
              <h3 className="text-white text-3xl font-light tracking-tight">
                {lang === 'en' ? 'Create' : 'Создавайте'}
              </h3>
              <p className="text-white/50 font-light leading-relaxed mt-4 text-sm max-w-xs">
                {lang === 'en' 
                  ? '3D effects and responsive design in one click.' 
                  : '3D-эффекты и адаптивный дизайн в один клик.'}
              </p>
            </div>
            {/* Element 02 */}
            <div className="flex flex-col">
              <span className="text-white/20 font-light text-xl tracking-[0.2em] block mb-4">02 /</span>
              <h3 className="text-white text-3xl font-light tracking-tight">
                {lang === 'en' ? 'Sell' : 'Продавайте'}
              </h3>
              <p className="text-white/50 font-light leading-relaxed mt-4 text-sm max-w-xs">
                {lang === 'en'
                  ? 'Integrate catalogs and receive orders directly.'
                  : 'Интегрируйте каталоги и принимайте заказы напрямую.'}
              </p>
            </div>
            {/* Element 03 */}
            <div className="flex flex-col">
              <span className="text-white/20 font-light text-xl tracking-[0.2em] block mb-4">03 /</span>
              <h3 className="text-white text-3xl font-light tracking-tight">
                {lang === 'en' ? 'Share' : 'Делитесь'}
              </h3>
              <p className="text-white/50 font-light leading-relaxed mt-4 text-sm max-w-xs">
                {lang === 'en'
                  ? 'Instant distribution via QR codes and smart links.'
                  : 'Мгновенное распространение через QR-коды и умные ссылки.'}
              </p>
            </div>
          </div>
        </section>

        {/* ШАГ 3: Блок тарифов (Minimalist Pricing) */}
        <section className="py-24 md:py-40 max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20">
            {/* Card Basic */}
            <div className="flex flex-col items-start">
              <h4 className="text-white/40 uppercase tracking-widest text-xs">Basic</h4>
              <p className="text-white text-3xl font-light my-6">
                {lang === 'en' ? 'Free' : 'Бесплатно'}
              </p>
              <button 
                onClick={() => setActiveTab('basic')}
                className="border border-white/10 hover:border-white/30 text-white/80 rounded-full py-3 px-10 text-xs transition-all cursor-pointer pointer-events-auto active:scale-95"
              >
                {lang === 'en' ? 'Get Started' : 'Начать'}
              </button>
            </div>
            {/* Card Premium */}
            <div className="flex flex-col items-start">
              <h4 className="text-white uppercase tracking-widest text-xs">Premium</h4>
              <p className="text-white text-3xl font-light my-6">
                {lang === 'en' ? 'Professional' : 'Профессиональный'}
              </p>
              <button 
                onClick={() => setActiveTab('premium')}
                className="bg-white hover:bg-white/90 text-black rounded-full py-3 px-10 text-xs transition-all font-medium cursor-pointer pointer-events-auto active:scale-95"
              >
                {lang === 'en' ? 'Upgrade' : 'Улучшить'}
              </button>
            </div>
          </div>
        </section>

        {/* ШАГ 4: Ультраминималистичный Футер */}
        <footer className="w-full">
          <div className="border-t border-white/5 max-w-6xl mx-auto" />
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 py-12 px-6 text-[10px] uppercase tracking-[0.2em] text-white/30 font-light">
            <div className="flex gap-8">
              <span>© {new Date().getFullYear()} SLM CARDS</span>
            </div>
            <div className="flex flex-wrap justify-center gap-8 group">
              <a href="#" className="hover:text-white/70 transition-colors">
                {lang === 'en' ? 'Help' : 'Помощь'}
              </a>
              <a href="#" className="hover:text-white/70 transition-colors">
                {lang === 'en' ? 'Terms' : 'Условия'}
              </a>
              <a href="#" className="hover:text-white/70 transition-colors">
                {lang === 'en' ? 'Privacy' : 'Конфиденциальность'}
              </a>
            </div>
          </div>
        </footer>
      </div>
    </RainOfArthurPage>
  </div>
);
};

export default Landing;
