import express from "express";
import { pool } from "../services/pg.js";
export const contactRouter = express.Router();

contactRouter.post("/", async (req,res)=>{
  const { email,title,description }=req.body||{};
  if(!email||!title||!description) return res.status(400).json({error:"Champs manquants"});
  await pool.query("INSERT INTO contact_messages (email,title,description) VALUES ($1,$2,$3)",[String(email),String(title),String(description)]);
  console.log(`[MAIL] Contact -> entreprise (dev) from=${email} title=${title}`);
  res.json({ok:true});
});
