import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

let client;
export let db;

export async function mongoConnect() {
  if (db) return db;
  client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  db = client.db(process.env.MONGO_DB || "vite_gourmand");
  await db.collection("menu_stats").createIndex({ menuId: 1, month: 1 }, { unique: true });
  return db;
}
