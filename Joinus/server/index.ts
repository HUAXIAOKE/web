import { writeFileSync } from 'fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const SERVER_DIR = import.meta.dir;
const DATA_DIR = resolve(SERVER_DIR, 'data');
const FORM_JSON_PATH = resolve(SERVER_DIR, '..', 'public', 'form.json');
const SUBMISSIONS_FILE = resolve(DATA_DIR, 'submissions.json');
const UPLOADS_DIR = resolve(DATA_DIR, 'uploads');

type SubmissionRecord = Record<string, string> & { _id?: string; _submittedAt?: string };

let submissions: SubmissionRecord[] = [];

async function loadSubmissions(): Promise<void> {
	try {
		const raw = await readFile(SUBMISSIONS_FILE, 'utf-8');
		submissions = JSON.parse(raw.trim()) as SubmissionRecord[];
	} catch {
		submissions = [];
	}
}

async function saveSubmissions(): Promise<void> {
	await mkdir(DATA_DIR, { recursive: true });
	await writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2), 'utf-8');
}

function corsHeaders(origin: string | null, expose?: string): Record<string, string> {
	const h: Record<string, string> = {
		'Access-Control-Allow-Origin': origin ?? '*',
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
	};
	if (expose) h['Access-Control-Expose-Headers'] = expose;
	return h;
}

function isFile(v: unknown): v is File {
	return typeof v === 'object' && v !== null && v instanceof File;
}

const basePort = Number(process.env.PORT) || 3001;
const maxPortAttempts = 20;

