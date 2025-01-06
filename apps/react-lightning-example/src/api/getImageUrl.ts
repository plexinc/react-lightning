const baseUrl = 'https://images.plex.tv/photo';

export const getImageUrl = (url?: string) => {
  if (!url) {
    return '';
  }

  return `${baseUrl}?size=medium-240&url=${url}`;
};
