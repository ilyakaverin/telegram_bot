import { InlineKeyboard } from "gramio";

export const getKeyboard = (buttonData) => ({
	reply_markup: new InlineKeyboard()
		.text("Купить подписку", buttonData.pack({ action_id: 1 }))
		.row()
		.text("Помощь", buttonData.pack({ action_id: 2 })),
});
