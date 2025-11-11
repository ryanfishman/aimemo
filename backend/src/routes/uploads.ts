import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { getS3 } from "../config/s3.js";
import { env } from "../config/env.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const router = Router();

router.post("/presign", requireAuth, async (req, res) => {
	const { filename, contentType } = req.body as { filename: string; contentType: string };
	if (!filename || !contentType) return res.status(400).json({ error: "filename and contentType required" });
	const ext = filename.includes(".") ? filename.substring(filename.lastIndexOf(".") + 1) : "bin";
	const objectKey = `aiinvoice-${randomUUID()}.${ext}`;
	const s3 = getS3();
	const command = new PutObjectCommand({
		Bucket: env.spaces.bucket,
		Key: objectKey,
		ContentType: contentType,
		ACL: "private"
	});
	const url = await getSignedUrl(s3, command, { expiresIn: 900 });
	res.json({ objectKey, url });
});

export default router;


