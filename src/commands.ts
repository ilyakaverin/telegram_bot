import dayjs from "dayjs";
import { getKeyboard } from "./keyboard";
import { get_new_user_request_params } from "./utils";
import { add_user } from "./api";

export const start_response = (supabase) => async (context) => {
	try {
		const { data, error } = await supabase
			.from("space_created_clients")
			.upsert(
				{
					id: context.from.id,
					username: context.from.username || `user_${context.from.id}`,
				},
				{ onConflict: "id" },
			)
			.select();

		const isNew = data[0].expiration === null;

		if (isNew) {
			const payload = get_new_user_request_params(context.from.username, dayjs().unix());
			const response = await add_user(payload);

			const { error } = await supabase.from("space_created_clients").upsert(
				{
					id: context.from.id,
					expiration: response.expire,
				},
				{ onConflict: "id" },
			);

			if (error) throw error;

			return context.send(
				`Привет, ${context.from.username}! Вот твой ключ\n${response.subscription_url}\nУ тебя есть 2 дня пробного периода, после чего ты можешь продлить срок, воспользовавшись меню`,
			);
		}

		if (error) throw error;

		await context.send(`Привет, ${context.from.username}!\n Здесь вы можете купить ключ к VPN.`);
	} catch (error) {
		console.error("Что-пошло не так", JSON.stringify(error));
		context.send("Что-пошло не так");
	}
};

export const help_response = (context) => {
	return context.send("Помощь!");
};

export const buy_response = (supabase) => async (context) => {
	try {
		const { data, error } = await supabase.from("space_created_clients").select("price").eq("id", context.from.id);

		await context.bot.api.sendInvoice({
			chat_id: context.chat.id,
			title: "1 месяц использования vpn",
			description: `Cтоимость подписки составляет ${data[0].price} 🌟. Счет действителен в течение 15 минут.`,
			payload: {
				createdAt: context.createdAt,
				expiration: data[0].expiration,
				order: Bun.randomUUIDv7(),
			},
			currency: "XTR",
			protect_content: true,
			prices: [{ label: "1 Месяц", amount: data[0].price }],
		});

		if (error) throw error;
	} catch (e) {
		console.log(e);

		context.send("Что-то пошло не так, попробуйте еще раз");
	}
};
