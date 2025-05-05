import { BotLike, Keyboard, MessageContext } from "gramio";
import { get_modified_user_params, get_new_user_request_params, time } from "./utils";
import { add_user, update_user } from "./api";

export const on_message = (context) => {
	return context.send("Выберите действие в меню");
};

export const on_successful_payment = async (context) => {
	await context.send("Платеж получен! Доставляем товар...");
	// Логика доставки цифрового товара
};

export const on_precheckout_query = async (context) => {
	const { invoicePayload } = context;
	const { expiration, createdAt } = JSON.parse(invoicePayload);

	console.log(time().diff(createdAt, 'minutes'))


	// const payload = expiration
	// 	? get_modified_user_params()
	// 	: get_new_user_request_params(context.from.username);

	// const request = expiration ? update_user : add_user;

	// try {
	// 	const response = await request(payload);

	// 	console.log(response);
	// } catch (e) {
	// 	console.log("e", e);
	// }

	return context.answer({
		ok: false,
		error_message: "У вас уже есть подписка",
	});
};
