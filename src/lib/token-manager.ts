import { kv } from "../store";

export class TokenManager {
    private token: string | null = null;
    private tokenExpiry: Date | null = null;
    private refreshPromise: Promise<string> | null = null;
    private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;
    private readonly CACHE_KEY = "auth_token";

    constructor(
        private readonly authUrl: string,
        private readonly credentials: { username: string; password: string; grant_type: "password" },
        private readonly tokenTtl: number = 3600 * 1000,
    ) {}

    async getToken(): Promise<string> {
        // Проверяем memory cache
        if (this.isTokenValid()) {
            return this.token!;
        }

        // Проверяем нужно ли обновить токен
        if (this.shouldRefreshToken()) {
            return this.refreshToken();
        }

        return this.token!;
    }

    private isTokenValid(): boolean {
        return this.token !== null && 
               this.tokenExpiry !== null && 
               new Date() < this.tokenExpiry;
    }

    private shouldRefreshToken(): boolean {
        return !this.token || 
               !this.tokenExpiry || 
               new Date().getTime() + this.TOKEN_REFRESH_THRESHOLD > this.tokenExpiry.getTime();
    }

    async refreshToken(): Promise<string> {
        // Используем Promise для предотвращения race conditions
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.performTokenRefresh();
        
        try {
            const token = await this.refreshPromise;
            return token;
        } finally {
            this.refreshPromise = null;
        }
    }

    private async performTokenRefresh(): Promise<string> {
        try {
            // Сначала проверяем кеш
            const cachedToken = await this.loadTokenFromCache();
            if (cachedToken) {
                return cachedToken;
            }

            // Запрашиваем новый токен
            return await this.fetchNewToken();
        } catch (error) {
            console.error('Token refresh failed:', error);
            throw error;
        }
    }

    private async loadTokenFromCache(): Promise<string | null> {
        try {
            const cachedToken = await kv.get(this.CACHE_KEY);
            
            if (cachedToken) {
                // kv автоматически проверяет TTL, если токен вернулся - он валиден
                this.token = cachedToken;
                // Устанавливаем примерное время истечения (можно улучшить)
                this.tokenExpiry = new Date(Date.now() + this.tokenTtl);
                return cachedToken;
            }
        } catch (error) {
            console.error('Failed to load token from cache:', error);
            // Продолжаем выполнение, получим новый токен
        }
        
        return null;
    }

    private async fetchNewToken(): Promise<string> {
        const formdata = new FormData();
        formdata.append("username", this.credentials.username);
        formdata.append("password", this.credentials.password);
        formdata.append("grant_type", this.credentials.grant_type);

        const response = await fetch(this.authUrl, {
            method: "POST",
            body: formdata,
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.access_token) {
            throw new Error('Invalid token response: missing access_token');
        }

        this.token = data.access_token;
        this.tokenExpiry = new Date(Date.now() + (data.expires_in ? data.expires_in * 1000 : this.tokenTtl));

        // Сохраняем в кеш с TTL
        await this.saveTokenToCache();

        return this.token;
    }

    private async saveTokenToCache(): Promise<void> {
        try {
            if (this.token && this.tokenExpiry) {
                const ttlSeconds = Math.floor((this.tokenExpiry.getTime() - Date.now()) / 1000);
                if (ttlSeconds > 0) {
                    await kv.set(this.CACHE_KEY, this.token, ttlSeconds);
                }
            }
        } catch (error) {
            console.error('Failed to save token to cache:', error);
            // Не бросаем ошибку, токен все равно работает
        }
    }

    async makeAuthenticatedRequest(url: string, options?: RequestInit): Promise<Response> {
        const token = await this.getToken();

        const requestOptions: RequestInit = {
            ...options,
            headers: {
                ...options?.headers,
                Authorization: `Bearer ${token}`,
            },
        };

        const response = await fetch(url, requestOptions);

        // Если токен невалиден, пробуем обновить его один раз
        if (response.status === 401) {
            try {
                // Принудительно обновляем токен
                this.token = null;
                this.tokenExpiry = null;
                
                const newToken = await this.refreshToken();
                const retryOptions: RequestInit = {
                    ...options,
                    headers: {
                        ...options?.headers,
                        Authorization: `Bearer ${newToken}`,
                    },
                };
                
                return fetch(url, retryOptions);
            } catch (error) {
                console.error('Token refresh failed during retry:', error);
                // Возвращаем оригинальный 401 ответ
                return response;
            }
        }

        return response;
    }

    // Дополнительные методы для управления
    async clearToken(): Promise<void> {
        this.token = null;
        this.tokenExpiry = null;
        this.refreshPromise = null;
        
        try {
            await kv.delete(this.CACHE_KEY);
        } catch (error) {
            console.error('Failed to clear token from cache:', error);
        }
    }

    isAuthenticated(): boolean {
        return this.isTokenValid();
    }
}
