require('dotenv').config()
const { Client } = require('pg')

async function main() {
	const client = new Client({
		host: process.env.DB_HOST,
		port: process.env.DB_PORT,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
	})
	await client.connect()
	console.log('Connected to DB')

	const blocked = ['20260207012400-add-visibility-updated-at-to-students.js', '20260323083000-simplify-mail-service-settings.js', '20260403010000-add-schedule-fields-to-mail-service-settings.js']

	for (const n of blocked) {
		const r = await client.query('SELECT 1 FROM "SequelizeMeta" WHERE name=$1', [n])
		if (r.rows.length === 0) {
			await client.query('INSERT INTO "SequelizeMeta" (name) VALUES ($1)', [n])
			console.log('Registered:', n)
		} else {
			console.log('Already exists:', n)
		}
	}

	await client.query('ALTER TABLE "MailServiceSettings" ADD COLUMN IF NOT EXISTS schedule_day_of_month INTEGER')
	await client.query('ALTER TABLE "MailServiceSettings" ADD COLUMN IF NOT EXISTS schedule_hour INTEGER')
	console.log('Columns added!')

	await client.end()
	console.log('Done! Restart the server now.')
}

main().catch(err => {
	console.error('Error:', err.message)
	process.exit(1)
})
