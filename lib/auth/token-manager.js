let accessToken = null;
let expiresAt = 0;

export const tokenManager = {
  get: () => accessToken,
  set(token, expiresIn) { accessToken = token; expiresAt = Date.now() + expiresIn * 1000; },
  clear() { accessToken = null; expiresAt = 0; },
  shouldRefresh() { return Boolean(accessToken) && expiresAt - Date.now() < 60000; },
};
