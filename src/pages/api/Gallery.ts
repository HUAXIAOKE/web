import fs from 'fs/promises';
import path from 'path';

export async function GET() {
	try {
		const illustrationPath = path.join(process.cwd(), 'public/img/Illustration');
		const files = await fs.readdir(illustrationPath);
		const images = files.filter((file: string) => /\.(jpg|jpeg|png|gif|webp)$/i.test(file)).map((file: string) => `/img/Illustration/${file}`);

		return new Response(JSON.stringify(images), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify([]), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}