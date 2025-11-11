import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

type User = { id: number; email: string } | null;
type AuthState = {
	accessToken: string | null;
	user: User;
	rememberMe: boolean;
	status: "idle" | "loading" | "authenticated";
};

const initialState: AuthState = {
	accessToken: null,
	user: null,
	rememberMe: true,
	status: "idle"
};

export const login = createAsyncThunk(
	"auth/login",
	async (payload: { email: string; password: string; rememberMe: boolean }) => {
		const res = await fetch("/api/auth/login", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(payload)
		});
		if (!res.ok) throw new Error("Login failed");
		return (await res.json()) as { accessToken: string; user: User };
	}
);

export const refresh = createAsyncThunk("auth/refresh", async () => {
	const res = await fetch("/api/auth/refresh", {
		method: "POST",
		credentials: "include"
	});
	if (!res.ok) throw new Error("Refresh failed");
	return (await res.json()) as { accessToken: string; user: User };
});

export const logout = createAsyncThunk("auth/logout", async () => {
	await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
	return true as const;
});

const slice = createSlice({
	name: "auth",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(login.pending, (state) => {
				state.status = "loading";
			})
			.addCase(login.fulfilled, (state, action) => {
				state.status = "authenticated";
				state.accessToken = action.payload.accessToken;
				state.user = action.payload.user;
			})
			.addCase(refresh.fulfilled, (state, action) => {
				state.status = "authenticated";
				state.accessToken = action.payload.accessToken;
				state.user = action.payload.user;
			})
			.addCase(logout.fulfilled, (state) => {
				state.status = "idle";
				state.accessToken = null;
				state.user = null;
			});
	}
});

export default slice.reducer;


