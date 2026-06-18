const htmlEl = document.documentElement;
const themeBtn = document.getElementById('theme-btn') as HTMLElement | null;

const applyTheme = (theme: 'dark' | 'light'): void => {
	localStorage.setItem('theme', theme);
	if (theme === 'dark') htmlEl.classList.add('dark');
	else htmlEl.classList.remove('dark');
};

const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
const initialTheme = savedTheme || 'dark';
if (initialTheme === 'dark') {
	htmlEl.classList.add('dark');
} else {
	htmlEl.classList.remove('dark');
}

if (themeBtn) {
	themeBtn.setAttribute('value', initialTheme);
	themeBtn.addEventListener('change', ((e: CustomEvent) => {
		applyTheme(e.detail === 'dark' ? 'dark' : 'light');
	}) as EventListener);
}
