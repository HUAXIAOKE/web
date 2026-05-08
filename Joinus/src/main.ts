import { applyTheme, themes, themeYellow } from './config.js';
import { renderForm, type FormConfig } from './form.js';

const root = document.querySelector('.joinus-root') as HTMLElement;
if (!root) throw new Error('joinus-root not found');

const configUrl = root.dataset.configUrl;
if (!configUrl) throw new Error('data-config-url required');

const res = await fetch(configUrl);
const config: FormConfig = await res.json();

const themeName = root.dataset.theme || new URLSearchParams(location.search).get('theme') || config.theme || 'yellow';
applyTheme(root, themes[themeName] ?? themeYellow);

const titleEl = document.getElementById('joinus-title');
const subtitleEl = document.getElementById('joinus-subtitle');
const welcomeEl = document.getElementById('joinus-welcome');
if (titleEl) titleEl.textContent = config.title;
if (subtitleEl) subtitleEl.textContent = config.subtitle ?? 'JOIN US';
if (welcomeEl) welcomeEl.innerHTML = (config.welcome ?? '').replace(/\n/g, '<br />');

const formContainer = document.getElementById('joinus-form-container');
if (formContainer) renderForm(formContainer, config);
