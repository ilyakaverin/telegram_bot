import { fetchSystem } from "./api";
import { getKeyboard } from "./keyboard";

export const start_response = (supabase, buttonData: Record<never, never>) => async (context) => {
	const userData = {
		telegram_id: context.from.id,
		username: context.from.username || null,
	};

	try {
		let { data: client, error } = await supabase
			.from("space_created_clients")
			.select("telegram_id")
			.eq("telegram_id", context.from.id);

		if (client.length !== 0) {
			await context.send(`Привет ${userData.username}!`, getKeyboard(buttonData));
			return;
		} else {
			const { error } = await supabase
				.from("space_created_clients")
				.insert(userData, { onConflict: "telegram_id" });
			await context.send(
				`Привет, ${userData.username}! Здесь вы купить ключ к VPN. `,
				getKeyboard(buttonData),
			);

			if (error) throw error;
		}

		if (error) throw error;
	} catch (error) {
		console.error("Что-пошло не так", JSON.stringify(error));
		context.send("Что-пошло не так");
	}
};

export const help_response = (context) => {
	return context.send("Помощь!");
};

export const keyboard_response = async (context) => {
	try {
		const response = await fetchSystem();
		context.send(
			`Вы выбрали действие с ID: ${context.queryData.action_id} ${JSON.stringify(response)}`,
		);
		console.log(response);
	} catch (e) {
		console.error(e);
	}
};
