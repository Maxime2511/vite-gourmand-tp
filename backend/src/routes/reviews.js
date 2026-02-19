import express from "express";
import { pool } from "../services/pg.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const reviewsRouter = express.Router();

reviewsRouter.get("/validated", async (req,res)=>{
  const r=await pool.query(`
    SELECT r.id,r.rating,r.comment,r.created_at,u.first_name,u.last_name
    FROM reviews r JOIN users u ON u.id=r.user_id
    WHERE r.is_validated=TRUE ORDER BY r.created_at DESC LIMIT 20
  `);
  res.json({ok:true,items:r.rows});
});

reviewsRouter.get("/pending", requireAuth, requireRole("employe","admin"), async (req,res)=>{
  const r=await pool.query(`
    SELECT r.id,r.rating,r.comment,r.created_at,u.first_name,u.last_name
    FROM reviews r JOIN users u ON u.id=r.user_id
    WHERE r.is_validated=FALSE ORDER BY r.created_at DESC
  `);
  res.json({ok:true,items:r.rows});
});

reviewsRouter.post("/", requireAuth, async (req,res)=>{
  const { orderId,rating,comment }=req.body||{};
  if(!orderId||!rating||!comment) return res.status(400).json({error:"Champs manquants"});
  const o=await pool.query("SELECT * FROM orders WHERE id=$1",[Number(orderId)]);
  if(o.rowCount===0) return res.status(404).json({error:"Commande introuvable"});
  const ord=o.rows[0];
  if(req.user.role==="user" && req.user.id!==ord.user_id) return res.status(403).json({error:"Accès refusé"});
  if(ord.status!=="terminée") return res.status(400).json({error:"Avis possible uniquement si commande terminée"});
  await pool.query("INSERT INTO reviews (order_id,user_id,rating,comment) VALUES ($1,$2,$3,$4)",[Number(orderId),req.user.id,Number(rating),String(comment)]);
  res.json({ok:true});
});

reviewsRouter.post("/:id/validate", requireAuth, requireRole("employe","admin"), async (req,res)=>{
  await pool.query("UPDATE reviews SET is_validated=$1 WHERE id=$2",[Boolean(req.body?.isValidated),Number(req.params.id)]);
  res.json({ok:true});
});
