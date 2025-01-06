import { getClientIdentifier } from './getClientIdentifier';

const getScreenResolution = () =>
  `${window.innerWidth}x${window.innerHeight},${window.screen.width}x${window.screen.height}`;

export const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Plex-Product': 'Plex Web',
    'X-Plex-Version': '4.122.0',
    'X-Plex-Client-Identifier': getClientIdentifier(),
    'X-Plex-Platform': 'Chrome',
    'X-Plex-Platform-Version': '120.0',
    'X-Plex-Features': 'external-media,indirect-media,hub-style-list',
    'X-Plex-Model': 'hosted',
    'X-Plex-Device': 'Linux',
    'X-Plex-Device-Screen-Resolution': getScreenResolution(),
    'X-Plex-Drm': 'widevine',
    'X-Plex-Provider-Version': '6.5',
    'X-Plex-Text-Format': 'plain',
    'X-Plex-Language': 'en-GB',
  };

  if (token) {
    headers['X-Plex-Token'] = token;
  }

  return headers;
};
