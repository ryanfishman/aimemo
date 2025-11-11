import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env.js";

let s3: S3Client | null = null;

export function getS3(): S3Client {
	if (!s3) {
		s3 = new S3Client({
			region: env.spaces.region,
			endpoint: env.spaces.endpoint || `https://${env.spaces.region}.digitaloceanspaces.com`,
			credentials: {
				accessKeyId: env.spaces.accessKeyId,
				secretAccessKey: env.spaces.secretAccessKey
			}
		});
	}
	return s3;
}


