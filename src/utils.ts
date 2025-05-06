import dayjs from "dayjs";

export const get_new_user_request_params = (username: string, localtime: number) => ({
	status: "active",
	username,
	note: "",
	proxies: {
		vless: {
			flow: "",
		},
	},
	data_limit: 0,
	expire: dayjs.unix(localtime).add(3, "day").unix(),
	data_limit_reset_strategy: "no_reset",
	inbounds: {
		vless: ["VLESS TCP REALITY"],
		vmess: ["VMESS TCP", "VMESS TCP TLS"],
	},
});

export const get_modified_user_params = (expiration: number, username: string) => ({
	username,
	expire: dayjs.unix(expiration).add(1, "month").unix(),
});
