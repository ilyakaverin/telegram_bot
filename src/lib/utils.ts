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
