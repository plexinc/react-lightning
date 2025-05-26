import { SdfTrFontFace } from '@lightningjs/renderer';
import { Canvas, type RenderOptions } from '@plextv/react-lightning';
import { Column, Row } from '@plextv/react-lightning-components';
import '@plextv/react-lightning-plugin-flexbox/jsx';
import type { LinkingOptions } from '@react-navigation/native';
import {
  DarkTheme,
  NavigationContainer,
  useNavigation,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AppRegistry, Button } from 'react-native';
import { ErrorBoundary } from './ErrorBoundary';
import { keyMap } from './keyMap';
import { AnimationTest } from './pages/AnimationTest';
import { ComponentTest } from './pages/ComponentTest';
import { FlashListTest } from './pages/FlashListTest';
import { LayoutTest } from './pages/LayoutTest';
import { LibraryTest } from './pages/LibraryTest';
import { VirtualizedListTest } from './pages/VirtualizedListTest';

const Stack = createStackNavigator();

const screens = {
  Layout: 'layout',
  Animation: 'animation',
  Library: 'library',
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
          width: 250,
          height: 1080,
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
          title="Library"
          color={'rgba(55, 55, 22, 1)'}
          onPress={() => nav.navigate('Library')}
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
        style={{ width: 1670, height: 1080, color: 0x000000ff, clipping: true }}
      >
        <Stack.Navigator
          initialRouteName="Layout"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Layout" component={LayoutTest} />
          <Stack.Screen name="Animation" component={AnimationTest} />
          <Stack.Screen name="Library" component={LibraryTest} />
          <Stack.Screen name="Components" component={ComponentTest} />
          <Stack.Screen name="FlashList" component={FlashListTest} />
          <Stack.Screen
            name="VirtualizedList"
            component={VirtualizedListTest}
          />
        </Stack.Navigator>
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
    fonts: (stage) => [
      new SdfTrFontFace('msdf', {
        fontFamily: 'sans-serif',
        descriptors: {
          weight: 'bold',
        },
        atlasUrl: '/fonts/Ubuntu-Bold.msdf.png',
        atlasDataUrl: '/fonts/Ubuntu-Bold.msdf.json',
        stage,
      }),
      new SdfTrFontFace('msdf', {
        fontFamily: 'sans-serif',
        descriptors: {},
        atlasUrl: '/fonts/Ubuntu-Regular.msdf.png',
        atlasDataUrl: '/fonts/Ubuntu-Regular.msdf.json',
        stage,
      }),
    ],
  } as RenderOptions,
});
