import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

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

app.get("/api/health", (req,res)=>res.json({ok:true}));

app.use("/api/auth", authRouter);
app.use("/api/menus", menusRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/admin", adminRouter);

// static frontend
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const staticDir = path.join(__dirname, "..", "public_frontend");
app.use("/", express.static(staticDir));
app.get("*", (req,res)=>res.sendFile(path.join(staticDir, "index.html")));

const PORT = Number(process.env.PORT || 3000);

async function start(){
  await pool.query("SELECT 1");
  await bootstrapPasswords();
  await mongoConnect();

  import fs from "fs";
import path from "path";
import { pool } from "./services/pg.js";

async function runMigrations() {
  const schema = fs.readFileSync(
    path.resolve("database/postgres/1_schema.sql"),
    "utf-8"
  );
  const seed = fs.readFileSync(
    path.resolve("database/postgres/2_seed.sql"),
    "utf-8"
  );

  await pool.query(schema);
  await pool.query(seed);
  console.log("Database initialized");
}

  
  app.listen(PORT, ()=>console.log(`App running on ${PORT}`));
}
start().catch(e=>{ console.error(e); process.exit(1); });
