import { mount } from 'svelte';
import App from './App.svelte';
import './panel-ax-tree.css';

function applyDevToolsTheme(theme?: string): void {
	const name = theme ?? chrome.devtools?.panels?.themeName ?? 'default';
	const isDark = name === 'dark';
	document.documentElement.classList.toggle('theme-dark', isDark);
	document.documentElement.classList.toggle('theme-light', !isDark);
}

applyDevToolsTheme();
chrome.devtools?.panels?.setThemeChangeHandler?.((name) => applyDevToolsTheme(name));

mount(App, { target: document.getElementById('app')! });
