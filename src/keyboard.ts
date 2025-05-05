export const getKeyboard = (buttonData, keyboard) => ({
	reply_markup: keyboard
		.text("Купить подписку", buttonData.pack({ action_id: 1 }))
		.row()
		.text("Помощь", buttonData.pack({ action_id: 2 })),
});
