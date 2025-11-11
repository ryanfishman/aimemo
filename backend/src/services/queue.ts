import { getDb } from "../config/db.js";

export type JobKind = "transcribe_and_extract";

export async function enqueueJob(kind: JobKind, invoiceId: number, uniqueKey: string, payload: any = {}) {
	const db = getDb();
	await db.query(
		"INSERT IGNORE INTO jobs (kind, invoice_id, payload_json, state, attempts, unique_key, created_at, updated_at) VALUES (?, ?, ?, 'pending', 0, ?, NOW(), NOW())",
		[kind, invoiceId, JSON.stringify(payload), uniqueKey]
	);
}

export async function claimNextJob() {
	const conn = await getDb().getConnection();
	try {
		await conn.beginTransaction();
		// lock next pending job
		const [rows] = await conn.query(
			"SELECT * FROM jobs WHERE state='pending' ORDER BY created_at ASC LIMIT 1 FOR UPDATE"
		);
		const job = (rows as any[])[0];
		if (!job) {
			await conn.commit();
			conn.release();
			return null;
		}
		await conn.query("UPDATE jobs SET state='processing', attempts=attempts+1, updated_at=NOW() WHERE id=?", [
			job.id
		]);
		await conn.commit();
		conn.release();
		return job;
	} catch (e) {
		await conn.rollback();
		conn.release();
		throw e;
	}
}

export async function completeJob(jobId: number) {
	await getDb().query("UPDATE jobs SET state='completed', updated_at=NOW() WHERE id=?", [jobId]);
}

export async function failJob(jobId: number, error: string) {
	await getDb().query("UPDATE jobs SET state='failed', last_error=?, updated_at=NOW() WHERE id=?", [error, jobId]);
}


