import { claimNextJob, completeJob, failJob } from "../services/queue.js";
import { getDb } from "../config/db.js";
import { downloadAudio, extractInvoiceItemsFromTranscript, transcribeWhisper } from "../services/ai.js";

async function processOnce() {
	const job = await claimNextJob();
	if (!job) return false;
	try {
		if (job.kind !== "transcribe_and_extract") {
			await completeJob(job.id);
			return true;
		}
		const db = getDb();
		const [rows] = await db.query("SELECT * FROM invoices WHERE id=?", [job.invoice_id]);
		const invoice = (rows as any[])[0];
		if (!invoice) {
			await completeJob(job.id);
			return true;
		}
		await db.query("UPDATE invoices SET status='processing', updated_at=NOW() WHERE id=?", [invoice.id]);
		const audio = await downloadAudio(invoice.audio_key);
		const transcript = await transcribeWhisper(audio, invoice.audio_key.split("/").pop() || "audio.wav");
		const fallbackDate = new Date(invoice.created_at).toISOString().slice(0, 10);
		const items = await extractInvoiceItemsFromTranscript(transcript, fallbackDate);
		// replace items
		await db.query("DELETE FROM invoice_items WHERE invoice_id=?", [invoice.id]);
		for (const it of items) {
			await db.query(
				"INSERT INTO invoice_items (invoice_id, item_date, description, quantity, amount) VALUES (?, ?, ?, ?, ?)",
				[invoice.id, it.item_date, it.description, it.quantity, it.amount]
			);
		}
		await db.query("UPDATE invoices SET status='ready', updated_at=NOW() WHERE id=?", [invoice.id]);
		await completeJob(job.id);
	} catch (e: any) {
		console.error("Job failed", e);
		await failJob(job.id, String(e?.message || e));
	}
	return true;
}

async function run() {
	// simple poller
	// eslint-disable-next-line no-constant-condition
	while (true) {
		const worked = await processOnce();
		if (!worked) {
			await new Promise((r) => setTimeout(r, 2000));
		}
	}
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});


