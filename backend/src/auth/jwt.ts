import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";

export type JwtPayload = {
	userId: number;
	email: string;
};

export function signAccessToken(payload: JwtPayload): string {
	return jwt.sign(payload, env.jwt.accessSecret, {
		algorithm: "HS256",
		expiresIn: env.jwt.accessTtlSec
	});
}

export function verifyAccessToken(token: string): JwtPayload {
	return jwt.verify(token, env.jwt.accessSecret) as JwtPayload;
}

export function generateRefreshToken(): string {
	// 32 random bytes base64url
	return randomBytes(32).toString("base64url");
}

export async function hashRefreshToken(token: string): Promise<string> {
	const salt = await bcrypt.genSalt(10);
	return bcrypt.hash(token, salt);
}

export async function compareRefreshToken(token: string, hash: string): Promise<boolean> {
	return bcrypt.compare(token, hash);
}


