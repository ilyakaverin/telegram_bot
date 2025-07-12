import { Bot, CallbackData, formatSaveIndents, InlineKeyboard, link } from "gramio";
import { buy_response, help_response, payment_methods, profile_response, start_response } from "./commands";
import { limit_consumer } from "./lib/rate-limiter";
import { on_message, on_precheckout_query, on_successful_payment } from "./on-message";
import Elysia from "elysia";
import { checkout, validateWebhook } from "./lib/utils";
import db from "./lib/supabase";
import { userService } from "./api";
import { get_modified_user_params } from "./utils";
import dayjs from "dayjs";
import { success_text } from "./lib/text";
import { kv } from "./store";

const the_one_ring = process.env.THE_ONE_RING;
const data = new CallbackData("action").number("id");

if (!the_one_ring) {
	throw new Error("the one ring fell into mount doom");
}

const email_query = (context) => {
	kv.set(context.from.id, "waiting_email", 100_000);

	context.send(
		formatSaveIndents`Введите вашу почту.
Отправляя вашу почту вы соглашаетесь с ${link("политикой", "https://docs.google.com/document/d/1tJTYrb5WYf1TAHEehtJ1KJa9zFRVIPvpUy7coS-6EJ0/edit?usp=drive_link")} обработки персональных данных`,
		{
			reply_markup: new InlineKeyboard().text("Отменить ввод почты", data.pack({ id: 3 })),
			disable_web_page_preview: true,
		},
	);
};

const bot = new Bot(the_one_ring)
	.use(limit_consumer)
	.command("start", start_response)
	.command("help", help_response)
	.callbackQuery(data, buy_response)
	.command("buy", payment_methods(data))
	.command("profile", profile_response)
	.command("email", email_query)
	.on("message", on_message)
	.on("pre_checkout_query", on_precheckout_query)
	.on("successful_payment", on_successful_payment);

bot.start();

const app = new Elysia()
	// .use(ipFilter)
	.post("/eagle", async ({ body }) => {
		if (!body?.object?.metadata) return "I SEE YOU";

		const { expireAt, order_id, user_id, uuid } = body?.object.metadata;

		const newExpire = dayjs(expireAt).add(1, "month").toISOString();

		switch (body.event) {
			case "payment.waiting_for_capture":
				{
					try {
						const error = await db.updateUser(Number(user_id), newExpire, uuid);

						const response = await userService.updateUser(get_modified_user_params(expireAt, uuid));

						if (response.error || error) throw response.error || error;

						await checkout.capturePayment(body.object.id, { amount: body.object.amount }, order_id);
					} catch (e) {
						await checkout.cancelPayment(body.object.id, order_id);
						bot.api.sendMessage({
							chat_id: user_id,
							text: `Что-то пошло не так.\n Заказ ${order_id} будет отменен`,
						});
					}
				}
				break;
			case "payment.succeeded":
				{
					try {
						const update_invoice_error = await db.updateInvoice(user_id, order_id, true);

						if (update_invoice_error) throw update_invoice_error;

						bot.api.sendMessage({
							chat_id: user_id,
							text: success_text(dayjs(expireAt).add(1, "month").format("DD.MM.YYYY")),
						});
					} catch (e) {
						bot.api.sendMessage({
							chat_id: process.env.ADMIN_ID!,
							text: `Оплата прошла, подписка у ${user_id} продлена, но инвойс в true не перешел`,
						});
					}
				}
				break;
			default: {
				console.log("no event");
				return;
			}
		}
	})
	.post('/palantir', ({ body, headers}) => {
		if(!validateWebhook({ body, headers })) return 'I SEE YOU';

	})
	.listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

