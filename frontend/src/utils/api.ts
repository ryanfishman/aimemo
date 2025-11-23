import type { RootState } from "../app/store";
import { refresh } from "../features/auth/authSlice";

export async function authenticatedFetch(
	input: RequestInfo | URL,
	init: RequestInit,
	getState: () => RootState,
	dispatch: any
) {
	const token = getState().auth.accessToken;
	const headers = new Headers(init.headers as any);
	if (token) headers.set("Authorization", `Bearer ${token}`);
	let res = await fetch(input, { ...init, headers, credentials: "include" });
	if (res.status === 401) {
		try {
			await dispatch(refresh()).unwrap();
			const newToken = getState().auth.accessToken;
			const retryHeaders = new Headers(init.headers as any);
			if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);
			res = await fetch(input, { ...init, headers: retryHeaders, credentials: "include" });
		} catch {
			// fall through, will return 401 res
		}
	}
	return res;
}




