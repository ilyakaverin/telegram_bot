const baseUrl = process.env.API_BASE_URL;

// Конфигурация API
const API_CONFIG = {
	baseUrl: process.env.API_BASE_URL || "",
	endpoints: {
		users: process.env.USER_URL!,
		byId: `${baseUrl}/api/users/by-telegram-id`,
	},
	credentials: {
		username: process.env.USERNAME!,
		password: process.env.PASS!,
		grant_type: "password" as const,
	},
	tokenTtl: 3600 * 1000,
} as const;

// Типы для API
export interface User {
	expire: number;
	subscription_url: string;
	// Добавьте другие поля пользователя
}

export interface ApiResponse<T = any> {
	data?: T;
	error?: string;
	status: number;
}

// Базовый API клиент
class ApiClient {
	constructor() {}

	private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
		try {
			const response = await fetch(endpoint, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.API_KEY!}`,
					...options.headers,
				},
				...options,
			});

			const data = await response.json();

			return {
				data: response.ok ? data : undefined,
				error: response.ok ? undefined : data.message || data.error || "Request failed",
				status: response.status,
			};
		} catch (error) {
			console.error("API request failed:", error);
			return {
				error: error instanceof Error ? error.message : "Unknown error",
				status: 0,
			};
		}
	}

	// HTTP методы
	async get<T = any>(endpoint: string, options?: Omit<RequestInit, "method" | "body">): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { ...options, method: "GET" });
	}

	async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestInit, "method" | "body">): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			...options,
			method: "POST",
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestInit, "method" | "body">): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			...options,
			method: "PUT",
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestInit, "method" | "body">): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, {
			...options,
			method: "PATCH",
			body: body ? JSON.stringify(body) : undefined,
		});
	}

	async delete<T = any>(endpoint: string, options?: Omit<RequestInit, "method" | "body">): Promise<ApiResponse<T>> {
		return this.request<T>(endpoint, { ...options, method: "DELETE" });
	}
}

// Создаем экземпляр API клиента
export const apiClient = new ApiClient();

// Специализированный класс для работы с пользователями
class UserService {
	private readonly usersEndpoint = API_CONFIG.endpoints.users;
	private readonly getByTelegramId = API_CONFIG.endpoints.byId;

	constructor(private client: ApiClient) {}

	async addUser(userData: Partial<User>): Promise<ApiResponse<User>> {
		return this.client.post<User>(this.usersEndpoint, userData);
	}

	async updateUser(userData: Partial<User>): Promise<ApiResponse<User>> {
		return this.client.patch<User>(this.usersEndpoint, userData);
	}

	async getUser(telegramId: number): Promise<ApiResponse<User>> {
		return this.client.get<User>(`${this.getByTelegramId}/${telegramId}`);
	}
}

// Экспортируем сервис пользователей
export const userService = new UserService(apiClient);

// Backward compatibility - старые функции (deprecated)
/**
 * @deprecated Используйте userService.addUser() вместо этого
 */
export const add_user = async (payload: Partial<User>) => {
	const result = await userService.addUser(payload);

	if (result.error) {
		throw new Error(result.error);
	}
	return result.data;
};

/**
 * @deprecated Используйте userService.updateUser() вместо этого
 */
export const update_user = async (payload: User) => {
	const result = await userService.updateUser(payload.username, payload);
	if (result.error) {
		throw new Error(result.error);
	}
	return result.data;
};

/**
 * @deprecated Используйте userService.getUser() вместо этого
 */
export const get_user = async (username: string) => {
	const result = await userService.getUser(username);
	if (result.error) {
		throw new Error(result.error);
	}
	return result.data;
};
