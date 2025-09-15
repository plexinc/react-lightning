import {
  Canvas,
  createRoot as createRootLng,
  type RenderOptions,
} from '@plextv/react-lightning';
import { plugin as cssTransformPlugin } from '@plextv/react-lightning-plugin-css-transform';
import { plugin as flexPlugin } from '@plextv/react-lightning-plugin-flexbox';
import { createRoot as createRootDom } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { keyMap } from './keyMap';
import { AnimationPage } from './pages/AnimationPage';
import { BrowsePage } from './pages/BrowsePage';
import { LayoutPage } from './pages/LayoutPage';
import { Page60 } from './pages/Page60';
import { PosterPage } from './pages/PosterPage';
import { ShaderPage } from './pages/ShaderPage';
import { TexturePage } from './pages/TexturePage';
import { TransformsPage } from './pages/TransformsPage';
import { MyCustomShader } from './shaders/MyCustomShader';
import { MyCustomTexture } from './shaders/MyCustomTexture';

const router = createBrowserRouter([
  {
    path: '/',
    element: <BrowsePage />,
  },
  {
    path: '/flex-test',
    element: <LayoutPage />,
  },
  {
    path: '/poster',
    element: <PosterPage />,
  },
  {
    path: '/animation',
    element: <AnimationPage />,
  },
  {
    path: '/shader',
    element: <ShaderPage />,
  },
  {
    path: '/texture',
    element: <TexturePage />,
  },
  {
    path: '/transforms',
    element: <TransformsPage />,
  },
  {
    path: '/page60',
    element: <Page60 />,
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
    {
      type: 'sdf',
      fontFamily: 'sans-serif',
      atlasUrl: '/fonts/Ubuntu-Bold.msdf.png',
      atlasDataUrl: '/fonts/Ubuntu-Bold.msdf.json',
    },
  ],
  numImageWorkers: window.navigator.hardwareConcurrency || 2,
  plugins: [cssTransformPlugin(), flexPlugin()],
  shaders: [
    'Border',
    'Shadow',
    'Rounded',
    'RoundedWithBorder',
    'RoundedWithShadow',
    'RoundedWithBorderAndShadow',
    { MyCustomShader: MyCustomShader },
  ],
  textures: {
    MyCustomTexture: MyCustomTexture,
  },
};

const lngAsRoot = true;

const App = () => (
  <Canvas keyMap={keyMap} options={options}>
    <RouterProvider router={router} />
  </Canvas>
);

const appElement = document.getElementById('app');

if (!appElement) {
  throw new Error('No app element found');
}

if (lngAsRoot) {
  createRootLng(appElement, options)
    .then((root) => {
      root.render(<App />);
    })
    .catch((error) => {
      console.error(error);
    });
} else {
  createRootDom(appElement).render(<App />);
}
