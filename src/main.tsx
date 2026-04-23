import React from 'react';
import ReactDOM from 'react-dom/client';
import './compat';
import App from './App';
import './styles.css';
import '@fontsource-variable/geist';
import { Toaster } from 'sonner';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster richColors position="top-right" />
  </React.StrictMode>,
);
