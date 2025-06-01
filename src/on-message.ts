import { get_modified_user_params } from "./utils";
import { update_user } from "./api";
import dayjs from "dayjs";
import { create_invoice, get_query_string } from "./lib/create-invoice";

export const on_message = (context) => {
	return context.send("Выберите действие из меню");
};

export const on_successful_payment = (supabase) => async (context) => {
	const { invoicePayload, telegramPaymentChargeId } = context.eventPayment;
	const { order } = JSON.parse(invoicePayload);

	try {
		const { error } = await supabase.from("space_created_invoices").upsert(
			{
				id: context.from.id,
				invoice_id: order,
				paid: true,
				transaction_id: telegramPaymentChargeId,
				chat_id: context.chat.id,
			},
			{ onConflict: "invoice_id" },
		);

		if (error) throw error;
		await context.send("Продлили еще на месяц!");
	} catch (e) {
		console.log(e);
		context.send("Что-то пошло не так");
	}
};

export const on_precheckout_query = (supabase) => async (context) => {
	const { invoicePayload } = context;
	const { expiration, createdAt, order } = JSON.parse(invoicePayload);

	const is_invoice_expired = dayjs().unix() - createdAt > 900;

	const { data } = await supabase.from("space_created_invoices").select("paid").eq("invoice_id", order);

	const { paid } = data[0] || { paid: false };

	if (is_invoice_expired || paid) {
		return context.answer({
			ok: false,
			error_message: "Счет недействителен",
		});
	}

	try {
		const response = await update_user(get_modified_user_params(expiration, context.from.username));

		const { error } = await supabase.from("space_created_clients").upsert(
			{
				id: context.from.id,
				expiration: response.expire,
			},
			{ onConflict: "id" },
		);

		if (error) throw error;

		return context.answer({
			ok: true,
		});
	} catch (e) {
		console.log("e", e);
	}
};
