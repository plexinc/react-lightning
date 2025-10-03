import { Canvas, type RenderOptions } from '@plextv/react-lightning';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from './App';
import { keyMap } from './keyMap';
import { BrowsePage } from './pages/BrowsePage';
import { IndexPage } from './pages/IndexPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        path: '/',
        element: <IndexPage />,
      },
      {
        path: '/browse',
        element: <BrowsePage />,
      },
    ],
  },
]);

const options: RenderOptions = {
  fonts: [
    {
      type: 'sdf',
      fontFamily: 'sans-serif',
      atlasUrl: '/fonts/Ubuntu-Regular.msdf.png',
      atlasDataUrl: '/fonts/Ubuntu-Regular.msdf.json',
    },
  ],
};

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('No app element found');
}

createRoot(appElement).render(
  <Canvas keyMap={keyMap} options={options}>
    <RouterProvider router={router} />
  </Canvas>,
);
