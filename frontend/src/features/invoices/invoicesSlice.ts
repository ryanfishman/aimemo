import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { RootState } from "../../app/store";

export type InvoiceListItem = { id: number; name: string; status: string; created_at: string };
export type InvoiceItem = { id?: number; item_date: string; description: string; quantity: number; amount: number };
export type InvoiceDetail = {
	id: number;
	name: string;
	status: string;
	audio_url: string | null;
	created_at: string;
	updated_at: string;
};

const authHeader = (getState: () => RootState) => {
	const token = (getState() as RootState).auth.accessToken;
	return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchInvoices = createAsyncThunk("invoices/fetchAll", async (search: string | undefined, thunk) => {
	const res = await fetch(`/api/invoices${search ? `?search=${encodeURIComponent(search)}` : ""}`, {
		headers: { ...authHeader(thunk.getState as any) },
		credentials: "include"
	});
	if (!res.ok) throw new Error("List failed");
	return (await res.json()) as { items: InvoiceListItem[] };
});

export const createInvoice = createAsyncThunk(
	"invoices/create",
	async (payload: { name: string; objectKey: string }, thunk) => {
		const res = await fetch("/api/invoices", {
			method: "POST",
			headers: { "Content-Type": "application/json", ...authHeader(thunk.getState as any) },
			credentials: "include",
			body: JSON.stringify({ name: payload.name, audio_key: payload.objectKey })
		});
		if (!res.ok) throw new Error("Create failed");
		return (await res.json()) as { id: number };
	}
);

export const fetchInvoice = createAsyncThunk("invoices/fetchOne", async (id: number, thunk) => {
	const res = await fetch(`/api/invoices/${id}`, {
		headers: { ...authHeader(thunk.getState as any) },
		credentials: "include"
	});
	if (!res.ok) throw new Error("Fetch failed");
	return (await res.json()) as { invoice: InvoiceDetail; items: InvoiceItem[] };
});

export const saveItems = createAsyncThunk(
	"invoices/saveItems",
	async (payload: { id: number; items: InvoiceItem[] }, thunk) => {
		const res = await fetch(`/api/invoices/${payload.id}/items`, {
			method: "PUT",
			headers: { "Content-Type": "application/json", ...authHeader(thunk.getState as any) },
			credentials: "include",
			body: JSON.stringify({ items: payload.items })
		});
		if (!res.ok) throw new Error("Save failed");
		return true as const;
	}
);

type InvoicesState = {
	list: InvoiceListItem[];
	current: InvoiceDetail | null;
	items: InvoiceItem[];
	status: "idle" | "loading" | "ready";
};

const initialState: InvoicesState = {
	list: [],
	current: null,
	items: [],
	status: "idle"
};

const slice = createSlice({
	name: "invoices",
	initialState,
	reducers: {
		setItems(state, action) {
			state.items = action.payload as InvoiceItem[];
		}
	},
	extraReducers: (b) => {
		b.addCase(fetchInvoices.fulfilled, (s, a) => {
			s.list = a.payload.items;
			s.status = "ready";
		})
			.addCase(fetchInvoice.fulfilled, (s, a) => {
				s.current = a.payload.invoice;
				s.items = a.payload.items;
			})
			.addCase(saveItems.fulfilled, (s) => s);
	}
});

export const { setItems } = slice.actions;
export default slice.reducer;


