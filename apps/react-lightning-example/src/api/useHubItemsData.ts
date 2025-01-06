import useSWR from 'swr';
import { getHeaders } from './getHeaders';
import { getToken } from './getToken';
import type { HubItemsRoot } from './types/HubItems';

const baseUrl = 'https://vod.provider.plex.tv';

const args = {
  contentDirectoryID: 'movies',
  excludeElements:
    'Actor,Collection,Country,Label,Mood,Part,Producer,Similar,Photo,Vast,Topic',
  excludeFields: 'file,tagline',
  includeDetails: '1',
};

export const useHubItemsData = (hubKey: string) => {
  return useSWR<HubItemsRoot>(
    baseUrl + hubKey,
    async () => {
      const url = new URL(baseUrl);
      const token = await getToken();
      const headers = getHeaders(token);

      url.search = new URLSearchParams(args).toString();

      const res = await fetch(baseUrl + hubKey, { headers });

      return await res.json();
    },
    {
      shouldRetryOnError: false,
    },
  );
};
