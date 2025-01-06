import useSWR from 'swr';
import { getHeaders } from './getHeaders';
import { getToken } from './getToken';
import type { HubRoot } from './types/Hubs';

const baseUrl = 'https://vod.provider.plex.tv/hubs/promoted';

const args = {
  includeMeta: '1',
  excludeFields: 'summary',
  count: '4',
};

export const useHubsData = () => {
  return useSWR<HubRoot>(
    baseUrl,
    async () => {
      const url = new URL(baseUrl);
      const token = await getToken();
      const headers = getHeaders(token);

      url.search = new URLSearchParams(args).toString();

      const res = await fetch(url, { method: 'GET', headers });

      return await res.json();
    },
    {
      shouldRetryOnError: false,
    },
  );
};
