import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../services/pg.js";
import { isStrongPassword } from "../utils.js";

export const authRouter = express.Router();

authRouter.post("/register", async (req,res)=>{
  const { firstName,lastName,phone,email,address,password } = req.body||{};
  if(!firstName||!lastName||!email||!address||!password) return res.status(400).json({error:"Champs manquants"});
  if(!isStrongPassword(password)) return res.status(400).json({error:"Mot de passe trop faible"});
  const hash = await bcrypt.hash(password,10);
  try{
    const r=await pool.query(
      "INSERT INTO users (first_name,last_name,phone,email,address,password_hash,role) VALUES ($1,$2,$3,$4,$5,$6,'user') RETURNING id",
      [firstName,lastName,phone||null,email.toLowerCase(),address,hash]
    );
    console.log(`[MAIL] Welcome sent to ${email}`);
    res.json({ok:true,userId:r.rows[0].id});
  }catch(e){
    return res.status(409).json({error:"Email déjà utilisé"});
  }
});

authRouter.post("/login", async (req,res)=>{
  const { email,password }=req.body||{};
  if(!email||!password) return res.status(400).json({error:"Email/mot de passe requis"});
  const r=await pool.query("SELECT id,email,password_hash,role,is_active,first_name,last_name FROM users WHERE email=$1",[email.toLowerCase()]);
  if(r.rowCount===0) return res.status(401).json({error:"Identifiants invalides"});
  const u=r.rows[0];
  if(!u.is_active) return res.status(403).json({error:"Compte désactivé"});
  const ok=await bcrypt.compare(password,u.password_hash);
  if(!ok) return res.status(401).json({error:"Identifiants invalides"});
  const token=jwt.sign({id:u.id,role:u.role,email:u.email},process.env.JWT_SECRET,{expiresIn:"7d"});
  res.json({ok:true,token,user:{id:u.id,role:u.role,firstName:u.first_name,lastName:u.last_name}});
});

authRouter.post("/forgot", async (req,res)=>{
  const { email }=req.body||{};
  if(!email) return res.status(400).json({error:"Email requis"});
  const r=await pool.query("SELECT id FROM users WHERE email=$1",[email.toLowerCase()]);
  if(r.rowCount===0) return res.json({ok:true});
  const expiresAt=new Date(Date.now()+30*60*1000);
  const ins=await pool.query("INSERT INTO password_resets (user_id, expires_at) VALUES ($1,$2) RETURNING token",[r.rows[0].id,expiresAt]);
  console.log(`[MAIL] Reset link (dev): ${process.env.APP_BASE_URL}/reset.html?token=${ins.rows[0].token}`);
  res.json({ok:true});
});

authRouter.post("/reset", async (req,res)=>{
  const { token,newPassword }=req.body||{};
  if(!token||!newPassword) return res.status(400).json({error:"Token + nouveau mot de passe requis"});
  if(!isStrongPassword(newPassword)) return res.status(400).json({error:"Mot de passe trop faible"});
  const r=await pool.query("SELECT id,user_id,expires_at,used_at FROM password_resets WHERE token=$1",[token]);
  if(r.rowCount===0) return res.status(400).json({error:"Token invalide"});
  const pr=r.rows[0];
  if(pr.used_at) return res.status(400).json({error:"Token déjà utilisé"});
  if(new Date(pr.expires_at).getTime()<Date.now()) return res.status(400).json({error:"Token expiré"});
  const hash=await bcrypt.hash(newPassword,10);
  await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2",[hash,pr.user_id]);
  await pool.query("UPDATE password_resets SET used_at=NOW() WHERE id=$1",[pr.id]);
  res.json({ok:true});
});
