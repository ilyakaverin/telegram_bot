import { PostgrestError } from "@supabase/supabase-js";

export interface Invoice {
	data: { paid: boolean };
	error: PostgrestError | null;
}
