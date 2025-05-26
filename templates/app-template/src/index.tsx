import { SdfTrFontFace } from '@lightningjs/renderer';
import {
  Canvas,
  type RenderOptions,
  createRoot,
} from '@plextv/react-lightning';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
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
  fonts: (stage) => [
    new SdfTrFontFace('msdf', {
      fontFamily: 'sans-serif',
      descriptors: {},
      atlasUrl: '/fonts/Ubuntu-Regular.msdf.png',
      atlasDataUrl: '/fonts/Ubuntu-Regular.msdf.json',
      stage,
    }),
  ],
};

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('No app element found');
}

const root = await createRoot(appElement, options);

root.render(
  <Canvas keyMap={keyMap} options={options}>
    <RouterProvider router={router} />
  </Canvas>,
);
