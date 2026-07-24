import { gsap } from 'gsap';

interface SignupField {
	name: string;
	label: string;
	type?: string;
	placeholder?: string;
	required?: boolean;
}

interface SignupFormMeta {
	fields: string;
	attachment?: boolean;
	instructions?: string;
	__getAttachment?: () => string;
}

function initActivityNow(): void {
	const waves = document.getElementById('waves');
	const entry = document.getElementById('signup-entry') as HTMLButtonElement | null;
	const wavesSide = document.getElementById('waves-side');
	const panel = document.getElementById('signup-panel');
	const character = document.getElementById('signup-character');
	const overlay = document.querySelector('.activity-now-overlay');
	const closeBtn = document.getElementById('signup-close');
	const pageBack = document.getElementById('page-back');

	document.addEventListener('selectstart', (e) => e.preventDefault());
	document.addEventListener('dragstart', (e) => e.preventDefault());

	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const chunks = entry ? Array.from(entry.querySelectorAll('.se-chunk')) : [];
	let entered = false;

	function playEnter(): void {
		if (entered || !entry) return;
		entered = true;
		entry.classList.add('is-on');
		if (reduceMotion) {
			gsap.set(chunks, { opacity: 1 });
			return;
		}
		gsap.killTweensOf(chunks);
		gsap.fromTo(
			chunks,
			{ opacity: 0 },
			{
				opacity: 1,
				duration: 0.45,
				ease: 'power2.out',
				stagger: 0.06,
			}
		);
	}

	function tideIn(): void {
		if (!entry || reduceMotion) return;
		for (const el of entry.querySelectorAll<HTMLElement>('.se-liquid')) {
			gsap.killTweensOf(el);
			gsap.to(el, {
				clipPath: 'inset(0% 0 0 0)',
				duration: 0.8,
				ease: 'power2.out',
			} as gsap.TweenVars);
		}
	}

	function tideOut(): void {
		if (!entry || reduceMotion) return;
		for (const el of entry.querySelectorAll<HTMLElement>('.se-liquid')) {
			gsap.killTweensOf(el);
			gsap.to(el, {
				clipPath: 'inset(100% 0 0 0)',
				duration: 0.8,
				ease: 'power2.in',
			} as gsap.TweenVars);
		}
	}

	entry?.addEventListener('mouseenter', tideIn);
	entry?.addEventListener('mouseleave', tideOut);

	setTimeout(() => {
		if (waves) waves.classList.remove('tide-enter');
		playEnter();
		pageBack?.classList.add('is-visible');
	}, 5500);

	let isOpen = false;

	function openSignup(): void {
		if (isOpen || !entry) return;
		isOpen = true;
		entered = false;
		entry.classList.remove('is-on');
		character?.classList.remove('is-out');
		overlay?.classList.add('is-deep');
		wavesSide?.classList.add('rise');
		setTimeout(() => panel?.classList.add('is-in'), 1000);
		setTimeout(() => character?.classList.add('is-in'), 1200);
	}

	function closeSignup(): void {
		if (!isOpen || !entry) return;
		isOpen = false;
		panel?.classList.remove('is-in');
		character?.classList.remove('is-in');
		character?.classList.add('is-out');
		setTimeout(() => {
			character?.classList.remove('is-out');
			wavesSide?.classList.remove('rise');
			overlay?.classList.remove('is-deep');
		}, 700);
		setTimeout(() => playEnter(), 1300);
	}

	entry?.addEventListener('click', openSignup);
	closeBtn?.addEventListener('click', closeSignup);
	pageBack?.addEventListener('click', closeSignup);

	const API = (window as unknown as { API_BASE?: string }).API_BASE || '';
	const activityId = new URLSearchParams(window.location.search).get('activityId');
	const errorEl = document.getElementById('signup-panel-error');

	if (!activityId) {
		if (errorEl) errorEl.style.display = '';
	} else {
		loadSignupForm(activityId);
	}

	async function loadSignupForm(id: string): Promise<void> {
		try {
			const res = await fetch(API + '/api/activity/' + id + '/signup-form');
			if (!res.ok) throw new Error('fail');
			const form = (await res.json()) as SignupFormMeta;
			const fields = JSON.parse(form.fields || '[]') as SignupField[];

			const container = document.getElementById('now-form-fields');
			if (container) {
				container.innerHTML = fields
					.map((f) => {
						const req = f.required ? '<span class="required">*</span>' : '';
						const reqAttr = f.required ? 'required' : '';
						if (f.type === 'textarea') {
							return (
								'<div class="signup-field"><label for="now-' + f.name + '">' + f.label + req + '</label>' +
								'<textarea id="now-' + f.name + '" name="' + f.name + '" placeholder="' + (f.placeholder || '') + '" ' + reqAttr + '></textarea></div>'
							);
						}
						return (
							'<div class="signup-field"><label for="now-' + f.name + '">' + f.label + req + '</label>' +
							'<input type="text" id="now-' + f.name + '" name="' + f.name + '" placeholder="' + (f.placeholder || '') + '" ' + reqAttr + ' /></div>'
						);
					})
					.join('');
			}

			if (form.attachment) {
				const af = document.getElementById('now-attachment-field');
				if (af) af.style.display = '';
			}

			if (form.instructions) {
				const ins = document.getElementById('now-instructions');
				const insContent = document.getElementById('now-instructions-content');
				if (ins) ins.style.display = '';
				if (insContent) insContent.innerHTML = form.instructions;
			}

			bindAttachment(form);
			bindSubmit(form, id, fields);
		} catch {
			if (errorEl) {
				errorEl.textContent = '报名表加载失败';
				errorEl.style.display = '';
			}
		}
	}

	function bindAttachment(form: SignupFormMeta): void {
		if (!form.attachment) return;
		const input = document.getElementById('now-attachment') as HTMLInputElement | null;
		const wrap = document.getElementById('now-file-wrap');
		const list = document.getElementById('now-file-list');
		if (!input || !wrap || !list) return;

		let uploadedUrl = '';
		let currentFile: File | null = null;
		let uploadState: 'idle' | 'uploading' | 'ready' | 'error' = 'idle';
		let uploadPct = 0;

		const archiveExt = /\.(zip|rar|7z|tgz|gz|bz2|xz)$/i;
		function isArchive(file: File): boolean {
			const n = file.name.toLowerCase();
			return archiveExt.test(n) || n.endsWith('.tar.gz') || n.endsWith('.tar.bz2') || n.endsWith('.tar.xz');
		}

		function render(): void {
			list!.innerHTML = '';
			wrap!.classList.remove('has-value', 'is-uploading', 'is-ready', 'is-error');
			if (!currentFile) return;
			wrap!.classList.add('has-value');
			if (uploadState === 'uploading') wrap!.classList.add('is-uploading');
			if (uploadState === 'ready') wrap!.classList.add('is-ready');
			if (uploadState === 'error') wrap!.classList.add('is-error');

			const item = document.createElement('div');
			item.className = 'signup-file-item';
			let status = '';
			if (uploadState === 'uploading') status = '<span class="signup-file-status">上传中 ' + uploadPct + '%</span>';
			if (uploadState === 'ready') status = '<span class="signup-file-status is-done">已上传</span>';
			if (uploadState === 'error') status = '<span class="signup-file-status is-error">上传失败</span>';
			item.innerHTML = '<div class="signup-file-info"><span class="signup-file-name">' + currentFile.name + '</span>' + status + '</div>';
			const rm = document.createElement('button');
			rm.type = 'button';
			rm.className = 'signup-file-remove';
			rm.textContent = '×';
			rm.addEventListener('click', () => {
				uploadedUrl = '';
				currentFile = null;
				uploadState = 'idle';
				uploadPct = 0;
				input!.value = '';
				render();
			});
			item.appendChild(rm);
			list!.appendChild(item);
		}

		function endpoint(): string {
			if (window.location.port === '4321') return 'http://localhost:1037/api/signup/upload';
			return (API || '') + '/api/signup/upload';
		}

		function upload(file: File): Promise<{ url: string }> {
			return new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				const fd = new FormData();
				fd.append('file', file);
				xhr.upload.onprogress = (ev) => {
					if (ev.lengthComputable) {
						uploadPct = Math.round((ev.loaded / ev.total) * 100);
						const st = list!.querySelector('.signup-file-status');
						if (st) st.textContent = '上传中 ' + uploadPct + '%';
					}
				};
				xhr.onload = () => {
					if (xhr.status === 200) resolve(JSON.parse(xhr.responseText));
					else reject(new Error('fail'));
				};
				xhr.onerror = () => reject(new Error('fail'));
				xhr.open('POST', endpoint());
				xhr.send(fd);
			});
		}

		async function handle(file: File | undefined): Promise<void> {
			if (!file) return;
			if (!isArchive(file)) { alert('仅支持 zip / rar / 7z / tar.gz 等压缩包格式'); return; }
			if (file.size > 500 * 1024 * 1024) { alert('文件过大，最大允许 500 MB'); return; }
			currentFile = file;
			uploadState = 'uploading';
			uploadPct = 0;
			uploadedUrl = '';
			render();
			try {
				const result = await upload(file);
				uploadedUrl = result.url;
				uploadState = 'ready';
				render();
			} catch {
				uploadState = 'error';
				render();
			}
		}

		input.addEventListener('change', () => {
			if (input.files && input.files[0]) handle(input.files[0]);
			input.value = '';
		});

		wrap.addEventListener('dragover', (e) => { e.preventDefault(); wrap.classList.add('signup-file-dragover'); });
		wrap.addEventListener('dragleave', (e) => {
			e.preventDefault();
			if (!wrap.contains(e.relatedTarget as Node)) wrap.classList.remove('signup-file-dragover');
		});
		wrap.addEventListener('drop', (e) => {
			e.preventDefault();
			wrap.classList.remove('signup-file-dragover');
			const f = e.dataTransfer?.files?.[0];
			if (f) handle(f);
		});

		form.__getAttachment = () => uploadedUrl;
	}

	function bindSubmit(form: SignupFormMeta, id: string, fields: SignupField[]): void {
		const formEl = document.getElementById('now-signup-form') as HTMLFormElement | null;
		if (!formEl) return;
		formEl.addEventListener('submit', async (e) => {
			e.preventDefault();
			const btn = formEl.querySelector('.signup-panel-submit') as HTMLButtonElement | null;
			if (!btn) return;
			btn.disabled = true;
			btn.textContent = '提交中...';

			const fd = new FormData(formEl);
			const data: Record<string, string> = {};
			fields.forEach((f) => { data[f.name] = (fd.get(f.name) as string) || ''; });

			const attachments: string[] = [];
			if (form.attachment) {
				const url = form.__getAttachment ? form.__getAttachment() : '';
				if (!url) {
					btn.textContent = '请先上传压缩包';
					btn.disabled = false;
					setTimeout(() => { btn.textContent = '提交报名'; }, 2500);
					return;
				}
				attachments.push(url);
			}

			try {
				const res = await fetch(API + '/api/activity/' + id + '/submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ data: JSON.stringify(data), attachments: JSON.stringify(attachments) }),
				});
				if (res.ok) {
					btn.textContent = '提交成功！';
					btn.disabled = false;
					setTimeout(() => { btn.textContent = '提交报名'; }, 2500);
				} else {
					const err = await res.text();
					btn.textContent = err || '提交失败';
					btn.disabled = false;
					setTimeout(() => { btn.textContent = '提交报名'; }, 3000);
				}
			} catch {
				btn.textContent = '网络错误';
				btn.disabled = false;
				setTimeout(() => { btn.textContent = '提交报名'; }, 3000);
			}
		});
	}
}

document.addEventListener('DOMContentLoaded', initActivityNow);
