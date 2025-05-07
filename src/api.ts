import { kv } from "./store";

class TokenManager {
	private token: string | null = null;
	private tokenExpiry: Date | null = null;
	private refreshInProgress = false;
	private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000;

	constructor(
		private readonly authUrl: string,
		private readonly credentials: { username: string; password: string; grant_type: "password" },
		private readonly tokenTtl: number = 3600 * 1000,
	) {}

	async getToken(): Promise<string> {
		if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
			return this.token;
		}

		if (!this.token || !this.tokenExpiry || new Date().getTime() + this.TOKEN_REFRESH_THRESHOLD > this.tokenExpiry.getTime()) {
			return this.refreshToken();
		}

		return this.token;
	}

	async refreshToken(): Promise<string> {
		if (this.refreshInProgress) {
			await new Promise((resolve) => {
				const check = () => {
					if (!this.refreshInProgress) {
						resolve(null);
					} else {
						setTimeout(check, 100);
					}
				};
				check();
			});
			return this.token!;
		}

		this.refreshInProgress = true;

		try {
			const cachedToken = await kv.get("auth_token");
			const cachedExpiry = await kv.get("auth_token_expiry");

			if (cachedToken && cachedExpiry && new Date(cachedExpiry) > new Date()) {
				this.token = cachedToken;
				this.tokenExpiry = new Date(cachedExpiry);
				return this.token;
			}

			const formdata = new FormData();
			formdata.append("username", this.credentials.username);
			formdata.append("password", this.credentials.password);
			formdata.append("grant_type", this.credentials.grant_type);

			const response = await fetch(this.authUrl, {
				method: "POST",
				body: formdata,
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch token: ${response.statusText}`);
			}

			const data = await response.json();

			this.token = data.access_token;
			this.tokenExpiry = new Date(Date.now() + (data.expires_in || this.tokenTtl));

			await kv.set("auth_token", this.token!);
			await kv.set("auth_token_expiry", this.tokenExpiry.toISOString());

			return this.token!;
		} finally {
			this.refreshInProgress = false;
		}
	}

	async makeAuthenticatedRequest(url: string, options?: RequestInit): Promise<Response> {
		const token = await this.getToken();

		const requestOptions = {
			...options,
			headers: {
				...options?.headers,
				Authorization: `Bearer ${token}`,
			},
		};

		const response = await fetch(url, requestOptions);

		if (response.status === 401) {
			const newToken = await this.refreshToken();
			requestOptions.headers = {
				...requestOptions.headers,
				Authorization: `Bearer ${newToken}`,
			};
			return fetch(url, requestOptions);
		}

		return response;
	}
}

export const apiTokenManager = new TokenManager(
	process.env.GET_ADMIN_TOKEN_URL!,
	{
		username: process.env.USERNAME!,
		password: process.env.PASS!,
		grant_type: "password",
	},
	3600 * 1000,
);

export const add_user = async (payload) => {
	const response = await apiTokenManager.makeAuthenticatedRequest(process.env.USER_URL!, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
	return response.json();
};

export const update_user = async (payload) => {
	const response = await apiTokenManager.makeAuthenticatedRequest(`${process.env.USER_URL!}/${payload.username}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});
	return response.json();
};

export const get_user = async (username) => {
	const response = await apiTokenManager.makeAuthenticatedRequest(`${process.env.USER_URL!}/${username}`, {
		method: "GET",
	});
	return response.json();
};
