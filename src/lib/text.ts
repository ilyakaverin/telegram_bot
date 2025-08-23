import { formatSaveIndents, link } from "@gramio/format";
import dayjs from "dayjs";

const ios = 'https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973';
const android = `https://play.google.com/store/apps/details?id=com.happproxy`

export const success_text = (expiration: string) => formatSaveIndents`Оплата завершена!
Подписка действует до: ${expiration}`;

export const welcome_new = (url: string) =>
	formatSaveIndents`Привет! Это space created

🚀 Глобальный доступ к контенту
🛡️ Полная анонимность в сети
📱 Широкий диапазон поддерживаемых устройств.

Вот твой ключ: ${url}

Ссылки для приложений, загрузи приложение и вставь ключ.

iOS: ${link('app store', ios)}
Android: ${link('google play', android)}

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
 Роутеры и Smart TV

💰 Тарифы:
🔸 1 месяц —  ${price} ₽

⚡ Активация мгновенная — доступ сразу после оплаты

Нажмите кнопку ниже для оформления подписки ⬇️
		`;

export const profile = (subscriptionUrl: string, expireAt: string, uuid: string) => formatSaveIndents`Ключ: ${subscriptionUrl}
Подписка действует до: ${dayjs(expireAt).format("DD.MM.YYYY")}

Ссылки для приложений, загрузи приложение и вставь ключ.

iOS: ${link('app store', ios)}
Android: ${link('google play', android)}


`;


// Реферальная ссылка: https://t.me/createdspacebot?start=${encodeUUIDToBase64URL(uuid)}
