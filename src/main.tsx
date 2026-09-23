import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initTheme } from './styles/theme';
import { initTableau } from './tableau/extensions';
import './styles/global.css';

async function bootstrap() {
  initTheme();
  await initTableau();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
