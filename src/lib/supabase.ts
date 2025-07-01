import { createClient, PostgrestError, PostgrestSingleResponse } from "@supabase/supabase-js";
import { GetUser } from "../interfaces";
import { Invoice } from "../interfaces/supabase";

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

	async updateEmail(id: number, email: string): Promise<PostgrestError | null> {
		const { error } = await this.supabase.from(this.clients_db).upsert(
			{
				id: id,
				email,
			},
			this.clients_db_on_conflict,
		);

		return error;
	}

	async updateUser(id: number, expiration: string, uuid: string): Promise<PostgrestError | null> {
		const { error } = await this.supabase.from(this.clients_db).upsert(
			{
				id: id,
				expireAt: expiration,
				uuid,
			},
			this.clients_db_on_conflict,
		);

		return error;
	}
	async updateInvoice(id: string, order_id: string, paid: boolean): Promise<PostgrestError | null> {
		const { error } = await this.supabase.from(this.invoices_db).upsert(
			{
				id,
				paid,
				order_id,
			},
			this.invoices_db_on_conflict,
		);

		return error;
	}
	async checkInvoice(order_id: string): Promise<Invoice> {
		const { data, error } = (await this.supabase.from(this.invoices_db).select("paid").eq("order_id", order_id).single()) as Invoice;

		if (error) {
			// Handle specific "no rows" error differently
			if (error.code === "PGRST116") {
				// This is the code for "No rows returned"
				console.log("No orders found for user, returning default value");
				return { data: { paid: false }, error: null }; // or whatever default you want
			}

			console.error("Error fetching highest order number:", error);
			throw error; // or return a default value
		}

		return { data, error };
	}

	async getUserData(id: number, data: string): Promise<PostgrestSingleResponse<{ price: number; expireAt: string; email: string }> | undefined> {
		let result;
		try {
			result = await this.supabase.from(this.clients_db).select(data).eq("id", id).single();
		} catch (e) {
			console.log("getUserData");
		}

		return result?.data;
	}
}

export default new Supabase("space_created_clients", "space_created_invoices");
