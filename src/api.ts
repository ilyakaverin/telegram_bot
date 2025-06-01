import { TokenManager } from "./lib/token-manager";

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
