// Shared with the server root layout, so this module must not import React.
export const THEME_STORAGE_KEY = 'ee-theme';
export const LEGACY_STORAGE_KEY = 'elite-emporium-admin-theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/** Runs in <head> before first paint; must stay dependency-free and never throw. */
export const themeBootstrapScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}')||localStorage.getItem('${LEGACY_STORAGE_KEY}');var d=s==='dark'||(s!=='light'&&matchMedia('${DARK_QUERY}').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`;
