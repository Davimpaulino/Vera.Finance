import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './css/index.css';
import { RouterProvider } from './lib/router.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider>
      <UiProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </UiProvider>
    </RouterProvider>
  </StrictMode>
);
