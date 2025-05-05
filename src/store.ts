import { promises as fs } from "fs";
import path from "path";

const STORAGE_PATH = path.join(process.cwd(), "/src/.token_cache");

export const kv = {
	async get(key: string): Promise<string | null> {
		try {
			const data = await fs.readFile(STORAGE_PATH, "utf-8");
			const json = JSON.parse(data);
			return json[key] || null;
		} catch (err) {
			return null;
		}
	},

	async set(key: string, value: string): Promise<void> {
		let data = {};
		try {
			const existing = await fs.readFile(STORAGE_PATH, "utf-8");
			data = JSON.parse(existing);
		} catch (err) {
			console.error("File doesn`t exist yet");
		}

		data[key] = value;
		await fs.writeFile(STORAGE_PATH, JSON.stringify(data));
	},
};
