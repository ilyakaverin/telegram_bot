import { promises as fs } from "fs";
import path from "path";

const STORAGE_PATH = path.join(process.cwd(), "src", "token_cache");

// Мьютекс для предотвращения concurrent записей
class FileMutex {
	private locked = false;
	private queue: (() => void)[] = [];

	async acquire(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.locked) {
				this.locked = true;
				resolve();
			} else {
				this.queue.push(resolve);
			}
		});
	}

	release(): void {
		if (this.queue.length > 0) {
			const next = this.queue.shift()!;
			next();
		} else {
			this.locked = false;
		}
	}
}

// Интерфейсы для типизации
interface CacheEntry {
	value: string;
	expires?: number; // timestamp в миллисекундах
}

interface CacheData {
	[key: string]: CacheEntry;
}

const mutex = new FileMutex();

export const kv = {
	async get(key: string): Promise<string | null> {
		await mutex.acquire();
		try {
			const data = await fs.readFile(STORAGE_PATH, "utf-8");
			const json: CacheData = JSON.parse(data);
			const entry = json[key];

			if (!entry) {
				return null;
			}

			// Проверяем TTL
			if (entry.expires && Date.now() > entry.expires) {
				// Токен истек, удаляем его
				delete json[key];
				await fs.writeFile(STORAGE_PATH, JSON.stringify(json, null, 2), "utf-8");
				return null;
			}

			return entry.value;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				return null;
			}
			console.error(`Error reading cache file: ${err}`);
			return null;
		} finally {
			mutex.release();
		}
	},

	async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
		await mutex.acquire();
		try {
			// Создаем директорию если она не существует
			await fs.mkdir(path.dirname(STORAGE_PATH), { recursive: true });

			let data: CacheData = {};

			try {
				const existing = await fs.readFile(STORAGE_PATH, "utf-8");
				data = JSON.parse(existing);
			} catch (err) {
				if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
					console.error(`Error reading existing cache: ${err}`);
				}
			}

			// Создаем entry с TTL если указан
			const entry: CacheEntry = { value };
			if (ttlSeconds) {
				entry.expires = Date.now() + ttlSeconds * 1000;
			}

			data[key] = entry;

			await fs.writeFile(STORAGE_PATH, JSON.stringify(data, null, 2), "utf-8");
		} catch (err) {
			console.error(`Error writing to cache file: ${err}`);
			throw err;
		} finally {
			mutex.release();
		}
	},

	async delete(key: string): Promise<boolean> {
		await mutex.acquire();
		try {
			const data = await fs.readFile(STORAGE_PATH, "utf-8");
			const json: CacheData = JSON.parse(data);

			if (!(key in json)) {
				return false;
			}

			delete json[key];
			await fs.writeFile(STORAGE_PATH, JSON.stringify(json, null, 2), "utf-8");
			return true;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				return false;
			}
			console.error(`Error deleting key from cache: ${err}`);
			return false;
		} finally {
			mutex.release();
		}
	},

	async clear(): Promise<void> {
		await mutex.acquire();
		try {
			await fs.mkdir(path.dirname(STORAGE_PATH), { recursive: true });
			await fs.writeFile(STORAGE_PATH, JSON.stringify({}, null, 2), "utf-8");
		} catch (err) {
			console.error(`Error clearing cache: ${err}`);
			throw err;
		} finally {
			mutex.release();
		}
	},

	async exists(key: string): Promise<boolean> {
		const value = await this.get(key);
		return value !== null;
	},

	// Очистка истекших токенов
	async cleanup(): Promise<number> {
		await mutex.acquire();
		try {
			const data = await fs.readFile(STORAGE_PATH, "utf-8");
			const json: CacheData = JSON.parse(data);
			const now = Date.now();
			let removedCount = 0;

			for (const [key, entry] of Object.entries(json)) {
				if (entry.expires && now > entry.expires) {
					delete json[key];
					removedCount++;
				}
			}

			if (removedCount > 0) {
				await fs.writeFile(STORAGE_PATH, JSON.stringify(json, null, 2), "utf-8");
			}

			return removedCount;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				return 0;
			}
			console.error(`Error during cleanup: ${err}`);
			return 0;
		} finally {
			mutex.release();
		}
	},
};
