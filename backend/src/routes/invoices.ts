import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { getDb } from "../config/db.js";
import { env } from "../config/env.js";
import { enqueueJob } from "../services/queue.js";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { getS3 } from "../config/s3.js";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 64 * 1024 * 1024 } });

router.use(requireAuth);

router.get("/", async (req, res) => {
	const userId = (req as any).user.id as number;
	const search = String(req.query.search || "").trim();
	const db = getDb();
	let rows;
	if (search) {
		[rows] = await db.query(
			"SELECT id, name, status, created_at FROM invoices WHERE user_id=? AND name LIKE ? ORDER BY created_at DESC",
			[userId, `%${search}%`]
		);
	} else {
		[rows] = await db.query(
			"SELECT id, name, status, created_at FROM invoices WHERE user_id=? ORDER BY created_at DESC",
			[userId]
		);
	}
	res.json({ items: rows });
});

router.post("/", async (req, res) => {
	const userId = (req as any).user.id as number;
	const { name, audio_key } = req.body as { name: string; audio_key: string };
	if (!name || !audio_key) return res.status(400).json({ error: "name and audio_key required" });
	const db = getDb();
	const [result] = await db.query(
		"INSERT INTO invoices (user_id, name, audio_key, status, created_at, updated_at) VALUES (?, ?, ?, 'processing', NOW(), NOW())",
		[userId, name, audio_key]
	);
	// @ts-ignore
	const id = result.insertId as number;
	await enqueueJob("transcribe_and_extract", id, audio_key, {});
	res.json({ id });
});

// New: backend-handled upload + invoice creation
router.post("/create_ai_invoice", upload.single("file"), async (req, res) => {
	const userId = (req as any).user.id as number;
	const name = String(req.body?.name || "").trim();
	const file = req.file;
	if (!name || !file) return res.status(400).json({ error: "name and file required" });

	const original = file.originalname || "audio.bin";
	const ext = original.includes(".") ? original.substring(original.lastIndexOf(".") + 1) : "bin";
	const objectKey = `aiinvoice-${randomUUID()}.${ext}`;

	// Upload to Spaces
	const s3 = getS3();
	await s3.send(
		new PutObjectCommand({
			Bucket: env.spaces.bucket,
			Key: objectKey,
			Body: file.buffer,
			ContentType: file.mimetype || "application/octet-stream",
			ACL: "private"
		})
	);

	// Create invoice and enqueue job
	const db = getDb();
	const [result] = await db.query(
		"INSERT INTO invoices (user_id, name, audio_key, status, created_at, updated_at) VALUES (?, ?, ?, 'processing', NOW(), NOW())",
		[userId, name, objectKey]
	);
	// @ts-ignore
	const id = result.insertId as number;
	await enqueueJob("transcribe_and_extract", id, objectKey, {});

	res.json({ id });
});

router.get("/:id", async (req, res) => {
	const userId = (req as any).user.id as number;
	const id = Number(req.params.id);
	const db = getDb();
	const [rows] = await db.query("SELECT * FROM invoices WHERE id=? AND user_id=?", [id, userId]);
	const invoice = (rows as any[])[0];
	if (!invoice) return res.status(404).json({ error: "Not found" });
	const [items] = await db.query(
		"SELECT id, item_date, description, quantity, amount FROM invoice_items WHERE invoice_id=? ORDER BY item_date ASC, id ASC",
		[id]
	);
	// Always provide a presigned GET URL for reliable playback regardless of CDN ACLs
	let audioUrl: string | null = null;
	if (invoice.audio_key) {
		const s3 = getS3();
		const cmd = new GetObjectCommand({ Bucket: env.spaces.bucket, Key: invoice.audio_key });
		audioUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
	}
	res.json({ invoice: { ...invoice, audio_url: audioUrl }, items });
});

router.put("/:id", async (req, res) => {
	const userId = (req as any).user.id as number;
	const id = Number(req.params.id);
	const { name } = req.body as { name: string };
	if (!name) return res.status(400).json({ error: "name required" });
	const db = getDb();
	const [result] = await db.query("UPDATE invoices SET name=?, updated_at=NOW() WHERE id=? AND user_id=?", [
		name,
		id,
		userId
	]);
	res.json({ ok: true });
});

router.put("/:id/items", async (req, res) => {
	const userId = (req as any).user.id as number;
	const id = Number(req.params.id);
	const items = req.body?.items as Array<{
		id?: number;
		item_date: string;
		description: string;
		quantity: number;
		amount: number;
	}>;
	if (!Array.isArray(items)) return res.status(400).json({ error: "items array required" });
	const db = getDb();
	// ensure ownership
	const [rows] = await db.query("SELECT id FROM invoices WHERE id=? AND user_id=?", [id, userId]);
	if (!(rows as any[])[0]) return res.status(404).json({ error: "Not found" });
	// replace strategy: delete and insert
	await db.query("DELETE FROM invoice_items WHERE invoice_id=?", [id]);
	for (const it of items) {
		await db.query(
			"INSERT INTO invoice_items (invoice_id, item_date, description, quantity, amount) VALUES (?, ?, ?, ?, ?)",
			[id, it.item_date, it.description, it.quantity, it.amount]
		);
	}
	await db.query("UPDATE invoices SET updated_at=NOW() WHERE id=?", [id]);
	res.json({ ok: true });
});

router.delete("/:id", async (req, res) => {
	const userId = (req as any).user.id as number;
	const id = Number(req.params.id);
	const db = getDb();
	// fetch invoice to get audio key and verify ownership
	const [rows] = await db.query("SELECT audio_key FROM invoices WHERE id=? AND user_id=?", [id, userId]);
	const inv = (rows as any[])[0];
	if (!inv) return res.status(404).json({ error: "Not found" });
	// attempt to delete S3 object, but don't fail the request if it errors
	if (inv.audio_key) {
		try {
			const s3 = getS3();
			const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
			// @ts-ignore dynamic import type
			await s3.send(new DeleteObjectCommand({ Bucket: env.spaces.bucket, Key: inv.audio_key }));
		} catch (e) {
			console.warn("Failed to delete Spaces object", e);
		}
	}
	await db.query("DELETE FROM invoice_items WHERE invoice_id=?", [id]);
	await db.query("DELETE FROM invoices WHERE id=? AND user_id=?", [id, userId]);
	res.json({ ok: true });
});

export default router;


