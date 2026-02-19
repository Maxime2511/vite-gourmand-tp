import jwt from "jsonwebtoken";

export function requireAuth(req,res,next){
  const h=req.headers.authorization||"";
  const token=h.startsWith("Bearer ")?h.slice(7):null;
  if(!token) return res.status(401).json({error:"Non authentifié"});
  try{
    req.user=jwt.verify(token, process.env.JWT_SECRET);
    next();
  }catch{
    return res.status(401).json({error:"Token invalide"});
  }
}
export function requireRole(...roles){
  return (req,res,next)=>{
    if(!req.user) return res.status(401).json({error:"Non authentifié"});
    if(!roles.includes(req.user.role)) return res.status(403).json({error:"Accès refusé"});
    next();
  };
}
