import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);


export const time = dayjs

export const get_new_user_request_params = (username: string) => ({
	status: "active",
	username,
	note: "",
	proxies: {
		vless: {
			flow: "",
		},
	},
	data_limit: 0,
	expire: time().tz("Europe/Moscow").add(1, "month").unix(),
	data_limit_reset_strategy: "no_reset",
	inbounds: {
		vless: ["VLESS TCP REALITY"],
		vmess: ["VMESS TCP", "VMESS TCP TLS"],
	},
});

export const get_modified_user_params = () => ({
	expire: dayjs().tz("Europe/Moscow").add(1, "month").unix(),
});
