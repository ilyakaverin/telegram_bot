import Elysia from "elysia";
import { RequestLike, ParsedQueryParams } from "../interfaces/utils";
import { YooCheckout } from "@a2seven/yoo-checkout";

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
