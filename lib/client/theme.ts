/** localStorage key for the chosen colour theme ("light" or "dark"; absent means follow the system). */
export const THEME_STORAGE_KEY = "trialbridge-theme";

/**
 * Runs in <head> before the page paints, so a saved Light or Dark choice never flashes the other theme.
 * Kept tiny and dependency-free; storage errors fall back to the system theme.
 */
export const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
