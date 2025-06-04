import {format, formatSaveIndents, link} from '@gramio/format';

export const welcome_new = (username: string, url: string) => 
    formatSaveIndents`Привет, ${username}! Это комфортный и безопасный VPN

 Вот твой ключ:

${url}

У тебя есть 2 дня пробного периода, после чего ты можешь купить подписку, воспользовавшись меню.

Стоимость 300 рублей в месяц!
Неограниченный траффик!
Высокая скорость!`

export const ios_url = format`${link("IOS or macOs","https://apps.apple.com/ru/app/v2raytun/id6476628951")}`
export const android_url = format`${link("Android","https://apps.apple.com/ru/app/v2raytun/id6476628951")}`
export const windows_url = format`${link("Windows", "https://apps.microsoft.com/detail/9pdfnl3qv2s5?hl=en-US&gl=RU")}`

export const help = formatSaveIndents`Приложения для смартфонов
${ios_url}
${android_url}

Для ПК/ноутбуков
${windows_url}

Полученный ключ нужно импортировать в приложение. Во всех приложениях это называется примерно “Add config from clipboard”. Приложение само берёт из буфера обмена строку, либо вам нужно её вставить в поле.`

export const success_text = (expiration: string) => formatSaveIndents`Оплата завершена!
Подписка действует до: ${expiration}`
