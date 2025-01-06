import { getHeaders } from './getHeaders';

const baseUrl = 'https://clients.plex.tv/api/v2/users/anonymous';

export const getToken = async () => {
  const token = localStorage.getItem('authToken');

  if (token) {
    return token;
  }

  const headers = getHeaders();
  const response = await fetch(baseUrl, { method: 'POST', headers });
  const data = await response.json();
  const newToken = data.authToken;

  localStorage.setItem('authToken', newToken);

  return newToken;
};
