import { formatSaveIndents } from "@gramio/format";
import dayjs from "dayjs";

export const success_text = (expiration: string) => formatSaveIndents`Оплата завершена!
Подписка действует до: ${expiration}`;

export const welcome_new = (url: string) =>
	formatSaveIndents`Привет! Это space created

🚀 Глобальный доступ к контенту
🛡️ Полная анонимность в сети
📱 Работает на всех устройствах (настройка в роутере - скоро!)

Вот твой ключ: ${url}

Открой его в браузере, там ты узнаешь как воспользоваться ключом.

У тебя есть 2 дня пробного периода, после чего ты можешь купить подписку, воспользовавшись меню.

Для совершения оплат, привяжи свою почту, туда будут приходить чеки.
🔽 Кнопка для привязки почты в меню
`;

export const payment = (price: number) => formatSaveIndents`Что вы получите:
 ✅ Безлимитный трафик
 ✅ Высокая скорость соединения (до 1 Гбит/с)
 ✅ Без логов и отслеживания

📱 Поддерживаемые устройства:

 Windows, macOS, Linux
 iOS, Android
 Роутеры и Smart TV (скоро)

💰 Тарифы:
🔸 1 месяц —  ${price} ₽

⚡ Активация мгновенная — доступ сразу после оплаты

Нажмите кнопку ниже для оформления подписки ⬇️
		`;

export const profile = (subscriptionUrl: string, expireAt: string) => formatSaveIndents`Ключ: ${subscriptionUrl}
Подписка действует до: ${dayjs(expireAt).format("DD.MM.YYYY")}
`;
