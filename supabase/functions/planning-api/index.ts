import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"content-type", "Access-Control-Allow-Methods":"POST, OPTIONS"};
const ADMIN_HASH="be8f2e0e71d2ed6fe381fda864a08fa0f10601188c492a1fc7659d8e114c1fec";
const json = (data:any, status=200) => new Response(JSON.stringify(data), {status, headers:{...cors, "Content-Type":"application/json"}});
async function isAdmin(value:any) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value || "")));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2,"0")).join("") === ADMIN_HASH;
}
const validData = (value:any) => value && typeof value === 'object' && Array.isArray(value.tasks) && Array.isArray(value.expenses);

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return json({error:"method_not_allowed"},405);
  const body = await req.json().catch(() => ({}));
  if (!(await isAdmin(body.adminCode))) return json({error:"unauthorized"},401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (body.action === 'get') {
    const {data,error} = await supabase.from('event_planning_state').select('data,updated_at').eq('id','main').maybeSingle();
    if (error) return json({error:'planning_load_failed'},500);
    return json({data:data?.data || null, updatedAt:data?.updated_at || null});
  }
  if (body.action === 'save') {
    if (!validData(body.data)) return json({error:'invalid_data'},400);
    let budgets = {};
    if (body.data.budgets !== undefined) {
      if (!body.data.budgets || typeof body.data.budgets !== 'object' || Array.isArray(body.data.budgets)) return json({error:'invalid_budgets'},400);
      const entries = Object.entries(body.data.budgets);
      if (entries.length > 100 || entries.some(([key,value]) => key.length > 100 || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)))) return json({error:'invalid_budgets'},400);
      budgets = Object.fromEntries(entries.map(([key,value]) => [key,Math.round(Number(value) * 100) / 100]));
    } else {
      // An older client may save tasks and expenses without knowing about budgets.
      const {data:previous,error} = await supabase.from('event_planning_state').select('data').eq('id','main').maybeSingle();
      if (error) return json({error:'planning_load_failed'},500);
      budgets = previous?.data?.budgets || {};
    }
    const clean = {tasks:body.data.tasks.slice(0,500), expenses:body.data.expenses.slice(0,500), budgets};
    const {error} = await supabase.from('event_planning_state').upsert({id:'main',data:clean,updated_at:new Date().toISOString()},{onConflict:'id'});
    if (error) return json({error:'planning_save_failed'},500);
    return json({ok:true});
  }
  return json({error:'unknown_action'},400);
});
