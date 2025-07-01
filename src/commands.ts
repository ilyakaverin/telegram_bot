import dayjs from "dayjs";
import { get_new_user_request_params } from "./utils";
import { get_user, userService } from "./api";
import { bold, formatSaveIndents, InlineKeyboard, MessageContext } from "gramio";
import db from "./lib/supabase";
import { payment, profile, welcome_new } from "./lib/text";
import { ICreatePayment } from "@a2seven/yoo-checkout";
import { checkout } from "./lib/utils";
import { uniqueNamesGenerator, adjectives, colors, animals } from "unique-names-generator";
import { kv } from "./store";

const createPayload = (price, user_id, order_id, expireAt, uuid, email): ICreatePayment => ({
	amount: {
		value: price,
		currency: "RUB",
	},
	payment_method_data: {
		type: "bank_card",
	},
	metadata: {
		user_id,
		order_id,
		expireAt,
		uuid,
	},
	confirmation: {
		type: "redirect",
		return_url: "https://t.me/createdspacebot",
	},
	description: `Оплата заказа ${order_id}`,
	receipt: {
		// Если нужен чек
		customer: {
			email,
		},
		items: [
			{
				description: "Оплата подписки",
				quantity: "1.00",
				amount: {
					value: price,
					currency: "RUB",
				},
				vat_code: 1,
			},
		],
	},
});

export const start_response = async (context: any) => {
	try {
		const user = await db.getUser(context.from.id, context.from.username);
		const isNew = user.data.expireAt === null;

		if (isNew) {
			const randomName = uniqueNamesGenerator({ dictionaries: [adjectives, colors], length: 2 });
			const payload = get_new_user_request_params(randomName, context.from.id);
			const response = await userService.addUser(payload);

			if (response.error) throw new Error("get_subscription_error");

			const { expireAt, uuid, subscriptionUrl } = response.data.response;

			const error = await db.updateUser(context.from.id, expireAt, uuid);

			if (error) throw error;

			return context.send(welcome_new(subscriptionUrl), {
				disable_web_page_preview: true, // Disables link preview
			});
		}

		if (user.error) throw user.error;

		await context.send(`Привет, ${context.from.username}!\n Воспользуйся меню для покупки подписки/просмотра профиля.`);
	} catch (error) {
		console.error("Что-пошло не так", JSON.stringify(error));
		context.send("Что-пошло не так, нажми /start еще раз");
	}
};

export const help_response = (context) => {
	return context.send("Помощь в решении вопросов - https://t.me/kekisonline", {
		disable_web_page_preview: true, // Disables link preview
	});
};

export const payment_methods = (data) => async (context) => {
	try {
		const response = await db.getUserData(context.from.id, "price");

		const { price } = response;

		context.send(payment(price), {
			reply_markup: new InlineKeyboard().text("Выбрать оплату банковской картой", data.pack({ id: 2, price: price })),
			// .row()
			// .text("Выбрать оплату telegram stars", data.pack({ id: 1, price })),
		});
	} catch (e) {
		console.log("e");
	}
};

export const buy_response = async (context) => {
	const { id, price } = context.queryData;

	if(id === 3) {
		await kv.delete(context.from.id);
		context.send('Ввод почты отменен');
		return
	}

	const response = await db.getUserData(context.from.id, "expireAt, uuid, email");

	const { expireAt, uuid, email } = response;

	if (!email) {
		context.send("Для проведения оплат, привяжите почту, туда будут приходить чеки, кнопка для привязки почты в меню 🔽");
		return;
	}

	const order_id = Bun.randomUUIDv7();

	const update_invoice_error = await db.updateInvoice(context.from.id, order_id, false);

	if (update_invoice_error) {
		context.send("Произошла ошибка, Выберите способ оплаты еще раз");

		return;
	}

	switch (id) {
		// case 1:
		// 	{
		// 		try {
		// 			await context.bot.api.sendInvoice({
		// 				chat_id: context.message.chat.id,
		// 				title: "Счет на оплату подписки на 1 месяц",
		// 				description: `Счет действителен в течение 15 минут.`,
		// 				payload: {
		// 					createdAt: context.message.createdAt,
		// 					expireAt,
		// 					order_id,
		// 				},
		// 				currency: "XTR",
		// 				protect_content: true,
		// 				prices: [{ label: "1 Месяц", amount: price }],
		// 			});
		// 		} catch (e) {
		// 			console.log(e);
		// 			context.send("Что-то пошло не так, попробуйте еще раз");
		// 		}
		// 	}
		// 	break;
		case 2:
			{
				try {
					const payment = await checkout.createPayment(createPayload(price, context.from.id, order_id, expireAt, uuid, email), order_id);

					if (!payment.confirmation) {
						throw new Error("error");
					}

					context.send(
						formatSaveIndents`Оплата подписки на 1 месяц:
					Стоимость: ${bold(price)} ₽
					Подписка до: ${bold(dayjs(expireAt).add(1, "month").format("DD.MM.YYYY"))}
					Номер заказа: ${order_id}
					`,
						{
							reply_markup: new InlineKeyboard().url(`Оплатить ${price} ₽`, payment.confirmation.confirmation_url!),
						},
					);
				} catch (error) {
					context.send("Что-то пошло не так, попробуйте нажать выбрать оплату еще раз.");
					console.error(error);
				}
			}

			break;
		default:
			context.send("unknown");
	}
};

export const profile_response = async (context) => {
	try {
		const response = await userService.getUser(context.from.id);

		const { subscriptionUrl, expireAt } = response.data.response[0];

		context.send(profile(subscriptionUrl, expireAt));
	} catch (e) {
		console.log(e);
		context.send("Ошибка");
	}
};