async function handleFetch(req: Request): Promise<Response> {
	const url = new URL(req.url);
	const origin = req.headers.get('Origin') ?? null;

	if (req.method === 'OPTIONS') {
		return new Response(null, { status: 204, headers: corsHeaders(origin) });
	}

		if (url.pathname === '/api/submit' && req.method === 'POST') {
		try {
			const formData = await req.formData();
			const overwrite = formData.get('overwrite') === '1' || formData.get('overwrite') === 'true';
			const record: SubmissionRecord = {
				_id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
				_submittedAt: new Date().toISOString(),
			};

			const fileEntries: Array<{ key: string; file: File; idx: number }> = [];
			let fileIndex: Record<string, number> = {};
			for (const [key, value] of formData.entries()) {
				if (key === 'overwrite') continue;
				if (isFile(value)) {
					const idx = (fileIndex[key] = (fileIndex[key] ?? 0) + 1);
					fileEntries.push({ key, file: value, idx });
					const existing = record[key];
					record[key] = existing ? `${existing}; ${value.name}` : value.name;
				} else {
					record[key] = String(value);
				}
			}

			let nameFieldId = 'name';
			let contactFieldId = 'contact';
			const formPaths = [FORM_JSON_PATH, resolve(process.cwd(), 'public', 'form.json')];
			for (const formPath of formPaths) {
				try {
					const formRaw = await readFile(formPath, 'utf-8');
					const form = JSON.parse(formRaw.trim()) as { questions?: Array<{ id: string; label: string }> };
					for (const q of form.questions ?? []) {
						if (q.label === '姓名' || q.id === 'name') nameFieldId = q.id;
						if (q.label === '联系方式' || q.id === 'contact') contactFieldId = q.id;
					}
					break;
				} catch {
					continue;
				}
			}

			await loadSubmissions();
			const norm = (v: string | undefined) => (v ?? '').trim();
			const normContact = (v: string | undefined) => (v ?? '').replace(/\D/g, '').trim();
			const nameVal = norm(String(formData.get(nameFieldId) ?? record[nameFieldId] ?? ''));
			const contactVal = normContact(String(formData.get(contactFieldId) ?? record[contactFieldId] ?? ''));
			const duplicateIndex = submissions.findIndex(
				(s) => norm(s[nameFieldId]) === nameVal && normContact(s[contactFieldId]) === contactVal
			);

			if (duplicateIndex >= 0 && !overwrite) {
				return new Response(JSON.stringify({ ok: false, duplicate: true }), {
					status: 409,
					headers: {
						'Content-Type': 'application/json',
						'X-Duplicate': 'true',
						...corsHeaders(origin, 'X-Duplicate'),
					},
				});
			}

			if (duplicateIndex >= 0 && overwrite) {
				const old = submissions[duplicateIndex];
				submissions.splice(duplicateIndex, 1);
				record._id = old?._id ?? record._id;
				record._submittedAt = new Date().toISOString();
				if (old?._id) {
					try {
						await rm(join(UPLOADS_DIR, old._id), { recursive: true });
					} catch {
						// ignore
					}
				}
			}

			const submissionId = record._id!;
			if (fileEntries.length > 0) {
				const uploadDir = join(UPLOADS_DIR, submissionId);
				await mkdir(uploadDir, { recursive: true });
				for (const { key, file, idx } of fileEntries) {
					const safeName = `${key}_${idx}_${file.name}`.replace(/[^a-zA-Z0-9._-]/g, '_');
					await Bun.write(join(uploadDir, safeName), file);
				}
			}

			submissions.push(record);
			await saveSubmissions();

			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
			});
		} catch (e) {
			console.error(e);
			return new Response(JSON.stringify({ ok: false, error: String(e) }), {
				status: 500,
				headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
			});
		}
	}

	if (url.pathname === '/api/export' && req.method === 'GET') {
		try {
			await loadSubmissions();
			const idToLabel: Record<string, string> = {};
			const questionOrder: Array<{ id: string; label: string; type?: string }> = [];
			let nameFieldId: string | undefined;
			try {
				const formRaw = await readFile(FORM_JSON_PATH, 'utf-8');
				const form = JSON.parse(formRaw) as { questions?: Array<{ id: string; label: string; type?: string }> };
				for (const q of form.questions ?? []) {
					idToLabel[q.id] = q.label;
					questionOrder.push({ id: q.id, label: q.label, type: q.type });
					if (!nameFieldId && (q.id === 'name' || q.label.includes('姓名'))) nameFieldId = q.id;
				}
			} catch {
				// use id as header if form.json missing
			}

			// Build ordered columns: strictly follow form.json question order when available.
			const orderedIds =
				questionOrder.length > 0
					? questionOrder.map((q) => q.id)
					: Array.from(
							submissions.reduce((s, row) => {
								for (const k of Object.keys(row)) if (k !== '_id' && k !== '_submittedAt') s.add(k);
								return s;
							}, new Set<string>())
						).sort();

			const orderedHeaders = ['序号', '提交时间', ...orderedIds.map((id) => idToLabel[id] || `字段_${id}`)];

			const excelRows = submissions.map((row, index) => {
				const out: Record<string, string | number> = {
					序号: index + 1,
					提交时间: row._submittedAt ?? '',
				};
				for (let i = 0; i < orderedIds.length; i++) {
					const id = orderedIds[i];
					if (!id) continue;
					const header = orderedHeaders[2 + i] ?? `字段_${id}`;
					out[header] = row[id] ?? '';
				}
				return out;
			});

			const ws = XLSX.utils.json_to_sheet(excelRows, { header: orderedHeaders });
			const wb = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(wb, ws, '报名表');
			const excelBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

			const zip = new JSZip();
			zip.file('报名表.xlsx', excelBuf);

			// Attachments: one zip per person (named by "姓名"), only if submission has files.
			const nameCounts = new Map<string, number>();
			for (let i = 0; i < submissions.length; i++) {
				const row = submissions[i];
				if (!row) continue;
				const submissionId = row._id;
				if (!submissionId) continue;

				const uploadDir = join(UPLOADS_DIR, submissionId);
				let files: string[] = [];
				try {
					files = (await readdir(uploadDir)).filter((f) => f && f !== '.DS_Store');
				} catch {
					files = [];
				}
				if (!files.length) continue;

				const inner = new JSZip();
				for (const f of files) {
					const abs = join(uploadDir, f);
					const data = new Uint8Array(await Bun.file(abs).arrayBuffer());
					const displayName = f.replace(/^[^_]+_\\d+_/, '');
					inner.file(displayName || f, data);
				}

				let personRaw = `未命名_${i + 1}`;
				if (nameFieldId) personRaw = row[nameFieldId] || personRaw;
				const safePerson = String(personRaw)
					.trim()
					.replace(/\\s+/g, ' ')
					.replace(/[\\\\/:*?\"<>|]/g, '_')
					.slice(0, 50);
				const baseName = safePerson || `未命名_${i + 1}`;
				const n = (nameCounts.get(baseName) ?? 0) + 1;
				nameCounts.set(baseName, n);
				const innerName = n === 1 ? `${baseName}.zip` : `${baseName}_${n}.zip`;

				const innerBuf = await inner.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
				zip.file(innerName, innerBuf);
			}

			const zipBuf = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
			const filename = `报名导出_${new Date().toISOString().slice(0, 10)}.zip`;
			return new Response(zipBuf as any, {
				headers: {
					'Content-Type': 'application/zip',
					'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
					...corsHeaders(origin),
				},
			});
		} catch (e) {
			console.error(e);
			return new Response(JSON.stringify({ ok: false, error: String(e) }), {
				status: 500,
				headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
			});
		}
	}

	return new Response('Not Found', { status: 404, headers: corsHeaders(origin) });
}

let chosenPort = basePort;
for (let i = 0; i < maxPortAttempts; i++) {
	chosenPort = basePort + i;
	try {
		Bun.serve({
			port: chosenPort,
			fetch: handleFetch,
		});
		break;
	} catch (e: unknown) {
		const err = e as { code?: string };
		if (err?.code === 'EADDRINUSE' && i < maxPortAttempts - 1) {
			continue;
		}
		throw e;
	}
}

try {
	writeFileSync(resolve(process.cwd(), '.backend-port'), String(chosenPort), 'utf-8');
} catch {
	// ignore
}
console.log('JoinUs backend: http://localhost:' + chosenPort);
if (chosenPort !== basePort) {
	console.log('  (端口 ' + basePort + ' 已被占用，已使用 ' + chosenPort + '，前端已通过 .backend-port 自动匹配)');
}
console.log('  POST /api/submit  - 接收表单提交');
console.log('  GET  /api/export  - 导出 ZIP（含 Excel + 附件）');
