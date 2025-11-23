import React, { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../utils/hooks";
import { login, refresh } from "../features/auth/authSlice";
import { useNavigate } from "react-router-dom";
import { Box, Button, Checkbox, Container, FormControlLabel, Paper, TextField, Typography } from "@mui/material";

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
		<Container maxWidth="sm" sx={{ display: "grid", placeItems: "center", height: "100vh" }}>
			<Paper elevation={3} sx={{ p: 4, width: "100%" }} component="form" onSubmit={onSubmit}>
				<Typography variant="h5" align="center" gutterBottom>
					AI-Invoice
				</Typography>
				<Box sx={{ display: "grid", gap: 2 }}>
					<TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
					<TextField
						label="Password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						fullWidth
					/>
					<FormControlLabel
						control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
						label="Remember me (7 days)"
					/>
					<Button type="submit" variant="contained" size="large">
						Log in
					</Button>
				</Box>
			</Paper>
		</Container>
	);
}


