import { Bot, CallbackData } from "gramio";
import { help_response, keyboard_response, start_response } from "./commands";
import { on_message, on_precheckout_query, on_successful_payment } from "./on-message";
import { createClient } from "@supabase/supabase-js";
import { InlineKeyboard } from "gramio";
const token = process.env.TOKEN;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const buttonData = new CallbackData("action").number("id").number("price").boolean("isNew");
const keyboard = new InlineKeyboard();

if (!token) {
	throw new Error("TOKEN is not defined");
}

const bot = new Bot(token)
	.command("start", start_response(supabase, buttonData, keyboard))
	.command("help", help_response)
	.callbackQuery(buttonData, keyboard_response(buttonData, keyboard, supabase))
	.on("message", on_message)
	.on("pre_checkout_query", on_precheckout_query)
	.on("successful_payment", on_successful_payment)
	.onStart(console.log);

bot.start();
