const themeBtn = document.getElementById('theme-btn') as HTMLElement;
const htmlEl = document.documentElement;

if (htmlEl.classList.contains('dark')) {
	themeBtn.setAttribute('value', 'dark');
} else {
	themeBtn.setAttribute('value', 'light');
}

themeBtn.addEventListener('change', ((e: CustomEvent) => {
	if (e.detail === 'dark') {
		htmlEl.classList.add('dark');
	} else {
		htmlEl.classList.remove('dark');
	}
}) as EventListener);
