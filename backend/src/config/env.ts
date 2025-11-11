import dotenv from "dotenv";

dotenv.config();

export const env = {
	processEnv: process.env,
	port: Number(process.env.PORT || 4000),
	db: {
		host: process.env.DB_HOST || "localhost",
		port: Number(process.env.DB_PORT || 3306),
		user: process.env.DB_USER || "root",
		password: process.env.DB_PASSWORD || "",
		database: process.env.DB_NAME || "ai_invoice"
	},
	jwt: {
		accessSecret: process.env.JWT_SECRET || "dev_access_secret_change_me",
		accessTtlSec: 15 * 60, // 15 minutes
		refreshTtlDays: 7
	},
	cookie: {
		name: "aii_rt",
		secure: (process.env.COOKIE_SECURE || "true") === "true",
		sameSite: (process.env.COOKIE_SAMESITE as "lax" | "strict" | "none") || "lax",
		domain: process.env.COOKIE_DOMAIN || undefined
	},
	spaces: {
		endpoint: process.env.SPACES_ENDPOINT || "",
		region: process.env.SPACES_REGION || "nyc3",
		accessKeyId: process.env.SPACES_ACCESS_KEY || "",
		secretAccessKey: process.env.SPACES_SECRET_KEY || "",
		bucket: process.env.SPACES_BUCKET || ""
	},
	openai: {
		apiKey: process.env.OPENAI_API_KEY || ""
	},
	publicCdnBase: process.env.PUBLIC_CDN_BASE || ""
} as const;


