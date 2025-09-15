import { Canvas, type RenderOptions } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import '@plextv/react-lightning-plugin-flexbox/jsx';
import type { LinkingOptions } from '@react-navigation/native';
import {
  createNavigatorFactory,
  DarkTheme,
  NavigationContainer,
  StackRouter,
  useNavigation,
  useNavigationBuilder,
} from '@react-navigation/native';
import { AppRegistry, Button } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';
import { keyMap } from './keyMap';
import { AnimationBuilderTest } from './pages/AnimationBuilderTest';
import { AnimationTest } from './pages/AnimationTest';
import { ComponentTest } from './pages/ComponentTest';
import { FlashListTest } from './pages/FlashListTest';
import { LayoutTest } from './pages/LayoutTest';
import { LibraryTest } from './pages/LibraryTest';
import { SimpleTest } from './pages/SimpleTest';
import { VirtualizedListTest } from './pages/VirtualizedListTest';

function CustomNavigator(props: Parameters<typeof useNavigationBuilder>[1]) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(
    StackRouter,
    props,
  );

  const focusedRoute = state.routes[state.index];

  if (!focusedRoute) {
    console.warn('No focused route found in the navigation state');
    return null;
  }

  const descriptor = descriptors[focusedRoute.key];

  if (!descriptor) {
    console.warn(`No descriptor found for route: ${focusedRoute.key}`);
    return null;
  }

  return <NavigationContent>{descriptor.render()}</NavigationContent>;
}

export const createCustomNavigator = createNavigatorFactory(CustomNavigator);

const CustomStack = createCustomNavigator();

const screens = {
  Layout: 'layout',
  Animation: 'animation',
  AnimationBuilder: 'animationBuilder',
  Library: 'library',
  Simple: 'simple',
  Components: 'components',
  NestedLayouts: 'nestedLayouts',
  VirtualizedList: 'virtualizedList',
  FlashList: 'flashList',
};

const linking: LinkingOptions<object> = {
  prefixes: [],
  config: {
    screens,
  },
};

const MainApp = () => {
  const nav = useNavigation<{
    navigate(screen: keyof typeof screens): void;
  }>();

  return (
    <Row focusable style={{ clipping: true }}>
      <Column
        focusable
        style={{
          w: 250,
          h: 1080,
          gap: 5,
          color: 0x000022ff,
          clipping: true,
        }}
      >
        <Button
          title="Layout"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('Layout')}
        />
        <Button
          title="Animation"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('Animation')}
        />
        <Button
          title="Animation Builder"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('AnimationBuilder')}
        />
        <Button
          title="Library"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('Library')}
        />
        <Button
          title="Simple"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('Simple')}
        />
        <Button
          title="Components"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('Components')}
        />
        <Button
          title="VirtualizedList"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('VirtualizedList')}
        />
        <Button
          title="FlashList"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('FlashList')}
        />
      </Column>

      <Column
        focusable
        style={{ w: 1670, h: 1080, color: 0x000000ff, clipping: true }}
      >
        <CustomStack.Navigator
          initialRouteName="Layout"
          screenOptions={{
            headerShown: false,
          }}
        >
          <CustomStack.Screen name="Layout" component={LayoutTest} />
          <CustomStack.Screen name="Animation" component={AnimationTest} />
          <CustomStack.Screen
            name="AnimationBuilder"
            component={AnimationBuilderTest}
          />
          <CustomStack.Screen name="Library" component={LibraryTest} />
          <CustomStack.Screen name="Simple" component={SimpleTest} />
          <CustomStack.Screen name="Components" component={ComponentTest} />
          <CustomStack.Screen name="FlashList" component={FlashListTest} />
          <CustomStack.Screen
            name="VirtualizedList"
            component={VirtualizedListTest}
          />
        </CustomStack.Navigator>
      </Column>
    </Row>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <Canvas keyMap={keyMap}>
        <NavigationContainer linking={linking} theme={DarkTheme}>
          <MainApp />
        </NavigationContainer>
      </Canvas>
    </ErrorBoundary>
  );
};

AppRegistry.registerComponent('plex', () => App);
AppRegistry.runApplication('plex', {
  rootId: 'app',
  renderOptions: {
    driver: 'normal',
    numImageWorkers: window.navigator.hardwareConcurrency - 1 || 2,
    fonts: [
      {
        type: 'sdf',
        fontFamily: 'sans-serif',
        atlasUrl: '/fonts/Ubuntu-Bold.msdf.png',
        atlasDataUrl: '/fonts/Ubuntu-Bold.msdf.json',
        metrics: {
          ascender: 776,
          descender: -185,
          lineGap: 56,
          unitsPerEm: 1000,
        },
      },
      {
        type: 'sdf',
        fontFamily: 'sans-serif',
        atlasUrl: '/fonts/Ubuntu-Regular.msdf.png',
        atlasDataUrl: '/fonts/Ubuntu-Regular.msdf.json',
        metrics: {
          ascender: 776,
          descender: -185,
          lineGap: 56,
          unitsPerEm: 1000,
        },
      },
    ],
    shaders: [
      'Border',
      'Shadow',
      'Rounded',
      'RoundedWithBorder',
      'RoundedWithShadow',
      'RoundedWithBorderAndShadow',
    ],
  } as RenderOptions,
  pluginOptions: {
    flexbox: {
      useWebWorker: true,
    },
  },
});
