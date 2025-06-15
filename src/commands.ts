import dayjs from "dayjs";
import { get_new_user_request_params } from "./utils";
import { get_user, userService } from "./api";
import { bold, formatSaveIndents, InlineKeyboard, MessageContext } from "gramio";
import db from "./lib/supabase";
import { help, payment, welcome_new } from "./lib/text";
import { ICreatePayment } from "@a2seven/yoo-checkout";
import { checkout } from "./lib/utils";

const createPayload: ICreatePayment = {
	amount: {
		value: "2.00",
		currency: "RUB",
	},
	payment_method_data: {
		type: "bank_card",
	},
	confirmation: {
		type: "redirect",
		return_url: "test",
	},
};

export const start_response = async (context: any) => {
	try {
		const user = await db.getUser(context.from.id, context.from.username);
		const isNew = user.data.expiration === null;

		if (isNew) {
			const payload = get_new_user_request_params(context.from.username, dayjs().unix());
			const response = await userService.addUser(payload);

			if (response.error) throw new Error("get_subscription_error");

			const error = await db.updateUser(context.from.id, response.data.expire);

			if (error) throw error;

			return context.send(welcome_new(context.from.username, response.data.subscription_url), {
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
	return context.send(help, {
		disable_web_page_preview: true, // Disables link preview
	});
};

export const payment_methods = (data) => async (context) => {
	const price_response = await db.getPriceAndSubscriptionExpiration(context.from.id);
	context.send(payment(price_response?.data.price),
		{
			reply_markup: new InlineKeyboard()
				.text("Выбрать telegram stars", data.pack({ id: 1, price: price_response?.data.price, expiration: price_response?.data.expiration }))
				// .row()
				// .text("Оплата картой", data.pack({ id: 2, price: price_response?.data.price, expiration: price_response?.data.expiration })),
		},
	);
};

export const buy_response = async (context) => {
	const { id, price, expiration } = context.queryData;

	const order_id = Bun.randomUUIDv7();

	const update_invoice_error = await db.updateInvoice(context.from.id, order_id, false);

	if (update_invoice_error) {
		context.send("Произошла ошибка, Выберите способ оплаты еще раз");

		return;
	}

	switch (id) {
		case 1:
			{
				try {
					await context.bot.api.sendInvoice({
						chat_id: context.message.chat.id,
						title: "Счет на оплату подписки на 1 месяц",
						description: `Счет действителен в течение 15 минут.`,
						payload: {
							createdAt: context.message.createdAt,
							expiration: expiration,
							order_id,
						},
						currency: "XTR",
						protect_content: true,
						prices: [{ label: "1 Месяц", amount: price }],
					});
				} catch (e) {
					console.log(e);
					context.send("Что-то пошло не так, попробуйте еще раз");
				}
			}
			break;
		case 2:
			{
				try {
					const payment = await checkout.createPayment(createPayload, order_id);
					context.send(
						formatSaveIndents`Оплата подписки на 1 месяц:
					Стоимость: ${bold(price)} ₽
					Подписка до: ${bold(dayjs.unix(Number(expiration)).add(1, "month").format("DD.MM.YYYY"))}
					Номер заказа: ${order_id}
					`,
						{
							reply_markup: new InlineKeyboard().url(`Оплатить ${price} ₽`, payment.confirmation.confirmation_url!), //.row().url("Оферта", process.env.OFERTA!),
						},
					);
				} catch (error) {
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
		const response = await get_user(context.from.username);

		context.send(`Ключ: ${response.subscription_url}\nПодписка действует до: ${dayjs.unix(response.expire).format("DD.MM.YYYY")}`);
	} catch (e) {
		console.log(e);
		context.send("Ошибка");
	}
};
