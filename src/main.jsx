import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Service worker disabled temporarily to prevent reload issues
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//       .then((reg) => console.log('SW registered'))
//       .catch((err) => console.log('SW failed', err));
//   });
// }
