import express from "express";
import { pool } from "../services/pg.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const menusRouter = express.Router();

menusRouter.get("/", async (req,res)=>{
  const { maxPrice,minPrice,theme,regime,minPeople }=req.query;
  const where=[]; const params=[];
  const add=(sql,v)=>{ params.push(v); where.push(sql.replace("?",`$${params.length}`)); };
  if(maxPrice) add("base_price <= ?", Number(maxPrice));
  if(minPrice) add("base_price >= ?", Number(minPrice));
  if(theme) add("theme = ?", String(theme));
  if(regime) add("regime = ?", String(regime));
  if(minPeople) add("min_people <= ?", Number(minPeople));
  const q=`SELECT id,title,description,theme,regime,conditions,min_people,base_price,stock,gallery
           FROM menus ${where.length?"WHERE "+where.join(" AND "):""} ORDER BY id DESC`;
  const r=await pool.query(q,params);
  res.json({ok:true,items:r.rows});
});

menusRouter.get("/:id", async (req,res)=>{
  const id=Number(req.params.id);
  const m=await pool.query("SELECT * FROM menus WHERE id=$1",[id]);
  if(m.rowCount===0) return res.status(404).json({error:"Menu introuvable"});
  const dishes=await pool.query(`
    SELECT d.id,d.name,d.dish_type,d.description,
      COALESCE(json_agg(a.name) FILTER (WHERE a.name IS NOT NULL), '[]') AS allergens
    FROM menu_dishes md
    JOIN dishes d ON d.id=md.dish_id
    LEFT JOIN dish_allergens da ON da.dish_id=d.id
    LEFT JOIN allergens a ON a.id=da.allergen_id
    WHERE md.menu_id=$1
    GROUP BY d.id
    ORDER BY d.dish_type, d.name
  `,[id]);
  res.json({ok:true,menu:m.rows[0],dishes:dishes.rows});
});

menusRouter.post("/", requireAuth, requireRole("employe","admin"), async (req,res)=>{
  const { title,description,theme,regime,conditions,minPeople,basePrice,stock,gallery }=req.body||{};
  if(!title||!description||!theme||!regime||!conditions) return res.status(400).json({error:"Champs manquants"});
  const r=await pool.query(
    `INSERT INTO menus (title,description,theme,regime,conditions,min_people,base_price,stock,gallery)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [title,description,theme,regime,conditions,Number(minPeople||1),Number(basePrice||0),Number(stock||0),JSON.stringify(gallery||[])]
  );
  res.json({ok:true,id:r.rows[0].id});
});
