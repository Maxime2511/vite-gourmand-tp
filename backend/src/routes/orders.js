import express from "express";
import { pool } from "../services/pg.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { db as mongoDb } from "../services/mongo.js";
import { monthKey, safeNumber } from "../utils.js";

export const ordersRouter = express.Router();

function deliveryFee(city, km){
  const c=String(city||"").trim().toLowerCase();
  if(c==="bordeaux") return 0;
  return 5 + 0.59*Math.max(0,km);
}

ordersRouter.post("/", requireAuth, requireRole("user","employe","admin"), async (req,res)=>{
  const userId=req.user.id;
  const { menuId,peopleCount,prestationDate,prestationTime,prestationAddress,prestationCity,distanceKm }=req.body||{};
  if(!menuId||!peopleCount||!prestationDate||!prestationTime||!prestationAddress||!prestationCity) return res.status(400).json({error:"Champs manquants"});

  const mr=await pool.query("SELECT id,min_people,base_price,stock FROM menus WHERE id=$1",[Number(menuId)]);
  if(mr.rowCount===0) return res.status(404).json({error:"Menu introuvable"});
  const m=mr.rows[0];
  if(m.stock<=0) return res.status(400).json({error:"Stock indisponible"});

  const pc=Number(peopleCount);
  if(pc<m.min_people) return res.status(400).json({error:"Nombre de personnes insuffisant"});

  const km=safeNumber(distanceKm,0);
  const dfee=deliveryFee(prestationCity,km);
  const menuPrice=Number(m.base_price);
  const discount = (pc >= m.min_people + 5) ? (menuPrice*0.10) : 0;
  const total=(menuPrice-discount)+dfee;

  const ins=await pool.query(
    `INSERT INTO orders (user_id,menu_id,people_count,prestation_date,prestation_time,prestation_address,prestation_city,distance_km,
      delivery_fee,menu_price,discount,total_price,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'reçue') RETURNING id`,
    [userId,m.id,pc,prestationDate,prestationTime,prestationAddress,prestationCity,km,dfee.toFixed(2),menuPrice.toFixed(2),discount.toFixed(2),total.toFixed(2)]
  );
  const orderId=ins.rows[0].id;
  await pool.query("INSERT INTO order_status_history (order_id,status) VALUES ($1,'reçue')",[orderId]);
  await pool.query("UPDATE menus SET stock=stock-1 WHERE id=$1 AND stock>0",[m.id]);

  const month=monthKey(new Date());
  await mongoDb.collection("menu_stats").updateOne(
    { menuId:m.id, month },
    { $setOnInsert:{ menuId:m.id, month }, $inc:{ ordersCount:1, revenue: total } },
    { upsert:true }
  );

  console.log(`[MAIL] Confirmation commande (dev) orderId=${orderId}`);
  res.json({ok:true,orderId,pricing:{menuPrice,discount,deliveryFee:dfee,total}});
});

ordersRouter.get("/mine", requireAuth, async (req,res)=>{
  const r=await pool.query(
    `SELECT o.*, m.title AS menu_title FROM orders o JOIN menus m ON m.id=o.menu_id WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json({ok:true,items:r.rows});
});

ordersRouter.get("/", requireAuth, requireRole("employe","admin"), async (req,res)=>{
  const { status,email }=req.query;
  const where=[]; const params=[];
  const add=(sql,v)=>{ params.push(v); where.push(sql.replace("?",`$${params.length}`)); };
  if(status) add("o.status = ?", String(status));
  if(email) add("u.email = ?", String(email).toLowerCase());
  const q=`SELECT o.*, u.email,u.first_name,u.last_name, m.title AS menu_title
           FROM orders o JOIN users u ON u.id=o.user_id JOIN menus m ON m.id=o.menu_id
           ${where.length?"WHERE "+where.join(" AND "):""}
           ORDER BY o.created_at DESC`;
  const r=await pool.query(q,params);
  res.json({ok:true,items:r.rows});
});

ordersRouter.get("/:id/history", requireAuth, async (req,res)=>{
  const id=Number(req.params.id);
  const o=await pool.query("SELECT user_id FROM orders WHERE id=$1",[id]);
  if(o.rowCount===0) return res.status(404).json({error:"Commande introuvable"});
  if(req.user.role==="user" && req.user.id!==o.rows[0].user_id) return res.status(403).json({error:"Accès refusé"});
  const h=await pool.query("SELECT status,changed_at FROM order_status_history WHERE order_id=$1 ORDER BY changed_at ASC",[id]);
  res.json({ok:true,history:h.rows});
});

ordersRouter.post("/:id/status", requireAuth, requireRole("employe","admin"), async (req,res)=>{
  const id=Number(req.params.id);
  const { status }=req.body||{};
  const allowed=["accepté","en préparation","en cours de livraison","livré","en attente du retour de matériel","terminée"];
  if(!allowed.includes(status)) return res.status(400).json({error:"Statut invalide"});
  await pool.query("UPDATE orders SET status=$1 WHERE id=$2",[status,id]);
  await pool.query("INSERT INTO order_status_history (order_id,status) VALUES ($1,$2)",[id,status]);
  if(status==="en attente du retour de matériel") console.log("[MAIL] Matériel: 10 jours ouvrés sinon 600€ (dev)");
  if(status==="terminée") console.log("[MAIL] Invite avis (dev)");
  res.json({ok:true});
});

ordersRouter.post("/:id/cancel", requireAuth, async (req,res)=>{
  const id=Number(req.params.id);
  const { reason, contactMode }=req.body||{};
  const o=await pool.query("SELECT * FROM orders WHERE id=$1",[id]);
  if(o.rowCount===0) return res.status(404).json({error:"Commande introuvable"});
  const ord=o.rows[0];

  if(req.user.role==="user"){
    if(req.user.id!==ord.user_id) return res.status(403).json({error:"Accès refusé"});
    if(ord.status!=="reçue") return res.status(400).json({error:"Annulation impossible après acceptation"});
  } else {
    if(!reason||!contactMode) return res.status(400).json({error:"Motif + mode de contact requis"});
  }

  await pool.query("UPDATE orders SET status='annulée', cancel_reason=$1, cancel_contact_mode=$2 WHERE id=$3",[reason||null,contactMode||null,id]);
  await pool.query("INSERT INTO order_status_history (order_id,status) VALUES ($1,'annulée')",[id]);
  res.json({ok:true});
});
