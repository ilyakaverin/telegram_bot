import { Bot } from "gramio";
import { buy_response, help_response, start_response } from "./commands";
import { on_message, on_precheckout_query, on_successful_payment } from "./on-message";
import { createClient } from "@supabase/supabase-js";
const token = process.env.TOKEN;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

if (!token) {
	throw new Error("TOKEN is not defined");
}

const bot = new Bot(token)
	.command("start", start_response(supabase))
	.command("help", help_response)
	.command("buy", buy_response(supabase))
	.on("message", on_message)
	.on("pre_checkout_query", on_precheckout_query(supabase))
	.on("successful_payment", on_successful_payment(supabase))
	.onStart(console.log);

bot.start();
