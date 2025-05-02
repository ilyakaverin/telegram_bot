import { Bot, CallbackData } from "gramio";
import { help_response, keyboard_response, start_response } from "./commands";
import { on_message } from "./on-message";
import { createClient } from "@supabase/supabase-js";

const token = process.env.TOKEN;
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const buttonData = new CallbackData("action").number("action_id");

if (!token) {
	throw new Error("TOKEN is not defined");
}

const bot = new Bot(token)
	.command("start", start_response(supabase, buttonData))
	.callbackQuery(buttonData, keyboard_response)
	.command("help", help_response)
	.on("message", on_message)
	.onStart(console.log);

bot.start();
