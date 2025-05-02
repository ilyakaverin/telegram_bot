import { BotLike, Keyboard, MessageContext } from "gramio";

const data = ["Купить подписку", "Профиль"];

const message = <T extends BotLike>(context: MessageContext<T>): string | number => {
	if (context.text === "Купить подписку") {
		return "Покупаем";
	} else {
		return `Ваш id: ${context?.from?.id}\nподписка неактивна` || "-";
	}
};

export const on_message = <T extends BotLike>(context: MessageContext<T>) => {
	console.log(context, "ctx");

	return context.send(message(context), {
		reply_markup: new Keyboard()
			.columns(1)

			.add(...data.map((x) => Keyboard.text(x))),
	});
};
