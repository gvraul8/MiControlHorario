import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAuthPersistence } from './services/authService';
import './index.css';

void initAuthPersistence();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
