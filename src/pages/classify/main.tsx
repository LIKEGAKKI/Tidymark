import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/shared/styles.css';
import { ClassifyPage } from './ClassifyPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClassifyPage />
  </StrictMode>,
);
