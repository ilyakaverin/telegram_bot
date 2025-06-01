import dayjs from "dayjs";
import { get_new_user_request_params } from "./utils";
import { add_user, get_user } from "./api";
import { InlineKeyboard } from "gramio";
import { getOrderParameters } from "./lib/utils";
import db from "./lib/supabase";
import { Robokassa } from "@dev-aces/robokassa";

export const start_response = async (context) => {
	try {
		const user = await db.getUser(context.from.id, context.from.username);
		const isNew = user.data.expiration === null;

		if (isNew) {
			const payload = get_new_user_request_params(context.from.username, dayjs().unix());
			const response = await add_user(payload);

			const error = await db.updateUser(context.from.id, response.expire);

			if (error) throw error;

			return context.send(
				`Привет, ${context.from.username}! Это комфортный и безопасный VPN\nВот твой ключ\n${response.subscription_url}\nУ тебя есть 2 дня пробного периода, после чего ты можешь продлить срок, воспользовавшись меню`,
			);
		}

		if (user.error) throw user.error;

		await context.send(`Привет, ${context.from.username}!\n Воспользуйся меню для покупки подписки/просмотра профиля.`);
	} catch (error) {
		console.error("Что-пошло не так", JSON.stringify(error));
		context.send("Что-пошло не так, нажми /start еще раз");
	}
};

export const help_response = (context) => {
	return context.send("Раздел наполняется");
};

export const payment_methods = (data) => (context) => {
	context.send("Выберите метод оплаты", {
		reply_markup: new InlineKeyboard()
			.text("Telegram stars", data.pack({ id: 1 }))
			.row()
			.text("Банковская карта", data.pack({ id: 2 })),
	});
};

export const buy_response = (robokassa: Robokassa) => async (context) => {
	const [price_response, highestOrderNumber] = await Promise.all([
		db.getPriceAndSubscriptionExpiration(context.from.id),
		db.getHighestOrderNumber(context.from.id),
	]);

	const invoice_id = highestOrderNumber + 1;
	const order_id = Bun.randomUUIDv7();

	const update_invoice_error = await db.updateInvoice(context.from.id, invoice_id, order_id, false);

	if (update_invoice_error || price_response?.error) {
		context.send("Произошла ошибка, Выберите способ оплаты еще раз");

		return;
	}

	const params = getOrderParameters(context.from.id, price_response?.data.price!, invoice_id, order_id, price_response?.data.expiration!);
	const url = robokassa.generatePaymentUrl(params);

	switch (context.queryData.id) {
		case 1:
			{
				try {
					await context.bot.api.sendInvoice({
						chat_id: context.message.chat.id,
						title: "Оплата подписки на 1 месяц",
						description: `Счет действителен в течение 15 минут.`,
						payload: {
							createdAt: context.message.createdAt,
							expiration: price_response?.data.expiration,
							order: invoice_id,
						},
						currency: "XTR",
						protect_content: true,
						prices: [{ label: "1 Месяц", amount: price_response?.data.price }],
					});
				} catch (e) {
					console.log(e);
					context.send("Что-то пошло не так, попробуйте еще раз");
				}
			}
			break;
		case 2:
			{
				context.send("Оплата подписки на 1 месяц", {
					reply_markup: new InlineKeyboard().url(`Оплатить ${price_response?.data.price} ₽`, url).row().url("Оферта", process.env.OFERTA!),
				});
			}

			break;
		default:
			context.send("unknown");
	}
};

export const profile_response = async (context) => {
	try {
		const response = await get_user(context.from.username);

		context.send(`Ключ: ${response.subscription_url}\nПодписка действует до: ${dayjs.unix(response.expire).format("DD.MM.YYYY")}`);
	} catch (e) {
		console.log(e);
		context.send("Ошибка");
	}
};
