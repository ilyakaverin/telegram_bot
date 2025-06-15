import { get_modified_user_params } from "./utils";
import { update_user } from "./api";
import dayjs from "dayjs";
import db from "./lib/supabase";

export const on_message = (context) => {
	return context.send("Выберите действие из меню");
};

export const on_successful_payment = async (context) => {
	const { invoicePayload } = context.eventPayment;
	const { expiration } = JSON.parse(invoicePayload);

	try {
		await context.send(`Продлили еще на месяц! Подписка действует до ${dayjs.unix(Number(expiration)).add(1, "month").format("DD.MM.YYYY")}`);
	} catch (e) {
		console.log(e);
		context.send("Что-то пошло не так");
	}
};

export const on_precheckout_query = async (context) => {
	const { invoicePayload } = context;
	const { expiration, createdAt, order_id } = JSON.parse(invoicePayload);

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
		const response = await update_user(get_modified_user_params(expiration, context.from.username));
		const update_invoice_error = await db.updateInvoice(context.from.id, order_id, true);

		const error = await db.updateUser(context.from.id, response.expire);

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
