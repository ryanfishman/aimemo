import mysql, { Pool, PoolOptions } from "mysql2/promise";
import { env } from "./env.js";

let pool: Pool | null = null;

export function getDb(): Pool {
	if (!pool) {
		const options: PoolOptions = {
			host: env.db.host,
			port: env.db.port,
			user: env.db.user,
			password: env.db.password,
			database: env.db.database,
			connectionLimit: 10,
			waitForConnections: true,
			queueLimit: 0
		};
		pool = mysql.createPool(options);
	}
	return pool;
}


