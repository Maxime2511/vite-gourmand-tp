export function isStrongPassword(pw) {
  if (typeof pw !== "string") return false;
  if (pw.length < 10) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[0-9]/.test(pw)) return false;
  if (!/[^A-Za-z0-9]/.test(pw)) return false;
  return true;
}
export function safeNumber(v, def=0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}
export function monthKey(d=new Date()) {
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  return `${y}-${m}`;
}
