import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import authRouter from "./routes/auth.js";
import uploadsRouter from "./routes/uploads.js";
import invoicesRouter from "./routes/invoices.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(
	cors({
		origin: (origin, cb) => cb(null, true), // adjust in production
		credentials: true
	})
);

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/invoices", invoicesRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error(err);
	res.status(500).json({ error: "Internal server error" });
});

app.listen(env.port, () => {
	console.log(`AI-Invoice API listening on :${env.port}`);
});


