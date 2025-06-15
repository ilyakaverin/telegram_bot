import dayjs from "dayjs";
import { userService } from "../api";
import { welcome_new } from "../lib/text";
import { get_new_user_request_params } from "../utils";
import db from "../lib/supabase";

export const start_response = async (context) => {
	try {
		if (!context?.from?.id || !context?.message?.from?.id) {
			throw new Error("Invalid Telegram context");
		}
		const telegramUserId = parseInt(context.from.id);
		if (!telegramUserId || telegramUserId <= 0) {
			throw new Error("Invalid Telegram user ID");
		}

		const user = await db.getUser(context.from.id, context.from.username);
		const isNew = user.data.expiration === null;

		if (isNew) {
			const payload = get_new_user_request_params(context.from.username, dayjs().unix());
			const response = await userService.addUser(payload);

			const error = await db.updateUser(context.from.id, response.expire);

			if (error) throw error;

			return context.send(welcome_new(context.from.username, response.subscription_url));
		}

		if (user.error) throw user.error;

		await context.send(`Привет, ${context.from.username}!\n Воспользуйся меню для покупки подписки/просмотра профиля.`);
	} catch (error) {
		console.error("Что-пошло не так", JSON.stringify(error));
		context.send("Что-пошло не так, нажми /start еще раз");
	}
};
