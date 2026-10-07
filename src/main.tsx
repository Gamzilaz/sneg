import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DevProvider } from './context/DevContext';
import { ToastProvider } from './context/ToastContext';
import { BackgroundCanvasProvider } from './context/BackgroundCanvasContext';
import { DevPanel } from './components/DevPanel';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <DevProvider>
        <BackgroundCanvasProvider>
          <ErrorBoundary>
            <App />
            <DevPanel />
          </ErrorBoundary>
        </BackgroundCanvasProvider>
      </DevProvider>
    </ToastProvider>
  </StrictMode>,
);
