import { Router } from "express";
import { getDb } from "../config/db.js";
import { env } from "../config/env.js";
import { compareRefreshToken, generateRefreshToken, hashRefreshToken, signAccessToken } from "../auth/jwt.js";
import bcrypt from "bcryptjs";

const router = Router();

router.post("/login", async (req, res) => {
	const { email, password, rememberMe } = req.body as { email: string; password: string; rememberMe?: boolean };
	console.log("[auth/login] attempt", { email, rememberMe });
	if (!email || !password) {
		console.warn("[auth/login] missing credentials");
		return res.status(400).json({ error: "Missing credentials" });
	}
	const db = getDb();
	const [rows] = await db.query("SELECT id, email, password_hash FROM users WHERE email = ?", [email]);
	const user = (rows as any[])[0];
	console.log("[auth/login] user", user ? "found" : "not found");
	if (!user) {
		console.warn("[auth/login] invalid credentials - user not found");
		return res.status(401).json({ error: "Invalid credentials" });
	}
	const storedHash = String(user.password_hash || "").trim();
	console.log("[auth/login] hash length", storedHash.length);
	const ok = await bcrypt.compare(password, storedHash);
	console.log("[auth/login] password match", ok);
	if (!ok) {
		console.warn("[auth/login] invalid credentials - bad password");
		return res.status(401).json({ error: "Invalid credentials" });
	}

	const access = signAccessToken({ userId: user.id, email: user.email });
	const refresh = generateRefreshToken();
	const refreshHash = await hashRefreshToken(refresh);
	const expires = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 3600 * 1000);
	await db.query(
		"INSERT INTO refresh_tokens (user_id, token_hash, expires_at, remember_me, created_at) VALUES (?, ?, ?, ?, NOW())",
		[user.id, refreshHash, expires, !!rememberMe]
	);

	res.cookie(env.cookie.name, refresh, {
		httpOnly: true,
		secure: env.cookie.secure,
		sameSite: env.cookie.sameSite as any,
		domain: env.cookie.domain,
		maxAge: rememberMe ? env.jwt.refreshTtlDays * 24 * 3600 * 1000 : undefined,
		path: "/"
	});
	console.log("[auth/login] success", { userId: user.id, rememberMe: !!rememberMe });
	res.json({ accessToken: access, user: { id: user.id, email: user.email } });
});

router.post("/refresh", async (req, res) => {
	const token = req.cookies?.[env.cookie.name];
	if (!token) return res.status(401).json({ error: "No refresh token" });
	const db = getDb();
	// find valid non-expired token row
	const [rows] = await db.query(
		"SELECT rt.id, rt.user_id, rt.token_hash, rt.expires_at, rt.remember_me, u.email FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id WHERE rt.expires_at > NOW() ORDER BY rt.created_at DESC"
	);
	const list = rows as any[];
	let matched: any | null = null;
	for (const row of list) {
		if (await compareRefreshToken(token, row.token_hash)) {
			matched = row;
			break;
		}
	}
	if (!matched) return res.status(401).json({ error: "Invalid refresh token" });

	// rotate
	const newRefresh = generateRefreshToken();
	const newHash = await hashRefreshToken(newRefresh);
	const newExpires = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 3600 * 1000);
	await db.query("UPDATE refresh_tokens SET token_hash=?, expires_at=?, updated_at=NOW() WHERE id=?", [
		newHash,
		newExpires,
		matched.id
	]);
	const access = signAccessToken({ userId: matched.user_id, email: matched.email });
	res.cookie(env.cookie.name, newRefresh, {
		httpOnly: true,
		secure: env.cookie.secure,
		sameSite: env.cookie.sameSite as any,
		domain: env.cookie.domain,
		maxAge: matched.remember_me ? env.jwt.refreshTtlDays * 24 * 3600 * 1000 : undefined,
		path: "/"
	});
	res.json({ accessToken: access, user: { id: matched.user_id, email: matched.email } });
});

router.post("/logout", async (req, res) => {
	const token = req.cookies?.[env.cookie.name];
	if (token) {
		const db = getDb();
		// best-effort revoke: clear any row matching this token hash
		const [rows] = await db.query("SELECT id, token_hash FROM refresh_tokens WHERE expires_at > NOW()");
		for (const row of rows as any[]) {
			if (await compareRefreshToken(token, row.token_hash)) {
				await db.query("DELETE FROM refresh_tokens WHERE id=?", [row.id]);
			}
		}
	}
	res.clearCookie(env.cookie.name, {
		httpOnly: true,
		secure: env.cookie.secure,
		sameSite: env.cookie.sameSite as any,
		domain: env.cookie.domain,
		path: "/"
	});
	res.json({ ok: true });
});

router.get("/me", async (req, res) => {
	// optional: could require auth via access token; for bootstrap we'll rely on client to provide access token
	res.json({ ok: true });
});

export default router;


