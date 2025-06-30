import { Bot, CallbackData } from "gramio";
import { buy_response, help_response, payment_methods, profile_response, start_response } from "./commands";
import { limit_consumer } from "./lib/rate-limiter";
import { on_message, on_precheckout_query, on_successful_payment } from "./on-message";
import Elysia from "elysia";
import { checkout, ipFilter } from "./lib/utils";
import db from "./lib/supabase";
import { update_user, userService } from "./api";
import { get_modified_user_params } from "./utils";
import dayjs from "dayjs";
import { success_text } from "./lib/text";

const the_one_ring = process.env.THE_ONE_RING;
const data = new CallbackData("action").number("price");

if (!the_one_ring) {
	throw new Error("the one ring fell into mount doom");
}

const bot = new Bot(the_one_ring)
	.use(limit_consumer)
	.command("start", start_response)
	.command("help", help_response)
	.command("buy", payment_methods(data))
	.command("profile", profile_response)
	.callbackQuery(data, buy_response)
	.on("message", on_message)
	.on("pre_checkout_query", on_precheckout_query)
	.on("successful_payment", on_successful_payment);

bot.start();

const app = new Elysia()
	// .use(ipFilter)
	.post("/eagle", async ({ body }) => {

		const { expireAt, order_id, user_id, uuid } = body?.object.metadata;

		switch (body.event) {
			case "payment.waiting_for_capture":
				{
					try {
						const update_invoice_error = await db.updateInvoice(user_id, order_id, true);

						const response = await userService.updateUser(get_modified_user_params(expireAt, uuid));

						if (update_invoice_error || response.error) throw update_invoice_error || response.error;

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
			case "payment.succeeded": {
				bot.api.sendMessage({
					chat_id: user_id,
					text: success_text(dayjs(expireAt).add(1, "month").format("DD.MM.YYYY")),
				});
			}
			break;
			default: {
				console.log('no event')
				return;
			}
		}
	})
	.listen(3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);

// 					console.log("Successful payment!");

// 					const { InvId, shp_user_id, shp_order_id, shp_user_expiration, shp_username } = response;

// 					try {
// 						const update_invoice_error = await db.updateInvoice(shp_user_id, InvId, shp_order_id, true);
// 						const response = await update_user(get_modified_user_params(Number(shp_user_expiration), shp_username));
// 						const error = await db.updateUser(Number(shp_user_id), response.expire);

// 						if (update_invoice_error || error) throw update_invoice_error || error;

// 						bot.api.sendMessage({
// 							chat_id: shp_user_id,
// 							text: success_text(dayjs.unix(Number(shp_user_expiration)).add(1, "month").format('DD.MM.YYYY')),
// 						});
// 					} catch (e) {
// bot.api.sendMessage({
// 	chat_id: shp_user_id,
// 	text: `Оплата прошла. Но что-то пошло не так.\n Ваш номер заказа ${shp_order_id}. Напишите на почту, указанную в оферте. `,
// });
// 					}
