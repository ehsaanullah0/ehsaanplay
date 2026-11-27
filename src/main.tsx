import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BackNavigationProvider } from './contexts/BackNavigationContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BackNavigationProvider>
    <App />
  </BackNavigationProvider>
);
