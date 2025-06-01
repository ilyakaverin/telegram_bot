import { createClient, PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { GetUser } from "../interfaces";

class Supabase {
	private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
	private clients_db_on_conflict = { onConflict: "id" };
	private invoices_db_on_conflict = { onConflict: "order_id" };

	constructor(
		private clients_db: string,
		private invoices_db: string,
	) {}

	async getUser(id: number, username: string): Promise<GetUser> {
		const { data, error } = await this.supabase
			.from(this.clients_db)
			.upsert(
				{
					id,
					username,
				},
				this.clients_db_on_conflict,
			)
			.select()
			.single();

		return { data, error };
	}

	async updateUser(id: number, expiration: number): Promise<PostgrestError | null> {
		const { error } = await this.supabase.from(this.clients_db).upsert(
			{
				id: id,
				expiration,
			},
			this.clients_db_on_conflict,
		);

		return error;
	}
	async updateInvoice(id: string, invoice_id: number, order_id: string, paid: boolean): Promise<PostgrestError | null> {
		const { error } = await this.supabase.from(this.invoices_db).upsert(
			{
				id,
				invoice_id,
				paid,
				order_id,
			},
			this.invoices_db_on_conflict,
		);

		return error;
	}
	async getHighestOrderNumber(userId: number): Promise<number> {
		const { data, error } = await this.supabase
			.from(this.invoices_db) // replace with your table name
			.select("invoice_id")
			.eq("id", userId)
			.order("invoice_id", { ascending: false })
			.limit(1)
			.single();

		if (error) {
			// Handle specific "no rows" error differently
			if (error.code === "PGRST116") {
				// This is the code for "No rows returned"
				console.log("No orders found for user, returning default value");
				return 1; // or whatever default you want
			}

			console.error("Error fetching highest order number:", error);
			throw error; // or return a default value
		}

		return data?.invoice_id || 1; // Fallback to 0 if data exists but order_number is null
	}

	async getPriceAndSubscriptionExpiration(id: number): Promise<PostgrestSingleResponse<{ price: number; expiration: number }> | undefined> {
		let result;
		try {
			result = await this.supabase.from(this.clients_db).select("price, expiration").eq("id", id).single();
		} catch (e) {
			console.log("getPriceAndSubscriptionExpiration error");
		}

		return result;
	}
}

export default new Supabase("space_created_clients", "space_created_invoices");
