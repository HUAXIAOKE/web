import { gsap } from 'gsap';

async function guardNowAccess(): Promise<boolean> {
	document.documentElement.classList.add('now-guarding');
	const API = (window as unknown as { API_BASE?: string }).API_BASE || '';
	const id = new URLSearchParams(location.search).get('activityId');
	const leave = (): boolean => {
		location.replace('/activity');
		return false;
	};
	if (!id) return leave();
	try {
		const res = await fetch(API + '/api/activities');
		if (!res.ok) return leave();
		const list = await res.json();
		const act = list.find((a: { id: number }) => a.id === parseInt(id));
		if (!act || act.signupStatus !== 'active') return leave();
		document.documentElement.classList.remove('now-guarding');
		return true;
	} catch {
		return leave();
	}
}

async function initActivityNow(): Promise<void> {
	if (!await guardNowAccess()) return;
	const waves = document.getElementById('waves');
	const entry = document.getElementById('signup-entry') as HTMLButtonElement | null;
	const wavesSide = document.getElementById('waves-side');
	const panel = document.getElementById('signup-panel');
	const sidebar = document.getElementById('signup-sidebar');
	const character = document.getElementById('signup-character');
	const overlay = document.querySelector('.activity-now-overlay');
	const pageBack = document.getElementById('page-back');

	document.addEventListener('selectstart', (e) => e.preventDefault());
	document.addEventListener('dragstart', (e) => e.preventDefault());

	const mobileLayoutQuery = window.matchMedia('(max-width: 768px)');
	const submitBtn = document.querySelector<HTMLButtonElement>('.signup-panel-submit');
	const attachmentField = document.getElementById('now-attachment-field');
	const attachmentLabel = document.querySelector<HTMLElement>('.signup-attachment-label');
	const signupForm = document.getElementById('now-signup-form');
	const signupNotice = document.getElementById('signup-notice');

	function applyMobileLayout(isMobile: boolean): void {
		if (!submitBtn || !attachmentField || !attachmentLabel || !signupForm || !sidebar || !signupNotice) return;
		if (isMobile) {
			signupForm.insertBefore(attachmentLabel, submitBtn);
			signupForm.insertBefore(attachmentField, submitBtn);
			sidebar.appendChild(submitBtn);
			sidebar.appendChild(signupNotice);
		} else {
			signupForm.appendChild(submitBtn);
			sidebar.insertBefore(attachmentLabel, signupNotice);
			sidebar.insertBefore(attachmentField, signupNotice);
		}
	}

	applyMobileLayout(mobileLayoutQuery.matches);
	mobileLayoutQuery.addEventListener('change', (e) => applyMobileLayout(e.matches));

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
		setTimeout(() => sidebar?.classList.add('is-in'), 1150);
		setTimeout(() => character?.classList.add('is-in'), 1200);
	}

	function closeSignup(): void {
		if (!isOpen || !entry) return;
		isOpen = false;
		panel?.classList.remove('is-in');
		sidebar?.classList.remove('is-in');
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
	pageBack?.addEventListener('click', () => {
		if (isOpen) {
			closeSignup();
		} else {
			window.location.href = '/activity';
		}
	});

	const API = (window as unknown as { API_BASE?: string }).API_BASE || '';
	const activityId = new URLSearchParams(window.location.search).get('activityId');
	const errorEl = document.getElementById('signup-panel-error');
	const tooltipEl = document.getElementById('now-tooltip');
	let tooltipTimer: number | undefined;

	function showTooltip(msg: string, anchor?: HTMLElement | null): void {
		if (!tooltipEl) return;
		tooltipEl.textContent = msg;
		tooltipEl.classList.remove('is-show');
		const target = anchor || document.querySelector('.signup-panel-submit') as HTMLElement | null;
		if (target) {
			const rect = target.getBoundingClientRect();
			const computed = window.getComputedStyle(target);
			const rotate = computed.transform === 'none' ? '' : computed.transform;
			tooltipEl.style.left = (rect.left + rect.width / 2) + 'px';
			tooltipEl.style.top = (rect.top - 12) + 'px';
			tooltipEl.style.transform = 'translate(-50%, -100%) ' + rotate;
		}
		void tooltipEl.offsetWidth;
		tooltipEl.classList.add('is-show');
		if (tooltipTimer) window.clearTimeout(tooltipTimer);
		tooltipTimer = window.setTimeout(() => tooltipEl.classList.remove('is-show'), 2400);
	}

	if (!activityId) {
		if (errorEl) errorEl.textContent = '缺少 activityId';
		return;
	}

	let uploadedUrl = '';
	let attachmentUploading = false;

	function bindAttachment(): void {
		const input = document.getElementById('now-attachment') as HTMLInputElement | null;
		const wrap = document.getElementById('now-file-wrap');
		const list = document.getElementById('now-file-list');
		if (!input || !wrap || !list) return;

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
			rm.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
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
			if (!isArchive(file)) { showTooltip('注意格式', wrap); return; }
			if (file.size > 500 * 1024 * 1024) { showTooltip('文件过大，最大 500 MB', wrap); return; }
			currentFile = file;
			uploadState = 'uploading';
			uploadPct = 0;
			uploadedUrl = '';
			attachmentUploading = true;
			render();
			try {
				const result = await upload(file);
				uploadedUrl = result.url;
				uploadState = 'ready';
				attachmentUploading = false;
				render();
			} catch {
				uploadState = 'error';
				attachmentUploading = false;
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
	}

	function bindSubmit(): void {
		const formEl = document.getElementById('now-signup-form') as HTMLFormElement | null;
		if (!formEl) return;

		const FIELD_NAMES = ['name', 'qq', 'department', 'remark'];
		const REQUIRED_LABELS: Record<string, string> = { name: '昵称', qq: 'QQ 号', department: '院系' };

		formEl.addEventListener('submit', async (e) => {
			e.preventDefault();
		const btn = submitBtn;
		if (!btn) return;

			const fd = new FormData(formEl);
			const data: Record<string, string> = {};
			FIELD_NAMES.forEach((n) => { data[n] = ((fd.get(n) as string) || '').trim(); });

			for (const n of Object.keys(REQUIRED_LABELS)) {
				if (!data[n]) {
					const field = formEl.querySelector('#now-' + n) as HTMLElement | null;
					showTooltip('请填写' + REQUIRED_LABELS[n], field?.closest('.sf-overlay') as HTMLElement | null);
					field?.focus();
					return;
				}
			}

			if (attachmentUploading) {
				showTooltip('文件上传中，请稍候', document.getElementById('now-file-wrap'));
				return;
			}
			if (!uploadedUrl) {
				showTooltip('请上传作品', document.getElementById('now-file-wrap'));
				return;
			}

			btn.disabled = true;
			btn.classList.remove('is-success', 'is-error');
			btn.classList.add('is-filling');

			const attachments: string[] = [uploadedUrl];
			const base = window.location.port === '4321' ? 'http://localhost:1037' : (API || '');
			const MIN_FILL = 1200;
			const startTime = Date.now();

			try {
				const res = await fetch(base + '/api/activity/' + activityId + '/submit', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ data: JSON.stringify(data), attachments: JSON.stringify(attachments) }),
				});
				if (!res.ok) throw new Error(await res.text());
				const elapsed = Date.now() - startTime;
				const remain = Math.max(0, MIN_FILL - elapsed);
				if (remain > 0) btn.style.setProperty('--fill-duration', (MIN_FILL / 1000) + 's');
				setTimeout(() => {
					btn.classList.add('is-success');
					btn.disabled = false;
					setTimeout(() => {
						btn.classList.remove('is-filling', 'is-success');
						btn.style.removeProperty('--fill-duration');
					}, 2500);
				}, remain);
			} catch {
				btn.classList.add('is-error');
				btn.disabled = false;
				showTooltip('提交失败，请稍后重试', btn);
				setTimeout(() => {
					btn.classList.remove('is-filling', 'is-error');
					btn.style.removeProperty('--fill-duration');
				}, 3000);
			}
		});
	}

	bindAttachment();
	bindSubmit();
}

document.addEventListener('DOMContentLoaded', initActivityNow);
