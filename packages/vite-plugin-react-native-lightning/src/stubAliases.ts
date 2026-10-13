import { join } from 'node:path';

export type StubOptions = {
  gestureHandler?: boolean;
  svg?: boolean;
  reactDom?: boolean;
};

export type StubAlias = { find: RegExp; replacement: string };

const defaults: Required<StubOptions> = {
  gestureHandler: true,
  svg: true,
  reactDom: false,
};

const stubs: Record<keyof StubOptions, [RegExp, string][]> = {
  gestureHandler: [
    [/^react-native-gesture-handler$/, 'gestureHandler'],
    [/^react-native-gesture-handler\/ReanimatedSwipeable$/, 'reanimatedSwipeable'],
  ],
  svg: [[/^react-native-svg$/, 'reactNativeSvg']],
  reactDom: [
    [/^react-dom$/, 'reactDom'],
    [/^react-dom\/client$/, 'reactDomClient'],
  ],
};

export function getStubAliases(
  options: StubOptions | false | undefined,
  stubDir: string,
  ext: string,
): StubAlias[] {
  if (options === false) {
    return [];
  }

  const resolved = { ...defaults, ...options };
  const aliases: StubAlias[] = [];

  for (const key of Object.keys(stubs) as (keyof StubOptions)[]) {
    if (!resolved[key]) {
      continue;
    }

    for (const [find, file] of stubs[key]) {
      aliases.push({ find, replacement: join(stubDir, `${file}${ext}`) });
    }
  }

  return aliases;
}
