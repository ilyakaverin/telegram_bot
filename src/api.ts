import { TokenManager } from "./lib/token-manager";

// Конфигурация API
const API_CONFIG = {
  baseUrl: process.env.API_BASE_URL || '',
  endpoints: {
    auth: process.env.GET_ADMIN_TOKEN_URL!,
    users: process.env.USER_URL!,
  },
  credentials: {
    username: process.env.USERNAME!,
    password: process.env.PASS!,
    grant_type: "password" as const,
  },
  tokenTtl: 3600 * 1000,
} as const;

// Инициализация токен менеджера
export const apiTokenManager = new TokenManager(
  API_CONFIG.endpoints.auth,
  API_CONFIG.credentials,
  API_CONFIG.tokenTtl,
);

// Типы для API
export interface User {
  username: string;
  email?: string;
  // Добавьте другие поля пользователя
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

// Базовый API клиент
class ApiClient {
  constructor(private tokenManager: TokenManager) {}

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.tokenManager.makeAuthenticatedRequest(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      return {
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data.message || data.error || 'Request failed',
        status: response.status,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
      };
    }
  }

  // HTTP методы
  async get<T = any>(endpoint: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T = any>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, body?: any, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = any>(endpoint: string, options?: Omit<RequestInit, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Создаем экземпляр API клиента
export const apiClient = new ApiClient(apiTokenManager);

// Специализированный класс для работы с пользователями
class UserService {
  private readonly baseEndpoint = API_CONFIG.endpoints.users;

  constructor(private client: ApiClient) {}

  async addUser(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.client.post<User>(this.baseEndpoint, userData);
  }

  async updateUser(username: string, userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.client.put<User>(`${this.baseEndpoint}/${username}`, userData);
  }

  async getUser(username: string): Promise<ApiResponse<User>> {
    return this.client.get<User>(`${this.baseEndpoint}/${username}`);
  }

  async deleteUser(username: string): Promise<ApiResponse<void>> {
    return this.client.delete(`${this.baseEndpoint}/${username}`);
  }

  async getUsers(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<User[]>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const query = searchParams.toString();
    const endpoint = query ? `${this.baseEndpoint}?${query}` : this.baseEndpoint;
    
    return this.client.get<User[]>(endpoint);
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
