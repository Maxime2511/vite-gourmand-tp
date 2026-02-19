import express from "express";
import bcrypt from "bcryptjs";
import { pool } from "../services/pg.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db as mongoDb } from "../services/mongo.js";

export const adminRouter = express.Router();

adminRouter.post("/employees", requireAuth, requireRole("admin"), async (req,res)=>{
  const { email,password }=req.body||{};
  if(!email||!password) return res.status(400).json({error:"Email + mot de passe requis"});
  const hash=await bcrypt.hash(password,10);
  await pool.query("INSERT INTO users (first_name,last_name,email,address,password_hash,role) VALUES ('Employe','Créé',$1,'Bordeaux',$2,'employe')",[String(email).toLowerCase(),hash]);
  console.log(`[MAIL] Compte employé créé pour ${email} (mdp non envoyé)`);
  res.json({ok:true});
});

adminRouter.post("/employees/:email/disable", requireAuth, requireRole("admin"), async (req,res)=>{
  await pool.query("UPDATE users SET is_active=FALSE WHERE email=$1 AND role='employe'",[String(req.params.email).toLowerCase()]);
  res.json({ok:true});
});

adminRouter.get("/stats/menus", requireAuth, requireRole("admin"), async (req,res)=>{
  const items=await mongoDb.collection("menu_stats").find({}).sort({month:-1,revenue:-1}).toArray();
  res.json({ok:true,items});
});
