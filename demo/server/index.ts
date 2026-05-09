export {};

if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config');
}

const { createApp } = await import('./app.js');
const { openDb } = await import('./db/connection.js');
const { migrate } = await import('./db/migrate.js');

const PORT = Number.parseInt(process.env.PORT ?? '3001', 10);

const db = openDb();
migrate(db);

const app = createApp(db);

app.listen(PORT, () => {
  process.stdout.write(`API ready on :${PORT}\n`);
});
