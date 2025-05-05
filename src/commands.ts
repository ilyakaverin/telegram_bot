import { getKeyboard } from "./keyboard";

export const start_response =
	(supabase, buttonData: Record<never, never>, keyboard) => async (context) => {
		try {
			const { error } = await supabase.from("space_created_clients").upsert(
				{
					id: context.from.id,
					username: context.from.username || `user_${context.from.id}`,
				},
				{ onConflict: "id" },
			);

			if (error) throw error;

			await context.send(
				`Привет, ${context.from.username}! Здесь вы можете купить ключ к VPN.`,
				getKeyboard(buttonData, keyboard),
			);
		} catch (error) {
			console.error("Что-пошло не так", JSON.stringify(error));
			context.send("Что-пошло не так");
		}
	};

export const help_response = (context) => {
	return context.send("Помощь!");
};

export const keyboard_response = (buttonData, keyboard, supabase) => async (context) => {
	switch (context.queryData.action_id) {
		case 1:
			{
				const { data } = await supabase
					.from("space_created_clients")
					.select("price")
					.eq("id", context.from.id);

				await context.bot.api.sendInvoice({
					chat_id: context.message.chat.id,
					title: "1 месяц использования vpn",
					description: `Cтоимость подписки составляет ${data[0].price} 🌟. Счет действителен в течение 15 минут.`,
					payload: { createdAt: context.message.createdAt, expiration: data[0].expiration },
					currency: "XTR",
					protect_content: true,
					prices: [{ label: "1 Месяц", amount: data[0].price }],
				});
			}
			break;
		default:
			context.send(`Пон`);
			break;
	}
};
