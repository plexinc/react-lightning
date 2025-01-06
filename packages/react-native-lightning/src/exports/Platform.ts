import type { PlatformOSType } from 'react-native';

export const OS = 'web';
export const isTV = true;
export const isLightning = true;
export const isTesting = true;
export const Version = '0.1.0';
export const constants = {
  isTesting,
  reactNativeVersion: {
    major: 0,
    minor: 73,
    patch: 4,
  },
};

/**
 * @see https://reactnative.dev/docs/platform-specific-code#content
 */
function select<T>(
  specifics:
    | { [platform in PlatformOSType | 'lightning']: T }
    | ({ [platform in PlatformOSType | 'lightning']?: T } & { default: T }),
): T;
function select<T>(
  specifics: {
    [platform in PlatformOSType | 'lightning' | 'default']?: T;
  },
): T | undefined {
  return specifics.lightning ?? specifics.default;
}

export { select };
