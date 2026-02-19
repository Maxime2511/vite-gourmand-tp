import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

import { pool, bootstrapPasswords } from "./services/pg.js";
import { mongoConnect } from "./services/mongo.js";

import { authRouter } from "./routes/auth.js";
import { menusRouter } from "./routes/menus.js";
import { ordersRouter } from "./routes/orders.js";
import { reviewsRouter } from "./routes/reviews.js";
import { contactRouter } from "./routes/contact.js";
import { adminRouter } from "./routes/admin.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/menus", menusRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/admin", adminRouter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ============================= */
/*         FRONTEND STATIC       */
/* ============================= */

// 1) Cas local (docker-compose backend/public_frontend)
const dirA = path.join(__dirname, "..", "public_frontend");

// 2) Cas Render (repo racine -> frontend/)
const dirB = path.join(__dirname, "..", "..", "frontend");

// On choisit le bon dossier automatiquement
const staticDir = fs.existsSync(path.join(dirA, "index.html"))
  ? dirA
  : dirB;

console.log("Serving frontend from:", staticDir);

app.use("/", express.static(staticDir));
app.get("*", (req, res) =>
  res.sendFile(path.join(staticDir, "index.html"))
);

const PORT = Number(process.env.PORT || 3000);

/* ============================= */
/*         MIGRATIONS DB         */
/* ============================= */

async function runMigrations() {
  try {
    const schemaPath = path.resolve(
      __dirname,
      "..",
      "..",
      "database",
      "postgres",
      "1_schema.sql"
    );

    const seedPath = path.resolve(
      __dirname,
      "..",
      "..",
      "database",
      "postgres",
      "2_seed.sql"
    );

    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, "utf-8");
      await pool.query(schema);
    }

    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, "utf-8");
      await pool.query(seed);
    }

    console.log("Database initialized (schema + seed).");
  } catch (e) {
    console.error("Migration error:", e.message);
  }
}

/* ============================= */
/*            START APP          */
/* ============================= */

async function start() {
  await pool.query("SELECT 1");

  await runMigrations();
  await bootstrapPasswords();

  try {
    await mongoConnect();
    console.log("Mongo connected");
  } catch (e) {
    console.error("Mongo disabled (startup continues):", e.message);
  }

  app.listen(PORT, () =>
    console.log(`App running on ${PORT}`)
  );
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
