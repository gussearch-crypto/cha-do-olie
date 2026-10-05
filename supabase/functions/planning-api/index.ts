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

const validPath = (path:any) => typeof path==='string' && /^expenses\/[a-zA-Z0-9_-]{1,100}\/[a-f0-9-]{36}\.(pdf|jpg|png|webp)$/.test(path);
function allDocuments(expense:any) {
  return [...(expense.attachments||[]),...(expense.installments||[]).flatMap((p:any)=>(p.payments||[]).flatMap((h:any)=>h.attachments||[]))];
}
function detailedHistory(installment:any) {
  const history = installment.payments || [], cents = (v:any)=>Math.max(0,Math.round((Number(v)||0)*100));
  if (history.reduce((sum:number,h:any)=>sum+(h.reversedAt?0:cents(h.amount)),0)===cents(installment.paidAmount)) return history;
  return cents(installment.paidAmount)>0 ? [{id:'legacy-'+installment.id,amount:cents(installment.paidAmount)/100,paidAt:installment.paidAt||'',payment:installment.payment||'Outros',legacy:true}] : [];
}
function fileKind(bytes:Uint8Array) {
  if (bytes.length>=5 && [37,80,68,70,45].every((b,i)=>bytes[i]===b)) return {mime:'application/pdf',ext:'pdf'};
  if (bytes.length>=8 && [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)) return {mime:'image/png',ext:'png'};
  if (bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return {mime:'image/jpeg',ext:'jpg'};
  if (bytes.length>=12 && [82,73,70,70].every((b,i)=>bytes[i]===b) && [87,69,66,80].every((b,i)=>bytes[i+8]===b)) return {mime:'image/webp',ext:'webp'};
  return null;
}
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  if (req.method !== "POST") return json({error:"method_not_allowed"},405);
  const multipart = req.headers.get('content-type')?.includes('multipart/form-data');
  const form = multipart ? await req.formData().catch(()=>null) : null;
  const body:any = multipart ? Object.fromEntries(form?.entries() || []) : await req.json().catch(() => ({}));
  if (!(await isAdmin(body.adminCode))) return json({error:"unauthorized"},401);
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (body.action === 'get') {
    const {data,error} = await supabase.from('event_planning_state').select('data,updated_at').eq('id','main').maybeSingle();
    if (error) return json({error:'planning_load_failed'},500);
    return json({data:data?.data || null, updatedAt:data?.updated_at || null});
  }
  if (['upload','file_url','remove_file'].includes(body.action)) {
    const {data:record,error:loadError} = await supabase.from('event_planning_state').select('data').eq('id','main').maybeSingle();
    if (loadError) return json({error:'planning_load_failed'},500);
    const state = record?.data;
    if (!validData(state)) return json({error:'target_not_found'},404);
    const bucket = supabase.storage.from('planning-documents');
    if (body.action === 'file_url') {
      const expenses = [...state.expenses,...(state.trash || []).filter((x:any)=>x.type==='expense').map((x:any)=>x.item)];
      const known = expenses.some((e:any)=>allDocuments(e).some((d:any)=>d.path===body.path));
      if (!known || !validPath(body.path)) return json({error:'file_not_found'},404);
      const {data,error} = await bucket.createSignedUrl(body.path,60);
      return error ? json({error:'storage_failed'},500) : json({url:data.signedUrl});
    }
    const expense = state.expenses.find((e:any)=>e.id===body.expenseId);
    if (!expense || !/^[a-zA-Z0-9_-]{1,100}$/.test(expense.id)) return json({error:'target_not_found'},404);
    let target = expense;
    if (body.paymentId) {
      const installment = (expense.installments||[]).find((p:any)=>p.id===body.installmentId);
      if (!installment) return json({error:'target_not_found'},404);
      installment.payments = detailedHistory(installment);
      target = installment.payments.find((h:any)=>h.id===body.paymentId);
      if (!target) return json({error:'target_not_found'},404);
    }
    const documents = target.attachments || [];
    if (body.action === 'upload') {
      const file = body.file;
      if (!(file instanceof File) || file.size===0 || file.size>5*1024*1024) return json({error:'invalid_file'},400);
      if (documents.length>=20) return json({error:'attachment_limit'},400);
      const bytes = new Uint8Array(await file.arrayBuffer()), kind = fileKind(bytes);
      if (!kind || file.type!==kind.mime) return json({error:'invalid_file'},400);
      const path = `expenses/${expense.id}/${crypto.randomUUID()}.${kind.ext}`;
      const {error:uploadError} = await bucket.upload(path,bytes,{contentType:kind.mime,upsert:false});
      if (uploadError) return json({error:'upload_failed'},500);
      const document = {id:crypto.randomUUID(),path,name:file.name.slice(0,180),size:file.size,type:kind.mime,uploadedAt:new Date().toISOString()};
      target.attachments = [...documents,document];
      const {error:saveError} = await supabase.from('event_planning_state').upsert({id:'main',data:state,updated_at:new Date().toISOString()},{onConflict:'id'});
      if (saveError) {await bucket.remove([path]);return json({error:'planning_save_failed'},500)}
      return json({expense});
    }
    if (!validPath(body.path) || !documents.some((d:any)=>d.path===body.path)) return json({error:'file_not_found'},404);
    // Persist the removal first so a failed database write never loses the file.
    target.attachments = documents.filter((d:any)=>d.path!==body.path);
    const {error:saveError} = await supabase.from('event_planning_state').upsert({id:'main',data:state,updated_at:new Date().toISOString()},{onConflict:'id'});
    if (saveError) return json({error:'planning_save_failed'},500);
    await bucket.remove([body.path]);
    return json({expense});
  }
  if (body.action === 'save') {
    if (!validData(body.data)) return json({error:'invalid_data'},400);
    const {data:previousRecord,error:previousError} = await supabase.from('event_planning_state').select('data').eq('id','main').maybeSingle();
    if (previousError) return json({error:'planning_load_failed'},500);
    const previous = previousRecord?.data || {};
    let budgets = {};
    if (body.data.budgets !== undefined) {
      if (!body.data.budgets || typeof body.data.budgets !== 'object' || Array.isArray(body.data.budgets)) return json({error:'invalid_budgets'},400);
      const entries = Object.entries(body.data.budgets);
      if (entries.length > 100 || entries.some(([key,value]) => key.length > 100 || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isSafeInteger(Math.round(value * 100)))) return json({error:'invalid_budgets'},400);
      budgets = Object.fromEntries(entries.map(([key,value]) => [key,Math.round(Number(value) * 100) / 100]));
    } else {
      // An older client may save tasks and expenses without knowing about budgets.
      budgets = previous.budgets || {};
    }
    const trash = body.data.trash===undefined ? previous.trash || [] : body.data.trash;
    if (!Array.isArray(trash) || trash.length>500 || trash.some((entry:any)=>!entry || !['task','expense'].includes(entry.type) || !entry.item?.id || typeof entry.id!=='string' || typeof entry.deletedAt!=='string')) return json({error:'invalid_trash'},400);
    const clean = {trash,tasks:body.data.tasks.slice(0,500), expenses:body.data.expenses.slice(0,500), budgets};
    const {error} = await supabase.from('event_planning_state').upsert({id:'main',data:clean,updated_at:new Date().toISOString()},{onConflict:'id'});
    if (error) return json({error:'planning_save_failed'},500);
    return json({ok:true});
  }
  return json({error:'unknown_action'},400);
});
