import { Bot } from "gramio";

const BOT_TOKEN = process.env.THE_ONE_RING;

if (!BOT_TOKEN) {
	throw new Error("THE_ONE_RING environment variable is required");
}

const CLOSING_MESSAGE = "Мы закрываемся, до конца июля еще будет работать ваша подписка (если она есть)";

const bot = new Bot(BOT_TOKEN);

const reply = async (context: { send: (text: string) => Promise<unknown> }): Promise<void> => {
	await context.send(CLOSING_MESSAGE);
};

bot
	.command("start", reply)
	.command("help", reply)
	.command("buy", reply)
	.command("profile", reply)
	.command("email", reply)
	.command("broadcast", reply)
	.on("message", reply);

bot.start();
