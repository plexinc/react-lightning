import { createRoot } from 'react-dom/client';
import { Inspector } from '../inspector/Inspector';

const appContainer = document.getElementById('app');

if (!appContainer) {
  throw new Error('App container not found');
}

createRoot(appContainer).render(<Inspector />);
