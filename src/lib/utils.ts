import { IRobokassaOrder, IRobokassaResponse } from "@dev-aces/robokassa";
import { RequestLike, ParsedQueryParams } from "../interfaces/utils";

export const getOrderParameters = (
	id: string,
	price: number,
	invId: number,
	order_id: string,
	expiration: number,
	username: string,
): IRobokassaOrder => ({
	outSum: price,
	description: "Оплата подписки на 1 месяц",
	invId,
	userParameters: {
		shp_interface: "link",
		shp_order_id: order_id,
		shp_user_expiration: expiration,
		shp_user_id: id,
		shp_username: username,
	},
	receipt: {
		items: [
			{
				sum: 300,
				name: "Оплата подписки на 1 месяц",
				quantity: 1,
				payment_method: "full_payment",
				payment_object: "service",
				tax: "none",
			},
		],
	},
});

export const getResponse = async (request: RequestLike): Promise<ParsedQueryParams> => {
	const body: string = await request.text();
	const params = new URLSearchParams(body);
	const jsonData: ParsedQueryParams = {};
	params.forEach((value: string, key: string) => {
		jsonData[key] = value;
	});

	return jsonData;
};
