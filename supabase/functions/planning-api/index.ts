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

function validTaskDependencies(tasks:any[]) {
  if(tasks.some(t=>!t||typeof t.id!=='string'||!t.id)||new Set(tasks.map(t=>t.id)).size!==tasks.length)return false;
  const map=new Map(tasks.map(t=>[t.id,t])),visiting=new Set(),visited=new Set();
  const visit=(id:any):boolean=>{
    if(visiting.has(id))return false;if(visited.has(id))return true;
    const task=map.get(id);if(!task)return true;
    const links=task.dependsOn||[];
    if(!Array.isArray(links)||links.length>50||links.some((x:any)=>typeof x!=='string'||!x)||new Set(links).size!==links.length)return false;
    visiting.add(id);if(!links.every(visit))return false;visiting.delete(id);visited.add(id);return true;
  };
  return tasks.every(t=>visit(t.id));
}

// History is generated from committed state, never accepted from client payloads.
function planningHistory(previous:any,next:any) {
  const events:any[]=[],at=new Date().toISOString();
  const text=(value:any)=>value===undefined||value===null?'':typeof value==='object'?JSON.stringify(value).slice(0,500):String(value).slice(0,500);
  const fields:any={title:'Título',description:'Serviço',category:'Categoria',supplier:'Fornecedor',contracted:'Valor contratado',planned:'Valor previsto',due:'Prazo',status:'Situação',priority:'Prioridade',responsible:'Responsável',expenseId:'Serviço vinculado',notes:'Observação',eventDate:'Data do cronograma',eventTime:'Horário',eventEnd:'Horário final',contact:'Contato',place:'Local',dependsOn:'Dependências',subtasks:'Etapas',installments:'Parcelas e pagamentos',proposals:'Propostas',selectedProposalId:'Proposta contratada'};
  const money=(value:any)=>(Number(value)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const display=(key:string,value:any)=>{
    if(key==='installments')return (value||[]).map((p:any)=>`${p.label||'Parcela'}: ${money(p.amount)} · Vencimento: ${p.due||'Sem data'} · Pago: ${money(p.paidAmount)}${p.paidAt?' em '+p.paidAt:''}${p.payment?' · '+p.payment:''} · Estornos: ${(p.payments||[]).filter((h:any)=>h.reversedAt).length}`).join('; ');
    if(key==='dependsOn')return (value||[]).map((id:any)=>[...(next.tasks||[]),...(previous.tasks||[])].find((t:any)=>t.id===id)?.title||'Ação removida').join('; ');
    if(key==='subtasks')return (value||[]).map((p:any)=>`${p.title}: ${p.done?'Concluída':'Pendente'}`).join('; ');
    if(key==='proposals')return (value||[]).map((p:any)=>`${p.supplier}: ${money(p.amount)}${p.terms?' · '+p.terms:''}${p.validUntil?' · Validade: '+p.validUntil:''}`).join('; ');
    if(key==='expenseId')return [...(next.expenses||[]),...(previous.expenses||[])].find((e:any)=>e.id===value)?.description||(value?'Serviço indisponível':'Sem vínculo');
    if(key==='selectedProposalId')return [...(next.quotes||[]),...(previous.quotes||[])].flatMap((q:any)=>q.proposals||[]).find((p:any)=>p.id===value)?.supplier||'Sem contratação';
    if(key==='status')return ({todo:'A realizar',done:'Realizada'} as any)[value]||value||'';
    if(key==='priority')return ({high:'Alta',medium:'Média',low:'Baixa'} as any)[value]||value||'';
    if(key==='contracted'||key==='planned')return value===undefined?'Não definido':money(value);
    return value??'';
  };
  for(const section of ['tasks','expenses','quotes']){
    const before=new Map((previous[section]||[]).map((x:any)=>[x.id,x])),after=new Map((next[section]||[]).map((x:any)=>[x.id,x]));
    for(const key of new Set([...before.keys(),...after.keys()])){
      const old:any=before.get(key),item:any=after.get(key),changes=old&&item?Object.entries(fields).flatMap(([field,label])=>{const a=text(display(field,old[field])),b=text(display(field,item[field]));return JSON.stringify(display(field,old[field]))===JSON.stringify(display(field,item[field]))?[]:[{label,before:a,after:b}]}):[];
      if(old&&item&&!changes.length)continue;
      const restored=!old&&item&&(previous.trash||[]).some((e:any)=>e.item?.id===key);
      events.push({id:crypto.randomUUID(),at,section,recordId:key,title:text(item?.title||item?.description||old?.title||old?.description||'Registro'),action:!item?'Movido para a lixeira':restored?'Restaurado':!old?'Criado':'Atualizado',changes});
    }
  }
  for(const section of ['budgets','guestSettings']){
    const changes=Object.keys({...previous[section],...next[section]}).flatMap(key=>{const a=text(previous[section]?.[key]),b=text(next[section]?.[key]);return a===b?[]:[{label:({basis:'Base do público',excludeUnder5:'Excluir menores de 5 anos',estimatedGuests:'Estimativa de convidados'} as any)[key]||key,before:a,after:b}]});
    if(changes.length)events.push({id:crypto.randomUUID(),at,section,title:section==='budgets'?'Orçamento por categoria':'Base do custo por convidado',action:'Atualizado',changes});
  }
  return [...events,...(previous.history||[])].slice(0,500);
}

const boundedText=(value:any,max:number)=>typeof value==='string'&&value.length<=max;
function validQuote(quote:any) {
  if(!quote||!boundedText(quote.id,94)||!quote.id||!boundedText(quote.title,180)||!quote.title.trim()||!boundedText(quote.category,100))return false;
  if(!Array.isArray(quote.proposals)||!quote.proposals.length||quote.proposals.length>21||new Set(quote.proposals.map((p:any)=>p?.id)).size!==quote.proposals.length)return false;
  if(quote.expenseId!==undefined&&!boundedText(quote.expenseId,100))return false;
  if(quote.selectedProposalId!==undefined&&!quote.proposals.some((p:any)=>p.id===quote.selectedProposalId))return false;
  return quote.proposals.every((p:any)=>{
    if(!p||!boundedText(p.id,100)||!p.id||!boundedText(p.supplier,180)||!p.supplier.trim())return false;
    if(typeof p.amount!=='number'||!Number.isFinite(p.amount)||p.amount<0||!Number.isSafeInteger(Math.round(p.amount*100)))return false;
    if(['terms','notes'].some(k=>p[k]!==undefined&&!boundedText(p[k],4000))||p.contact!==undefined&&!boundedText(p.contact,180))return false;
    if(p.validUntil!==undefined&&p.validUntil!=='') {
      if(!boundedText(p.validUntil,10)||!/^\d{4}-\d{2}-\d{2}$/.test(p.validUntil))return false;
      const stamp=Date.parse(p.validUntil+'T12:00:00Z');if(!Number.isFinite(stamp)||new Date(stamp).toISOString().slice(0,10)!==p.validUntil)return false;
    }
    return true;
  });
}

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
const expectedRevision = (body:any) => body.expectedRevision !== undefined && /^\d+$/.test(String(body.expectedRevision)) && Number.isSafeInteger(Number(body.expectedRevision)) ? Number(body.expectedRevision) : null;
async function commitState(client:any,state:any,revision:number,exists:boolean) {
  const row={id:'main',data:state,revision:revision+1,updated_at:new Date().toISOString()};
  const result=exists
    ? await client.from('event_planning_state').update(row).eq('id','main').eq('revision',revision).select('revision').maybeSingle()
    : await client.from('event_planning_state').insert(row).select('revision').maybeSingle();
  if(result.error) return result.error.code==='23505' ? json({error:'conflict'},409) : json({error:'planning_save_failed'},500);
  return result.data ? null : json({error:'conflict'},409);
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
    const {data,error} = await supabase.from('event_planning_state').select('data,updated_at,revision').eq('id','main').maybeSingle();
    if (error) return json({error:'planning_load_failed'},500);
    return json({data:data?.data || null, updatedAt:data?.updated_at || null, revision:data?.revision || 0});
  }
  if (['upload','file_url','remove_file'].includes(body.action)) {
    const {data:record,error:loadError} = await supabase.from('event_planning_state').select('data,revision').eq('id','main').maybeSingle();
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
    const revision=expectedRevision(body);
    if(revision===null) return json({error:'upgrade_required'},409);
    if(revision!==(record?.revision || 0)) return json({error:'conflict'},409);
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
      const failure=await commitState(supabase,state,revision,true);
      if(failure){await bucket.remove([path]);return failure}
      return json({expense,revision:revision+1});
    }
    if (!validPath(body.path) || !documents.some((d:any)=>d.path===body.path)) return json({error:'file_not_found'},404);
    // Persist the removal first so a failed database write never loses the file.
    target.attachments = documents.filter((d:any)=>d.path!==body.path);
    const failure=await commitState(supabase,state,revision,true);
    if(failure)return failure;
    await bucket.remove([body.path]);
    return json({expense,revision:revision+1});
  }
  if (body.action === 'save') {
    if (!validData(body.data)) return json({error:'invalid_data'},400);
    if (!validTaskDependencies(body.data.tasks)) return json({error:'invalid_dependencies'},400);
    const {data:previousRecord,error:previousError} = await supabase.from('event_planning_state').select('data,revision').eq('id','main').maybeSingle();
    if (previousError) return json({error:'planning_load_failed'},500);
    const revision=expectedRevision(body);
    if(revision===null)return json({error:'upgrade_required'},409);
    if(revision!==(previousRecord?.revision || 0))return json({error:'conflict'},409);
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
    if (!Array.isArray(trash) || trash.length>500 || trash.some((entry:any)=>!entry || !['task','expense','quote'].includes(entry.type) || !entry.item?.id || typeof entry.id!=='string' || typeof entry.deletedAt!=='string')) return json({error:'invalid_trash'},400);
    const quotes=body.data.quotes===undefined ? previous.quotes || [] : body.data.quotes;
    if(!Array.isArray(quotes)||quotes.length>500||new Set(quotes.map((q:any)=>q?.id)).size!==quotes.length||quotes.some((q:any)=>!validQuote(q)))return json({error:'invalid_quotes'},400);
    const guestSettings=body.data.guestSettings===undefined ? previous.guestSettings || {basis:'confirmed',excludeUnder5:true,estimatedGuests:100} : body.data.guestSettings;
    if(!guestSettings||!['confirmed','estimate'].includes(guestSettings.basis)||typeof guestSettings.excludeUnder5!=='boolean'||guestSettings.estimatedGuests!==null&&(!Number.isInteger(guestSettings.estimatedGuests)||guestSettings.estimatedGuests<0||guestSettings.estimatedGuests>10000))return json({error:'invalid_guest_settings'},400);
    const clean:any = {quotes,guestSettings,trash,tasks:body.data.tasks.slice(0,500), expenses:body.data.expenses.slice(0,500), budgets};
    clean.history=planningHistory(previous,clean);
    const failure=await commitState(supabase,clean,revision,!!previousRecord);
    if(failure)return failure;
    return json({ok:true,revision:revision+1,history:clean.history});
  }
  return json({error:'unknown_action'},400);
});
