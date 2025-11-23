import { GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../config/env.js";
import { getS3 } from "../config/s3.js";
import OpenAI from "openai";
import { toFile } from "openai/uploads";

const openai = new OpenAI({ apiKey: env.openai.apiKey });

async function streamToBuffer(stream: any): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: any[] = [];
		stream.on("data", (d: any) => chunks.push(d));
		stream.on("end", () => resolve(Buffer.concat(chunks)));
		stream.on("error", reject);
	});
}

export async function downloadAudio(objectKey: string): Promise<Buffer> {
	const s3 = getS3();
	const obj = await s3.send(new GetObjectCommand({ Bucket: env.spaces.bucket, Key: objectKey }));
	const body = await streamToBuffer(obj.Body as any);
	return body;
}

export async function transcribeWhisper(audio: Buffer, filename = "audio.wav"): Promise<string> {
	// Uses OpenAI Whisper via Transcriptions API (buffer → File via helper)
	const file = await toFile(audio, filename);
	const result = await openai.audio.transcriptions.create({
		file,
		model: "gpt-4o-transcribe",
		response_format: "text"
	});
	// result is string for response_format=text
	return result as unknown as string;
}

export type InvoiceItem = {
	item_date: string; // YYYY-MM-DD
	description: string;
	quantity: number;
	amount: number;
};

export async function extractInvoiceItemsFromTranscript(transcript: string, fallbackDateISO: string) {
	const systemPrompt =
		"You are an accounting assistant. Given a meeting transcript with speakers (Person 1/Person 2), output JSON strictly matching schema: items[{ item_date: YYYY-MM-DD, description: string, quantity: number, amount: number }]. Assume CAD. If dates are ambiguous, use the provided fallback date. Keep concise legal-style descriptions.";
	const userPrompt = `Fallback date: ${fallbackDateISO}\nTranscript:\n${transcript}`;
	const completion = await openai.chat.completions.create({
		model: "gpt-5",
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt }
		],
		response_format: { type: "json_object" }
	});
	const content = completion.choices[0]?.message?.content || "{}";
	const parsed = JSON.parse(content) as { items?: InvoiceItem[] };
	return parsed.items ?? [];
}


