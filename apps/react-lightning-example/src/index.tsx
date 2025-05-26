import { SdfTrFontFace } from '@lightningjs/renderer';
import {
  Canvas,
  type RenderOptions,
  createRoot as createRootLng,
} from '@plextv/react-lightning';
import { plugin as flexPlugin } from '@plextv/react-lightning-plugin-flexbox';
import { createRoot as createRootDom } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { keyMap } from './keyMap';
import { AnimationPage } from './pages/AnimationPage';
import { BrowsePage } from './pages/BrowsePage';
import { EffectsPage } from './pages/EffectsPage';
import { LayoutPage } from './pages/LayoutPage';
import { Page60 } from './pages/Page60';
import { PosterPage } from './pages/PosterPage';
import { ShaderPage } from './pages/ShaderPage';
import { TexturePage } from './pages/TexturePage';
import { MyCustomShader } from './shaders/MyCustomShader';
import { MyCustomTexture } from './shaders/MyCustomTexture';
import { NoiseEffect } from './shaders/NoiseEffect';
import { SimpleRadialEffect } from './shaders/SimpleRadialEffect';
import { StaticAlphaEffect } from './shaders/StaticAlphaEffect';

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
    path: '/effects',
    element: <EffectsPage />,
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
    path: '/page60',
    element: <Page60 />,
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
    new SdfTrFontFace('msdf', {
      fontFamily: 'sans-serif',
      descriptors: {
        weight: 'bold',
      },
      atlasUrl: '/fonts/Ubuntu-Bold.msdf.png',
      atlasDataUrl: '/fonts/Ubuntu-Bold.msdf.json',
      stage,
    }),
  ],
  enableContextSpy: true,
  plugins: [flexPlugin()],
  effects: {
    Noise: NoiseEffect,
    StaticAlpha: StaticAlphaEffect,
    SimpleRadial: SimpleRadialEffect,
  },
  shaders: {
    MyCustomShader: MyCustomShader,
  },
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
