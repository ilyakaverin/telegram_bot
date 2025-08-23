import dayjs from "dayjs";

export const get_new_user_request_params = (username: string, telegramId: number) => ({
	username,
	expireAt: dayjs().add(2, "day").toISOString(),
	telegramId,
	activeInternalSquads: ['53732a0b-15d9-4f13-ae3f-561a1012a480'],
});

export const get_modified_user_params = (expiration: number, uuid: string) => ({
	uuid,
	expireAt: dayjs(expiration).add(1, "month").toISOString(),
});
