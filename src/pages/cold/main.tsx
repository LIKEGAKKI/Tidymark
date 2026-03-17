import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/styles.css';
import { ColdBookmarksPage } from './ColdBookmarksPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ColdBookmarksPage />
  </StrictMode>,
);
