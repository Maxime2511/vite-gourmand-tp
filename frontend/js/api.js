export function getToken(){ return localStorage.getItem("vg_token"); }
export function getUser(){ try{return JSON.parse(localStorage.getItem("vg_user")||"null");}catch{return null;} }
export function setSession(token,user){ localStorage.setItem("vg_token",token); localStorage.setItem("vg_user",JSON.stringify(user)); }
export function clearSession(){ localStorage.removeItem("vg_token"); localStorage.removeItem("vg_user"); }
export function requireLogin(){ if(!getToken()){ location.href="/login.html"; return false;} return true; }
export async function api(path,{method="GET",body=null}={}){
  const headers={"Content-Type":"application/json"};
  const t=getToken(); if(t) headers["Authorization"]=`Bearer ${t}`;
  const r=await fetch(path,{method,headers,body: body?JSON.stringify(body):null});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error||"Erreur API");
  return data;
}
