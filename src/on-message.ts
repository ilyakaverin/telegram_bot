import { get_modified_user_params } from "./utils";
import { update_user, userService } from "./api";
import dayjs from "dayjs";
import db from "./lib/supabase";

export const on_message = (context) => {
	return context.send("Выберите действие из меню");
};

export const on_successful_payment = async (context) => {
	const { invoicePayload } = context.eventPayment;
	const { expireAt } = JSON.parse(invoicePayload);

	try {
		await context.send(`Продлили еще на месяц! Подписка действует до ${dayjs(expireAt).add(1, "month").format("DD.MM.YYYY")}`);
	} catch (e) {
		console.log(e);
		context.send("Что-то пошло не так");
	}
};

export const on_precheckout_query = async (context) => {
	const { invoicePayload } = context;
	const { expireAt, createdAt, order_id } = JSON.parse(invoicePayload);

	const is_invoice_expired = dayjs().unix() - createdAt > 900;

	const { data, error } = await db.checkInvoice(order_id);

	const { paid } = data;

	if (error) {
		return context.answer({
			ok: false,
			error_message: "Что-то пошло не так, попробуйте еще раз.",
		});
	}

	if (is_invoice_expired || paid) {
		return context.answer({
			ok: false,
			error_message: "Счет недействителен",
		});
	}

	try {
		const user = await db.getUserData(context.from.id, "uuid");
		const response = await userService.updateUser(get_modified_user_params(expireAt, user.uuid));

		const update_invoice_error = await db.updateInvoice(context.from.id, order_id, true);

		const error = await db.updateUser(context.from.id, response.data.response.expireAt, user.uuid);

		if (error || update_invoice_error) throw error || update_invoice_error;

		return context.answer({
			ok: true,
		});
	} catch (e) {
		context.answer({
			ok: false,
			error_message: "Что-то пошло не так, попробуйте еще раз.",
		});
	}
};
