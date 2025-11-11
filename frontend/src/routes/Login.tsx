import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import { login, refresh } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";

export default function Login() {
	const dispatch = useAppDispatch();
	const auth = useAppSelector((s) => s.auth);
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [rememberMe, setRememberMe] = useState(true);

	useEffect(() => {
		// attempt silent refresh on mount
		dispatch(refresh())
			.unwrap()
			.then(() => navigate("/app"))
			.catch(() => void 0);
	}, [dispatch, navigate]);

	useEffect(() => {
		if (auth.status === "authenticated") navigate("/app");
	}, [auth.status, navigate]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		await dispatch(login({ email, password, rememberMe }));
	}

	return (
		<div style={{ display: "grid", placeItems: "center", height: "100vh" }}>
			<form
				onSubmit={onSubmit}
				style={{ display: "grid", gap: 12, width: 320, border: "1px solid #ddd", padding: 24, borderRadius: 8 }}
			>
				<h2 style={{ margin: 0, textAlign: "center" }}>AI-Invoice</h2>
				<input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
				<input
					placeholder="Password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				<label style={{ display: "flex", alignItems: "center", gap: 8 }}>
					<input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
					<span>Remember me (7 days)</span>
				</label>
				<button type="submit">Log in</button>
			</form>
		</div>
	);
}


