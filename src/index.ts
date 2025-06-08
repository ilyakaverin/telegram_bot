import { Bot, CallbackData } from "gramio";
import { buy_response, help_response, payment_methods, profile_response, start_response } from "./commands";
import { on_message, on_precheckout_query, on_successful_payment } from "./on-message";
import { createClient } from "@supabase/supabase-js";
import { IRobokassaResponse, Robokassa } from "@dev-aces/robokassa";
import { getResponse } from "./lib/utils";
import db from "./lib/supabase";
import { update_user } from "./api";
import { get_modified_user_params } from "./utils";
import { success_text } from "./lib/text";
import dayjs from "dayjs";
import homepage from "./frontend/index.html";
import success from './frontend/success.html'
import failed from './frontend/failed.html';

const token = process.env.TOKEN;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const data = new CallbackData("action").number("id");

const robokassa = new Robokassa({
	merchantLogin: "spacecreated",
	password1: process.env.RBKASSA_TEST_PASS_1!,
	password2: process.env.RBKASSA_TEST_PASS_2!,
	hashAlgorithm: "sha256",
	isTest: true,
});

if (!token) {
	throw new Error("TOKEN is not defined");
}

const bot = new Bot(token)
	.command("start", start_response)
	.command("help", help_response)
	.command("buy", payment_methods(data))
	.command("profile", profile_response)
	.callbackQuery(data, buy_response(robokassa))
	.on("message", on_message)
	.on("pre_checkout_query", on_precheckout_query(supabase))
	.on("successful_payment", on_successful_payment(supabase));

bot.start();

const server = Bun.serve({
	port: 3000,
	development: false,
	routes: {
		"/": homepage,
		"/success": success,
		"/failed": failed, 
		"/api/result": {
			POST: async (request) => {
				const response = (await getResponse(request)) as unknown as IRobokassaResponse;

				if (robokassa.checkPayment(response)) {
					console.log("Successful payment!");

					const { InvId, shp_user_id, shp_order_id, shp_user_expiration, shp_username } = response;

					try {
						const update_invoice_error = await db.updateInvoice(shp_user_id, InvId, shp_order_id, true);
						const response = await update_user(get_modified_user_params(Number(shp_user_expiration), shp_username));
						const error = await db.updateUser(Number(shp_user_id), response.expire);

						if (update_invoice_error || error) throw update_invoice_error || error;

						bot.api.sendMessage({
							chat_id: shp_user_id,
							text: success_text(dayjs.unix(Number(shp_user_expiration)).add(1, "month").format('DD.MM.YYYY')),
						});
					} catch (e) {
						bot.api.sendMessage({
							chat_id: shp_user_id,
							text: `Оплата прошла. Но что-то пошло не так.\n Ваш номер заказа ${shp_order_id}. Напишите на почту, указанную в оферте. `,
						});
					}

					return new Response(`OK${InvId}`);
				} else {
					console.log("Processing failed!");
					return new Response(`Failure`);
				}
			},
		},
	},
});

console.log(`Listening on http://localhost:${server.port} ...`);
