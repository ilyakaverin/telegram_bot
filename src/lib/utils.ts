import Elysia from "elysia";
import { RequestLike, ParsedQueryParams } from "../interfaces/utils";
import { ICreatePayment, YooCheckout } from "@a2seven/yoo-checkout";
import { createHmac } from "crypto";

export const getResponse = async (request: RequestLike): Promise<ParsedQueryParams> => {
	const body: string = await request.text();
	const params = new URLSearchParams(body);
	const jsonData: ParsedQueryParams = {};
	params.forEach((value: string, key: string) => {
		jsonData[key] = value;
	});

	return jsonData;
};

export const checkout = new YooCheckout({ shopId: process.env.YKASSA_SHOP_ID!, secretKey: process.env.YKASSA_KEY! });

const allowedIPs = ["185.71.76.0/27", "185.71.77.0/27", "77.75.153.0/25", "77.75.156.11", "77.75.156.35", "77.75.154.128/25", "2a02:5180::/32"];

export const ipFilter = (app: Elysia) => {
	return app.derive(({ request, server }) => {
		const clientIP = server?.requestIP(request);
		const ipAddress = clientIP?.address || clientIP;

		console.log(request, server);

		if (!allowedIPs.includes(ipAddress)) {
			throw new Error("Access denied: IP not allowed");
		}

		return { clientIP: ipAddress };
	});
};

export interface WebhookHeaders {
	'x-remnawave-signature': string
	'x-remnawave-timestamp': string
}

export const validateWebhook = (data: {
	body: unknown
	headers: WebhookHeaders,
}): boolean =>  {
	if (!process.env.PALANTIR_KEY) return false

	const signature = createHmac('sha256', process.env.PALANTIR_KEY)
		.update(JSON.stringify(data.body))
		.digest('hex')

	return signature === data.headers['x-remnawave-signature']
}

export const createPayload = (price, user_id, order_id, expireAt, uuid, email, referrer): ICreatePayment => ({
	amount: {
		value: price,
		currency: "RUB",
	},
	payment_method_data: {
		type: "bank_card",
	},
	metadata: {
		user_id,
		order_id,
		expireAt,
		uuid,
		referrer,
	},
	confirmation: {
		type: "redirect",
		return_url: "https://t.me/createdspacebot",
	},
	description: `Оплата заказа ${order_id}`,
	receipt: {
		// Если нужен чек
		customer: {
			email,
		},
		items: [
			{
				description: "Оплата подписки",
				quantity: "1.00",
				amount: {
					value: price,
					currency: "RUB",
				},
				vat_code: 1,
			},
		],
	},
});

export const getReffererIdFromStart = (inputString: string) => {

    const match = inputString.match(/^\/start (\d+)$/);
    
    return match ? match[1] : null;
}

export const encodeUUIDToBase64URL = (uuid: string) => {
    // Remove hyphens and convert hex to bytes
    const hex = uuid.replace(/-/g, '');
    const bytes = new Uint8Array(hex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    
    // Convert to base64 and make URL-safe
    const base64 = btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''); // Remove padding
    
    return base64;
}

export const decodeBase64URLToUUID = (base64url: string) => {
    // Convert from URL-safe base64 to normal base64
    const base64 = base64url
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        + '=='.slice(0, (4 - base64url.length % 4) % 4); // Add padding

    // Decode base64 to binary string
    const binaryString = atob(base64);

    // Convert binary string to hex
    const hex = Array.from(binaryString, c => {
        return c.charCodeAt(0).toString(16).padStart(2, '0');
    }).join('');

    // Re-insert hyphens to match UUID format
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
    ].join('-');
}
