/** Shared by the root layout (server) and ThemeToggle (client). */
export const THEME_STORAGE_KEY = "cityvoice.theme";

/** Inline script for the root layout: applies the saved theme before the first paint (no light flash). */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_STORAGE_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
