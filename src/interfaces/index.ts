import { PostgrestError } from "@supabase/supabase-js";

export interface User {
	id: number;
	uuid: string;
	created_at: string;
	username: string;
	price: number;
	expireAt: null | string;
}
export interface Error {
	error: null | PostgrestError;
}

export interface GetUser {
	data: User;
	error: null | PostgrestError;
}
