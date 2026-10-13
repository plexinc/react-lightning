import { describe, expect, it } from 'vitest';

import { getStubAliases } from './stubAliases';

const resolve = (aliases: ReturnType<typeof getStubAliases>, id: string) =>
  aliases.find(({ find }) => find.test(id))?.replacement;

describe('getStubAliases', () => {
  it('stubs gesture handler and svg by default, not react-dom', () => {
    const aliases = getStubAliases(undefined, '/stubs', '.mjs');

    expect(resolve(aliases, 'react-native-gesture-handler')).toBe('/stubs/gestureHandler.mjs');
    expect(resolve(aliases, 'react-native-gesture-handler/ReanimatedSwipeable')).toBe(
      '/stubs/reanimatedSwipeable.mjs',
    );
    expect(resolve(aliases, 'react-native-svg')).toBe('/stubs/reactNativeSvg.mjs');
    expect(resolve(aliases, 'react-dom')).toBeUndefined();
    expect(resolve(aliases, 'react-dom/client')).toBeUndefined();
  });

  it('stubs react-dom and react-dom/client when enabled', () => {
    const aliases = getStubAliases({ reactDom: true }, '/stubs', '.mjs');

    expect(resolve(aliases, 'react-dom')).toBe('/stubs/reactDom.mjs');
    expect(resolve(aliases, 'react-dom/client')).toBe('/stubs/reactDomClient.mjs');
    expect(resolve(aliases, 'react-dom/server')).toBeUndefined();
  });

  it('only matches exact ids', () => {
    const aliases = getStubAliases({ reactDom: true }, '/stubs', '.mjs');

    expect(resolve(aliases, 'react-native-svg-transformer')).toBeUndefined();
    expect(resolve(aliases, 'react-native-gesture-handler/Swipeable')).toBeUndefined();
    expect(resolve(aliases, 'react-dom-foo')).toBeUndefined();
  });

  it('opts out per stub', () => {
    const aliases = getStubAliases({ gestureHandler: false }, '/stubs', '.mjs');

    expect(resolve(aliases, 'react-native-gesture-handler')).toBeUndefined();
    expect(resolve(aliases, 'react-native-svg')).toBe('/stubs/reactNativeSvg.mjs');
  });

  it('opts out of every stub with false', () => {
    expect(getStubAliases(false, '/stubs', '.mjs')).toEqual([]);
  });
});
