import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt.js";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
	const auth = req.header("authorization") || "";
	const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
	if (!token) {
		return res.status(401).json({ error: "Missing access token" });
	}
	try {
		const payload = verifyAccessToken(token);
		(req as any).user = { id: payload.userId, email: payload.email };
		next();
	} catch {
		return res.status(401).json({ error: "Invalid or expired access token" });
	}
}


