import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(d:any,status=200)=>new Response(JSON.stringify(d),{status,headers:{...cors,"Content-Type":"application/json"}});
const HASH="be8f2e0e71d2ed6fe381fda864a08fa0f10601188c492a1fc7659d8e114c1fec";
async function admin(value:any){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value||"")));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")===HASH}
const norm=(s:any)=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ").toLowerCase();
const n=(v:any)=>Number(v);
const finite=(v:any,min:number,max:number)=>Number.isFinite(n(v))&&n(v)>=min&&n(v)<=max;
const iso=(v:any)=>{if(typeof v!=="string"||!/^20\d{2}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+"T12:00:00Z");return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v};
function aggregate(rows:any[],key:string){const vals=rows.map(r=>r[key]).filter((v:any)=>v!==null && v!==undefined);const distribution=Object.entries(vals.reduce((a:any,v:any)=>(a[String(v)]=(a[String(v)]||0)+1,a),{})).map(([value,count])=>({value,count})).sort((a:any,b:any)=>String(a.value).localeCompare(String(b.value),"pt-BR",{numeric:true}));return {count:vals.length,average:key==="birth_date"?null:vals.length?Math.round(vals.reduce((a:number,b:any)=>a+Number(b),0)/vals.length*10)/10:null,distribution};}
function ranking(rows:any[],key:string,actual:any,isDate=false){if(actual===null||actual===undefined)return [];return rows.filter(r=>r[key]!==null).map(r=>({name:r.participant_name,guess:r[key],difference:isDate?Math.abs((Date.parse(r[key]+"T12:00:00Z")-Date.parse(actual+"T12:00:00Z"))/86400000):Math.abs(Number(r[key])-Number(actual))})).sort((a,b)=>a.difference-b.difference||a.name.localeCompare(b.name));}

const validBirthTime=(v:any)=>typeof v==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const normalizePhone=(v:any)=>String(v||"").replace(/\D/g,"");
const validPhone=(v:any)=>/^\d{11}$/.test(normalizePhone(v))&&normalizePhone(v).slice(0,2)!=="00"&&normalizePhone(v)[2]==="9";
const birthOfficialStarted=(settings:any,officialTime:any)=>settings.actual_birth_date!=null||settings.actual_weight_g!=null||settings.actual_length_cm!=null||Boolean(officialTime)||settings.results_published||settings.birth_date_revealed||settings.weight_revealed||settings.length_revealed||settings.jackpot_revealed;
function birthRank(rows:any[],official:any){
 const point=(max:number,diff:number,ref:number)=>max/(1+diff/ref);
 return rows.filter(r=>r.birth_date&&r.birth_time&&r.weight_g!=null&&r.length_cm!=null).map(r=>{
  const start=Date.parse(r.birth_date+"T"+String(r.birth_time).slice(0,5)+":00Z");
  const end=Date.parse(official.date+"T"+official.time+":00Z");
  const minutes=Math.abs(start-end)/60000,grams=Math.abs(Number(r.weight_g)-Number(official.weight)),cm=Math.abs(Number(r.length_cm)-Number(official.length));
  const dateTimePoints=point(200,minutes,20160),weightPoints=point(100,grams,500),lengthPoints=point(100,cm,5);
  return {id:r.id,name:r.participant_name,source:r.participation_source||"cha",contact:r.contact_whatsapp||null,contactStatus:r.prize_contact_status||"pending",contactedAt:r.prize_contacted_at||null,registeredAt:r.created_at||null,guessDate:r.birth_date,guessTime:String(r.birth_time).slice(0,5),guessWeight:r.weight_g,guessLength:r.length_cm,differenceMinutes:minutes,differenceGrams:grams,differenceCm:cm,dateTimePoints,weightPoints,lengthPoints,total:dateTimePoints+weightPoints+lengthPoints};
 }).filter(x=>Number.isFinite(x.total)).sort((a,b)=>b.total-a.total||a.differenceMinutes-b.differenceMinutes||a.differenceGrams-b.differenceGrams||a.differenceCm-b.differenceCm||a.name.localeCompare(b.name,"pt-BR"));
}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
try {const b=await req.json(),db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const action=String(b.action||"");
const {data:config,error:ce}=await db.from("oliver_game_settings").select("*").eq("id",1).single();if(ce)return reply({error:"settings_unavailable"},500);

if(action==="adminBirthToggle"){
 if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
 const reopen=b.open===true;
 const expected=reopen?"REABRIR PALPITES":"ENCERRAR PALPITES";
 if(String(b.confirmation||"")!==expected)return reply({error:"confirmation_required"},400);
 const {data:announcement,error:ae}=await db.from("oliver_birth_announcement").select("birth_time").eq("id",1).maybeSingle();
 if(ae)return reply({error:"announcement_unavailable"},500);
 const locked=birthOfficialStarted(config,announcement?.birth_time);
 if(reopen){
  if(locked)return reply({error:"official_data_already_registered"},409);
  if(config.birth_open)return reply({error:"already_open"},409);
  if(config.birth_closed_reason!=="manual")return reply({error:"reopen_not_allowed"},409);
  const {data:updated,error}=await db.from("oliver_game_settings").update({birth_open:true,birth_closed_at:null,birth_closed_reason:null,updated_at:new Date().toISOString()}).eq("id",1).eq("birth_open",false).eq("birth_closed_reason","manual").is("actual_birth_date",null).is("actual_weight_g",null).is("actual_length_cm",null).eq("results_published",false).eq("updated_at",config.updated_at).select("id").maybeSingle();
  if(error||!updated)return reply({error:"state_changed_retry"},409);
  await db.from("oliver_game_access_history").insert({game:"birth",operation:"reopened",details:{previous_closed_at:config.birth_closed_at}});
  return reply({ok:true,birth_open:true});
 }
 if(!config.birth_open)return reply({error:"already_closed"},409);
 const now=new Date().toISOString();
 const {data:updated,error}=await db.from("oliver_game_settings").update({birth_open:false,birth_closed_at:now,birth_closed_reason:"manual",updated_at:now}).eq("id",1).eq("birth_open",true).select("id").maybeSingle();
 if(error||!updated)return reply({error:"state_changed_retry"},409);
 await db.from("oliver_game_access_history").insert({game:"birth",operation:"closed",details:{closed_at:now}});
 return reply({ok:true,birth_open:false,birth_closed_at:now});
}
if(action==="remoteGameStatus"){const {data:announcement}=await db.from("oliver_birth_announcement").select("birth_time").eq("id",1).maybeSingle();const closed=!!config.birth_closed_at||!config.birth_open||birthOfficialStarted(config,announcement?.birth_time);return reply({open:!closed,phase:config.results_published?"revealed":closed?"closed":"open",closed_at:config.birth_closed_at||null,results_published:!!config.results_published});}
if(action==="remoteBirthSubmit"){
 if(!config.birth_open||config.birth_closed_at||config.actual_birth_date!=null||config.actual_weight_g!=null||config.actual_length_cm!=null||config.results_published||config.birth_date_revealed||config.weight_revealed||config.length_revealed||config.jackpot_revealed)return reply({error:"game_closed"},409);
 const name=String(b.name||"").trim().replace(/\s+/g," ");
 const phone=normalizePhone(b.whatsapp);
 if(!validPhone(phone))return reply({error:"invalid_whatsapp"},400);
 if(name.length<3||name.length>100||norm(name).split(" ").length<2)return reply({error:"full_name_required"},400);
 if(!iso(b.birth_date)||!validBirthTime(b.birth_time)||!finite(b.weight_g,100,7000)||!finite(b.length_cm,20,75))return reply({error:"invalid_birth_prediction"},400);
 const {data:prior,error:readError}=await db.from("oliver_game_guesses").select("participant_name,contact_whatsapp").not("birth_date","is",null);
 if(readError)return reply({error:"read_failed"},500);
 if((prior||[]).some((row:any)=>norm(row.participant_name)===norm(name)&&(row.contact_whatsapp===phone||!row.contact_whatsapp)))return reply({error:"guess_already_registered"},409);
 const {data:guess,error}=await db.from("oliver_game_guesses").insert({participant_name:name,participant_key:"online:"+norm(name)+":"+phone,contact_whatsapp:phone,guest_id:null,family_id:null,outside_guest_list:true,participation_source:"online",birth_date:b.birth_date,birth_time:b.birth_time,weight_g:Math.round(n(b.weight_g)),length_cm:n(b.length_cm)}).select("id,participant_name,birth_date,birth_time,weight_g,length_cm").single();
 if(error)return reply({error:error.code==="23505"?"guess_already_registered":"save_failed"},error.code==="23505"?409:500);
 return reply({ok:true,guess});
}
if(action==="lookupBirthByContact"){
 const name=norm(String(b.name||"").trim()),phone=normalizePhone(b.whatsapp);
 if(name.length<3||name.split(" ").length<2||!validPhone(phone))return reply({error:"invalid_lookup"},400);
 const {data:matches,error}=await db.from("oliver_game_guesses").select("id,participant_name,birth_date,birth_time,weight_g,length_cm,participation_source").eq("contact_whatsapp",phone).not("birth_date","is",null).limit(30);
 if(error)return reply({error:"lookup_failed"},500);
 const guess=(matches||[]).find((r:any)=>norm(r.participant_name)===name);
 if(!guess)return reply({error:"guess_not_found"},404);
 const {data:announcement}=await db.from("oliver_birth_announcement").select("birth_time").eq("id",1).maybeSingle();
 const official={date:config.actual_birth_date,time:announcement?.birth_time?.slice(0,5),weight:config.actual_weight_g,length:config.actual_length_cm};
 const published=!!config.results_published&&!!official.date&&!!official.time&&official.weight!=null&&official.length!=null;
 let result:any=null;
 if(published){
 const {data:all}=await db.from("oliver_game_guesses").select("id,participant_name,participation_source,birth_date,birth_time,weight_g,length_cm").not("birth_date","is",null);
 const ranking=birthRank(all||[],official);
 const idx=ranking.findIndex((r:any)=>r.id===guess.id);
 if(idx>=0){const x=ranking[idx];result={position:idx+1,totalParticipants:ranking.length,total:x.total,dateTimePoints:x.dateTimePoints,weightPoints:x.weightPoints,lengthPoints:x.lengthPoints,differenceMinutes:x.differenceMinutes,differenceGrams:x.differenceGrams,differenceCm:x.differenceCm,official};}
 }
 return reply({ok:true,guess,published,result});
}
if(action==="adminCompleteBirthTime"){
 if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
 if(config.actual_birth_date||config.birth_date_revealed)return reply({error:"birth_results_locked"},409);
 if(!/^[0-9a-f-]{36}$/i.test(String(b.guessId||""))||!validBirthTime(b.birth_time))return reply({error:"invalid_time"},400);
 const {data:entry,error}=await db.from("oliver_game_guesses").update({birth_time:b.birth_time,contact_whatsapp:normalizePhone(b.whatsapp),updated_at:new Date().toISOString()}).eq("id",b.guessId).not("birth_date","is",null).is("birth_time",null).select("id,birth_time").maybeSingle();
 if(error)return reply({error:"save_failed"},500);
 return entry?reply({ok:true,entry}):reply({error:"time_already_set"},409);
}
if(action==="adminResultPublication"||action==="adminPrizeContact"){
 if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
 const {data:announcement}=await db.from("oliver_birth_announcement").select("birth_time").eq("id",1).maybeSingle();
 const ready=!!config.actual_birth_date&&!!announcement?.birth_time&&config.actual_weight_g!=null&&config.actual_length_cm!=null;
 if(action==="adminResultPublication"){
   const publish=b.published===true;
   if(publish&&!ready)return reply({error:"official_missing"},409);
   if(publish){
     const {count,error:countError}=await db.from("oliver_game_guesses").select("id",{count:"exact",head:true}).not("birth_date","is",null).is("birth_time",null);
     if(countError)return reply({error:"validation_failed"},500);
     if(count)return reply({error:"missing_prediction_time",count},409);
   }
   const {error}=await db.from("oliver_game_settings").update({results_published:publish,updated_at:new Date().toISOString()}).eq("id",1);
   return error?reply({error:"publication_failed"},500):reply({ok:true,published:publish});
 }
 if(!ready)return reply({error:"official_missing"},409);
 const status=String(b.status||""),guessId=String(b.guessId||"");
 if(!["pending","contacted","confirmed","delivered"].includes(status)||!/^[0-9a-f-]{36}$/i.test(guessId))return reply({error:"invalid_status"},400);
 const {data:all,error:readError}=await db.from("oliver_game_guesses").select("id,participant_name,birth_date,birth_time,weight_g,length_cm").not("birth_date","is",null);
 if(readError)return reply({error:"read_failed"},500);
 const official={date:config.actual_birth_date,time:String(announcement.birth_time).slice(0,5),weight:config.actual_weight_g,length:config.actual_length_cm};
 if(!birthRank(all||[],official).slice(0,3).some((r:any)=>r.id===guessId))return reply({error:"not_a_winner"},403);
 const {error}=await db.from("oliver_game_guesses").update({prize_contact_status:status,prize_contacted_at:status==="pending"?null:new Date().toISOString()}).eq("id",guessId);
 return error?reply({error:"save_failed"},500):reply({ok:true});
}
if(action.startsWith("adminDemoLab")){
 if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
 const {data:lab,error:labError}=await db.from("oliver_game_demo_state").select("*").eq("id",1).single();
 if(labError)return reply({error:"lab_unavailable"},500);
 const started=lab.official_birth_date!=null||lab.official_birth_time!=null||lab.official_weight_g!=null||lab.official_length_cm!=null;
 const officialReady=!!lab.official_birth_date&&!!lab.official_birth_time&&lab.official_weight_g!=null&&lab.official_length_cm!=null;
 const official=officialReady?{date:lab.official_birth_date,time:String(lab.official_birth_time).slice(0,5),weight:lab.official_weight_g,length:lab.official_length_cm}:null;
 const detail=async()=>{const {data:all,error}=await db.from("oliver_game_demo_guesses").select("id,participant_name,birth_date,birth_time,weight_g,length_cm,contact_whatsapp,created_at").order("created_at",{ascending:true});if(error)return reply({error:"lab_read_failed"},500);
 const scores=official?birthRank(all||[],official):[];return reply({ok:true,lab:true,guesses_open:lab.guesses_open,closed_at:lab.closed_at,official,official_started:started,results_published:lab.results_published,guesses:all||[],ranking:lab.results_published?scores:[],admin_ranking:scores,participant_count:(all||[]).length});};
 if(action==="adminDemoLabState")return await detail();
 if(action==="adminDemoLabSubmit"){
  if(!lab.guesses_open||started||lab.results_published)return reply({error:"game_closed"},409);
  const name=String(b.name||"").trim().replace(/\s+/g," "),phone=normalizePhone(b.whatsapp);
  if(name.length<3||norm(name).split(" ").length<2||name.length>100)return reply({error:"full_name_required"},400);
  if(!validPhone(phone))return reply({error:"invalid_whatsapp"},400);
  if(!iso(b.birth_date)||!validBirthTime(b.birth_time)||!finite(b.weight_g,100,7000)||!finite(b.length_cm,20,75))return reply({error:"invalid_birth_prediction"},400);
  const {data:existing}=await db.from("oliver_game_demo_guesses").select("participant_name,contact_whatsapp");
  if((existing||[]).some((r:any)=>norm(r.participant_name)===norm(name)&&(!r.contact_whatsapp||r.contact_whatsapp===phone)))return reply({error:"guess_already_registered"},409);
  const {data:created,error}=await db.from("oliver_game_demo_guesses").insert({participant_name:name,birth_date:b.birth_date,birth_time:b.birth_time,weight_g:Math.round(Number(b.weight_g)),length_cm:Number(b.length_cm),contact_whatsapp:phone}).select("id,participant_name,birth_date,birth_time,weight_g,length_cm,created_at").single();
  return error?reply({error:error.code==="23505"?"guess_already_registered":"save_failed"},error.code==="23505"?409:500):reply({ok:true,guess:created});
 }
 if(action==="adminDemoLabLookup"){
  const name=norm(b.name),phone=normalizePhone(b.whatsapp);
  if(!name||!validPhone(phone))return reply({error:"invalid_lookup"},400);
  const {data:entries,error}=await db.from("oliver_game_demo_guesses").select("id,participant_name,birth_date,birth_time,weight_g,length_cm,created_at").eq("contact_whatsapp",phone);
  if(error)return reply({error:"lookup_failed"},500);
  const guess=(entries||[]).find((r:any)=>norm(r.participant_name)===name);
  if(!guess)return reply({error:"guess_not_found"},404);
  if(!lab.results_published||!official)return reply({ok:true,guess,published:false});
  const {data:all}=await db.from("oliver_game_demo_guesses").select("id,participant_name,birth_date,birth_time,weight_g,length_cm,created_at");
  const ranking=birthRank(all||[],official);const index=ranking.findIndex((r:any)=>r.id===guess.id);return reply({ok:true,guess,published:true,position:index>=0?index+1:null,score:index>=0?ranking[index]:null,official});
 }
 if(action==="adminDemoLabToggle"){
  const open=b.open===true;if(open&&started)return reply({error:"official_data_already_registered"},409);
  if(open===lab.guesses_open)return reply({error:"already_in_state"},409);
  const {error}=await db.from("oliver_game_demo_state").update({guesses_open:open,closed_at:open?null:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",1);
  return error?reply({error:"save_failed"},500):reply({ok:true,guesses_open:open});
 }
 if(action==="adminDemoLabOfficial"){
  if(lab.guesses_open)return reply({error:"close_first"},409);
  if(lab.results_published)return reply({error:"results_already_published"},409);
  if(!iso(b.date)||!validBirthTime(b.time)||!finite(b.weight,100,7000)||!finite(b.length,20,75))return reply({error:"invalid_birth_prediction"},400);
  const {error}=await db.from("oliver_game_demo_state").update({official_birth_date:b.date,official_birth_time:b.time,official_weight_g:Number(b.weight),official_length_cm:Number(b.length),updated_at:new Date().toISOString()}).eq("id",1);
  return error?reply({error:"save_failed"},500):reply({ok:true});
 }
 if(action==="adminDemoLabPublish"){
  if(!officialReady)return reply({error:"official_missing"},409);
  const {error}=await db.from("oliver_game_demo_state").update({results_published:b.published===true,updated_at:new Date().toISOString()}).eq("id",1);return error?reply({error:"save_failed"},500):reply({ok:true});
 }
 if(action==="adminDemoLabReset"){
  if(String(b.confirmation)!=="REINICIAR TESTE")return reply({error:"confirmation_required"},400);
  const {error}=await db.from("oliver_game_demo_state").update({guesses_open:true,closed_at:null,official_birth_date:null,official_birth_time:null,official_weight_g:null,official_length_cm:null,results_published:false,updated_at:new Date().toISOString()}).eq("id",1);
  if(error)return reply({error:"save_failed"},500);
  if(b.clear_new_guesses===true){
   const preserved=new Set(["[TESTE] Ana Oliveira","[TESTE] Bruno Santos","[TESTE] Carla Almeida","[TESTE] Daniel Costa","[TESTE] Elisa Martins","[TESTE] Felipe Rocha"]);
   const {data:rows,error:listError}=await db.from("oliver_game_demo_guesses").select("id,participant_name");
   if(listError)return reply({error:"reset_guesses_failed"},500);
   const customIds=(rows||[]).filter((row:any)=>!preserved.has(row.participant_name)).map((row:any)=>row.id);
   if(customIds.length){const {error:removeError}=await db.from("oliver_game_demo_guesses").delete().in("id",customIds);if(removeError)return reply({error:"reset_guesses_failed"},500);}
  }
  return reply({ok:true});
 }
 return reply({error:"unknown_lab_action"},400);
}
if(action==="adminAuditList"||action==="adminAuditReview"){
 if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
 if(action==="adminAuditReview"){
  const id=String(b.guessId||""),status=String(b.status||"");
  const note=String(b.note||"").trim();
  if(!/^[0-9a-f-]{36}$/i.test(id)||!["pending","verified","attention"].includes(status)||note.length>500)return reply({error:"invalid_review"},400);
  const {data:exists}=await db.from("oliver_game_guesses").select("id").eq("id",id).maybeSingle();
  if(!exists)return reply({error:"guess_not_found"},404);
  const {error}=await db.from("oliver_game_audit_reviews").upsert({guess_id:id,review_status:status,review_note:note,reviewed_at:status==="pending"?null:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"guess_id"});
  return error?reply({error:"audit_save_failed"},500):reply({ok:true});
 }
 const {data:guesses,error}=await db.from("oliver_game_guesses").select("id,participant_name,contact_whatsapp,participation_source,guest_id,family_id,birth_date,birth_time,weight_g,length_cm,created_at").order("created_at",{ascending:true}).limit(2000);
 if(error)return reply({error:"audit_load_failed"},500);
 const {data:reviews,error:reviewError}=await db.from("oliver_game_audit_reviews").select("guess_id,review_status,review_note,reviewed_at").limit(2000);
 if(reviewError)return reply({error:"audit_load_failed"},500);
 const source=guesses||[],saved=new Map((reviews||[]).map((r:any)=>[r.guess_id,r]));
 const rows=source.map((g:any)=>{
  const phone=String(g.contact_whatsapp||"");
  const normalized=norm(g.participant_name);
  const exactNames=source.filter((x:any)=>x.id!==g.id&&norm(x.participant_name)===normalized);
  const samePhone=phone?source.filter((x:any)=>x.id!==g.id&&String(x.contact_whatsapp||"")===phone):[];
  const first=normalized.split(" ")[0];
  const firstNames=source.filter((x:any)=>x.id!==g.id&&norm(x.participant_name).split(" ")[0]===first&&norm(x.participant_name)!==normalized);
  const flags=[];
  if(exactNames.length)flags.push("same_name");
  if(samePhone.length)flags.push("shared_whatsapp");
  if(firstNames.length)flags.push("similar_name");
  if(g.birth_date&&!phone)flags.push("missing_whatsapp");
  if(g.birth_date&&!g.birth_time)flags.push("missing_birth_time");
  const review:any=saved.get(g.id)||{};
  return {id:g.id,name:g.participant_name,whatsapp:phone,source:g.participation_source,registeredAt:g.created_at,birth:!!g.birth_date,belly: g.birth_date==null,flags,relatedIds:[...new Set([...exactNames,...samePhone,...firstNames].map((x:any)=>x.id))],reviewStatus:review.review_status||"pending",reviewNote:review.review_note||"",reviewedAt:review.reviewed_at||null};
 });
 const totals={records:rows.length,flagged:rows.filter((r:any)=>r.flags.length).length,reviewed:rows.filter((r:any)=>r.reviewStatus!=="pending").length,missingContact:rows.filter((r:any)=>r.flags.includes("missing_whatsapp")).length};
 return reply({ok:true,rows,totals,notice:"Alerts are suggestions. No registration is automatically blocked or changed."});
}
if(action==="adminDemoBirthRanking"){
 if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
 const official={date:b.official_date||"2027-01-13",time:b.official_time||"10:34",weight:b.official_weight_g==null?3400:Number(b.official_weight_g),length:b.official_length_cm==null?50:Number(b.official_length_cm)};
 if(!iso(official.date)||!validBirthTime(official.time)||!finite(official.weight,100,7000)||!finite(official.length,20,75))return reply({error:"invalid_demo_values"},400);
 const {data:guesses,error}=await db.from("oliver_game_demo_guesses").select("id,participant_name,birth_date,birth_time,weight_g,length_cm,created_at").order("created_at");
 if(error)return reply({error:"demo_read_failed"},500);
 const ranking=birthRank(guesses||[],official);
 return reply({ready:true,demo:true,official,ranking,total:ranking.length});
}
if(action==="adminBirthRanking"||action==="publicBirthRanking"){
 const isAdmin=action==="adminBirthRanking";
 if(isAdmin&&!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
 const {data:announcement}=await db.from("oliver_birth_announcement").select("birth_time,published").eq("id",1).maybeSingle();
 if(!isAdmin&&!config.results_published)return reply({ready:false,ranking:[]});
 const official={date:config.actual_birth_date,time:announcement?.birth_time?.slice(0,5),weight:config.actual_weight_g,length:config.actual_length_cm};
 if(!official.date||!official.time||official.weight==null||official.length==null)return reply({ready:false,ranking:[]});
 const {data:guesses,error}=await db.from("oliver_game_guesses").select(isAdmin?"id,participant_name,participation_source,birth_date,birth_time,weight_g,length_cm,contact_whatsapp,prize_contact_status,prize_contacted_at,created_at":"id,participant_name,participation_source,birth_date,birth_time,weight_g,length_cm,created_at").not("birth_date","is",null);
 if(error)return reply({error:"ranking_failed"},500);
 const ranked=birthRank(guesses||[],official);
 const missingTime=(guesses||[]).filter((row:any)=>!row.birth_time).length;
 return reply({ready:true,official,ranking:isAdmin?ranked:ranked.slice(0,3).map((r:any)=>({name:r.name,registeredAt:r.registeredAt,total:r.total,dateTimePoints:r.dateTimePoints,weightPoints:r.weightPoints,lengthPoints:r.lengthPoints,differenceMinutes:r.differenceMinutes,differenceGrams:r.differenceGrams,differenceCm:r.differenceCm})),total:ranked.length,missingTime:isAdmin?missingTime:undefined,published:!!config.results_published});
}
if(action==="searchGuests"){const q=String(b.query||"").trim();if(q.length<2)return reply({items:[]});const {data,error}=await db.from("guests").select("id,family_id,name").ilike("name","%"+q.replace(/[%_]/g,"")+"%").limit(12);if(error)return reply({error:"search_failed"},500);const ids=[...new Set((data||[]).map((g:any)=>g.family_id))];const {data:fams}=await db.from("families").select("id,display_name").in("id",ids.length?ids:["00000000-0000-0000-0000-000000000000"]);return reply({items:(data||[]).map((g:any)=>({id:g.id,name:g.name,family:(fams||[]).find((f:any)=>f.id===g.family_id)?.display_name||"Família"}))})}
const bucket="oliver-birth";
const signedPhoto=async(path:any)=>{if(!path)return null;const {data,error}=await db.storage.from(bucket).createSignedUrl(String(path),3600);return error?null:data?.signedUrl||null};
if(action==="birthAnnouncement"){const {data:a}=await db.from("oliver_birth_announcement").select("published,message,birth_time,published_at,photo_path").eq("id",1).maybeSingle();if(!a?.published)return reply({published:false});const {data:o}=await db.from("oliver_game_settings").select("actual_birth_date,actual_weight_g,actual_length_cm").eq("id",1).single();return reply({published:true,message:a.message||"",birth_time:a.birth_time,birth_date:o?.actual_birth_date||null,weight_g:o?.actual_weight_g??null,length_cm:o?.actual_length_cm??null,photo_url:await signedPhoto(a.photo_path)});}
if(action==="adminBirthGet"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);const {data:a,error}=await db.from("oliver_birth_announcement").select("*").eq("id",1).single();return error?reply({error:"read_failed"},500):reply({announcement:{...a,photo_url:await signedPhoto(a.photo_path)}});}
if(action==="adminBirthTime"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);const time=b.birth_time==null||b.birth_time===""?null:String(b.birth_time);if(time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return reply({error:"invalid_time"},400);if(time&&!config.birth_closed_at){
 const now=new Date().toISOString();
 const {error:closeError}=await db.from("oliver_game_settings").update({birth_open:false,birth_closed_at:now,birth_closed_reason:"official",updated_at:now}).eq("id",1);
 if(closeError)return reply({error:"close_failed"},500);
 await db.from("oliver_game_access_history").insert({game:"birth",operation:"closed_official",details:{field_names:["birth_time"]}});
 }
 const {error}=await db.from("oliver_birth_announcement").update({birth_time:time,updated_at:new Date().toISOString()}).eq("id",1);return error?reply({error:"save_failed"},500):reply({ok:true});}
if(action==="adminBirthSave"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);const msg=String(b.message||"").trim();const time=b.birth_time==null||b.birth_time===""?null:String(b.birth_time);if(msg.length>500||time&&!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(time))return reply({error:"invalid_announcement"},400);const {error}=await db.from("oliver_birth_announcement").update({message:msg,updated_at:new Date().toISOString()}).eq("id",1);return error?reply({error:"save_failed"},500):reply({ok:true});}
if(action==="adminBirthUpload"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);const mime=String(b.mime||"");const ext:any={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};const raw=String(b.base64||"");if(!ext[mime]||raw.length>7000000||raw.length<100)return reply({error:"invalid_photo"},400);let bytes:Uint8Array;try{bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0))}catch{return reply({error:"invalid_photo"},400)}if(bytes.length>5242880)return reply({error:"photo_too_large"},400);const valid=mime==="image/jpeg"?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==="image/png"?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&String.fromCharCode(...bytes.slice(8,12))==="WEBP";if(!valid)return reply({error:"invalid_photo"},400);const {data:previous}=await db.from("oliver_birth_announcement").select("photo_path").eq("id",1).single();const path="photos/"+crypto.randomUUID()+"."+ext[mime];const {error:upError}=await db.storage.from(bucket).upload(path,bytes,{contentType:mime,upsert:false});if(upError)return reply({error:"upload_failed"},500);const {error:saveError}=await db.from("oliver_birth_announcement").update({photo_path:path,updated_at:new Date().toISOString()}).eq("id",1);if(saveError){await db.storage.from(bucket).remove([path]);return reply({error:"save_failed"},500)}if(previous?.photo_path)await db.storage.from(bucket).remove([previous.photo_path]);return reply({ok:true,photo_url:await signedPhoto(path)});}
if(action==="adminBirthRemovePhoto"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);const {data:a}=await db.from("oliver_birth_announcement").select("photo_path").eq("id",1).single();const {error}=await db.from("oliver_birth_announcement").update({photo_path:null,updated_at:new Date().toISOString()}).eq("id",1);if(error)return reply({error:"remove_failed"},500);if(a?.photo_path)await db.storage.from(bucket).remove([a.photo_path]);return reply({ok:true});}
if(action==="adminBirthResetAll"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);if(String(b.confirmation)!=="RESETAR ANUNCIO")return reply({error:"confirmation_required"},400);const {data:a}=await db.from("oliver_birth_announcement").select("photo_path").eq("id",1).single();const {error:e1}=await db.from("oliver_game_settings").update({actual_birth_date:null,actual_weight_g:null,actual_length_cm:null,results_published:false,birth_date_revealed:false,weight_revealed:false,length_revealed:false,jackpot_revealed:false,updated_at:new Date().toISOString()}).eq("id",1);if(e1)return reply({error:"reset_official_failed"},500);const {error:e2}=await db.from("oliver_birth_announcement").update({message:null,birth_time:null,photo_path:null,published:false,published_at:null,updated_at:new Date().toISOString()}).eq("id",1);if(e2)return reply({error:"reset_announcement_failed"},500);if(a?.photo_path)await db.storage.from(bucket).remove([a.photo_path]);return reply({ok:true});}
if(action==="adminBirthReset"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);if(String(b.confirmation)!=="RESETAR ANUNCIO")return reply({error:"confirmation_required"},400);const {data:a}=await db.from("oliver_birth_announcement").select("photo_path,published").eq("id",1).single();const {error}=await db.from("oliver_birth_announcement").update({message:null,birth_time:null,photo_path:null,published:false,published_at:null,updated_at:new Date().toISOString()}).eq("id",1);if(error)return reply({error:"reset_failed"},500);if(a?.photo_path)await db.storage.from(bucket).remove([a.photo_path]);return reply({ok:true});}
if(action==="adminBirthPublish"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);const publish=b.published===true;if(publish){const {data:o}=await db.from("oliver_game_settings").select("actual_birth_date,actual_weight_g,actual_length_cm").eq("id",1).single();if(!o?.actual_birth_date||o.actual_weight_g==null||o.actual_length_cm==null)return reply({error:"official_missing"},409)}const {error}=await db.from("oliver_birth_announcement").update({published:publish,published_at:publish?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",1);return error?reply({error:"publish_failed"},500):reply({ok:true});}
if(action==="stageAuth"){return await admin(b.adminCode)?reply({ok:true}):reply({error:"unauthorized"},401)}
if(action==="guessStatus"){const id=String(b.guestId||"");if(!/^[0-9a-f-]{36}$/i.test(id))return reply({belly:false,birth:false});const {data:g}=await db.from("oliver_game_guesses").select("belly_cm,birth_date").eq("participant_key","guest:"+id).maybeSingle();return reply({belly:g?.belly_cm!=null,birth:g?.birth_date!=null});}
if(action==="lookupPublicGuesses"){const id=String(b.guestId||"");if(!/^[0-9a-f-]{36}$/i.test(id))return reply({error:"invalid_lookup"},400);const {data:g}=await db.from("guests").select("id,name,family_id").eq("id",id).maybeSingle();if(!g)return reply({error:"invalid_lookup"},404);const {data:guess,error}=await db.from("oliver_game_guesses").select("participant_name,belly_cm,birth_date,weight_g,length_cm").eq("participant_key","guest:"+g.id).maybeSingle();if(error)return reply({error:"lookup_failed"},500);const {data:fam}=await db.from("families").select("display_name").eq("id",g.family_id).maybeSingle();return reply({ok:true,guess:guess||null,participant:g.name,family:fam?.display_name||"Núcleo familiar"});}
if(action==="lookupMyGuesses"){const guestId=String(b.guestId||""),pin=String(b.pin||"");if(!guestId||!/^\d{4}$/.test(pin))return reply({error:"invalid_lookup"},400);const {data:guest}=await db.from("guests").select("id,name,family_id").eq("id",guestId).maybeSingle();if(!guest)return reply({error:"invalid_lookup"},400);const {data:unlocked,error:pinError}=await db.rpc("unlock_invite_family",{p_family_id:guest.family_id,p_pin:pin});if(pinError||!unlocked?.length)return reply({error:"invalid_pin"},401);const {data:guess}=await db.from("oliver_game_guesses").select("participant_name,belly_cm,birth_date,weight_g,length_cm,guest_id").eq("participant_key","guest:"+guest.id).maybeSingle();const {data:family}=await db.from("families").select("display_name").eq("id",guest.family_id).maybeSingle();return reply({ok:true,guess:guess||null,participant:guest.name,family:family?.display_name||"Núcleo familiar"});}
if(action==="submitCombined"){const name=String(b.name||"").trim().replace(/\s+/g," ");let key=norm(name),guestId=null,familyId=null;const selected=String(b.guestId||"");if(selected){const {data:g}=await db.from("guests").select("id,family_id,name").eq("id",selected).maybeSingle();if(!g)return reply({error:"guest_not_found"},400);guestId=g.id;familyId=g.family_id;key="guest:"+g.id;}else{if(name.length<3||name.length>100||key.split(" ").length<2)return reply({error:"full_name_required"},400);key="visitor:"+key;}const {data:existing}=await db.from("oliver_game_guesses").select("*").eq("participant_key",key).maybeSingle();const doBelly=config.belly_open&&!config.belly_revealed&&existing?.belly_cm==null&&b.belly_cm!==null&&b.belly_cm!==undefined&&b.belly_cm!=="",doBirth=config.birth_open&&!config.birth_closed_at&&config.actual_birth_date==null&&config.actual_weight_g==null&&config.actual_length_cm==null&&!config.results_published&&!config.birth_date_revealed&&!config.weight_revealed&&!config.length_revealed&&!config.jackpot_revealed&&existing?.birth_date==null&&!!b.birth_date;const skipped={belly:existing?.belly_cm!=null&&b.belly_cm!==null&&b.belly_cm!==undefined&&b.belly_cm!==""&&Number(b.belly_cm)>0,birth:existing?.birth_date!=null&&!!b.birth_date};if(!doBelly&&!doBirth){if(existing&&(skipped.belly||skipped.birth))return reply({ok:true,guess:existing,recorded:{belly:false,birth:false},skipped,unchanged:true});return reply({error:"no_guess_selected"},400);}if(doBelly&&!finite(b.belly_cm,40,250))return reply({error:"invalid_or_closed_belly"},400);if(doBirth&&!validPhone(b.whatsapp))return reply({error:"invalid_whatsapp"},400);if(doBirth&&!validBirthTime(b.birth_time))return reply({error:"invalid_or_closed_birth"},400);if(doBirth&&(!iso(b.birth_date)||!finite(b.weight_g,100,7000)||!finite(b.length_cm,20,75)))return reply({error:"invalid_or_closed_birth"},400);const {data,error}=await db.rpc("register_oliver_game_guesses",{p_key:key,p_name:name,p_guest_id:guestId,p_family_id:familyId,p_belly:doBelly?n(b.belly_cm):null,p_birth_date:doBirth?b.birth_date:null,p_weight:doBirth?Math.round(n(b.weight_g)):null,p_length:doBirth?n(b.length_cm):null,p_do_belly:doBelly,p_do_birth:doBirth});if(error)return reply({error:String(error.message||"").includes("guess_already_registered")?"guess_already_registered":"save_failed"},String(error.message||"").includes("guess_already_registered")?409:500);let stored=data;if(doBirth&&validBirthTime(b.birth_time)&&data?.id){const {data:timed,error:timeError}=await db.from("oliver_game_guesses").update({birth_time:b.birth_time,updated_at:new Date().toISOString()}).eq("id",data.id).is("birth_time",null).select("*").maybeSingle();if(timeError)return reply({error:"time_save_failed"},500);if(timed)stored=timed;}return reply({ok:true,guess:stored,recorded:{belly:doBelly,birth:doBirth},skipped});}
if(action==="submit"){const name=String(b.name||"").trim().replace(/\s+/g," ");let key=norm(name);const guestId=String(b.guestId||"");let familyId=null;if(guestId){const {data:g}=await db.from("guests").select("id,family_id").eq("id",guestId).maybeSingle();if(!g)return reply({error:"guest_not_found"},400);familyId=g.family_id;key="guest:"+guestId}else{if(name.length<3||name.length>100||key.split(" ").length<2)return reply({error:"full_name_required"},400);key="visitor:"+key;}
const kind=b.kind;if(!["belly","birth"].includes(kind))return reply({error:"invalid_game"},400);if(!config[kind+"_open"]||(kind==="birth"&&(config.birth_closed_at||config.actual_birth_date!=null||config.actual_weight_g!=null||config.actual_length_cm!=null||config.results_published)))return reply({error:"game_closed"},409);
const {data:old}=await db.from("oliver_game_guesses").select("*").eq("participant_key",key).maybeSingle();
if(kind==="belly" && (config.belly_revealed || !finite(b.belly_cm,40,250)))return reply({error:"invalid_or_closed_belly"},409);
if(kind==="birth" && (config.birth_date_revealed||config.weight_revealed||config.length_revealed||config.jackpot_revealed || !iso(b.birth_date)||!finite(b.weight_g,100,7000)||!finite(b.length_cm,20,75)))return reply({error:"invalid_or_closed_birth"},409);
const fields=kind==="belly"?{belly_cm:n(b.belly_cm)}:{birth_date:b.birth_date,weight_g:Math.round(n(b.weight_g)),length_cm:n(b.length_cm)};
if(old && (kind==="belly"?old.belly_cm!=null:old.birth_date!=null))return reply({error:"guess_already_registered"},409);const result=old?await db.from("oliver_game_guesses").update({...fields,updated_at:new Date().toISOString()}).eq("id",old.id).is(kind==="belly"?"belly_cm":"birth_date",null).select("id,participant_name,belly_cm,birth_date,weight_g,length_cm,guest_id,family_id,outside_guest_list"):await db.from("oliver_game_guesses").insert({participant_key:key,participant_name:name,guest_id:guestId||null,family_id:familyId,outside_guest_list:!guestId,...fields}).select("id,participant_name,belly_cm,birth_date,weight_g,length_cm,guest_id,family_id,outside_guest_list");const {error}=result;if(error)return reply({error:error.code==="23505"?"guess_already_registered":"save_failed"},error.code==="23505"?409:500);if(!result.data?.length)return reply({error:"guess_already_registered"},409);return reply({ok:true,guess:result.data[0]});}
if(action==="summary"||action==="adminGet"){if(action==="adminGet"&&!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
const {data:rows,error}=await db.from("oliver_game_guesses").select("*");if(error)return reply({error:"summary_failed"},500);
const list=rows||[], belly=aggregate(list,"belly_cm"),birth=aggregate(list,"birth_date"),weight=aggregate(list,"weight_g"),length=aggregate(list,"length_cm");
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const data:any={settings:{belly_open:config.belly_open,birth_open:config.birth_open,belly_revealed:config.belly_revealed,birth_date_revealed:config.birth_date_revealed,weight_revealed:config.weight_revealed,length_revealed:config.length_revealed,jackpot_revealed:config.jackpot_revealed,birth_registered:!!config.actual_birth_date,results_published:!!config.results_published,birth_closed_at:config.birth_closed_at||null,birth_closed_reason:config.birth_closed_reason||null},summary:{belly,birth,weight,length,today,eliminated:birth.distribution.filter((x:any)=>x.value<today).reduce((a:number,x:any)=>a+Number(x.count),0)}};
const results:any={};
if(config.belly_revealed)results.belly={actual:config.belly_cm,ranking:ranking(list,"belly_cm",config.belly_cm)};
if((action==="adminGet"||config.results_published)&&config.birth_date_revealed)results.birth={actual:config.actual_birth_date,ranking:ranking(list,"birth_date",config.actual_birth_date,true)};
if((action==="adminGet"||config.results_published)&&config.weight_revealed)results.weight={actual:config.actual_weight_g,ranking:ranking(list,"weight_g",config.actual_weight_g)};
if((action==="adminGet"||config.results_published)&&config.length_revealed)results.length={actual:config.actual_length_cm,ranking:ranking(list,"length_cm",config.actual_length_cm)};
if((action==="adminGet"||config.results_published)&&config.jackpot_revealed)results.jackpot={winners:list.filter(r=>r.birth_date===config.actual_birth_date&&Number(r.weight_g)===config.actual_weight_g&&Number(r.length_cm)===Number(config.actual_length_cm)).map(r=>r.participant_name)};
if((action==="adminGet"||config.results_published)&&config.birth_date_revealed&&config.weight_revealed&&config.length_revealed){const {data:a}=await db.from("oliver_birth_announcement").select("birth_time").eq("id",1).maybeSingle();data.birth_time=a?.birth_time||null;}
data.results=results;
if(action==="adminGet"){data.settings={...config};data.guesses=list.sort((a:any,b:any)=>a.participant_name.localeCompare(b.participant_name));const {data:accessHistory}=await db.from("oliver_game_access_history").select("operation,action_at,actor_label").eq("game","birth").order("action_at",{ascending:false}).limit(10);data.birth_access_history=accessHistory||[]}return reply(data);}
if(action==="adminResetOfficial"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);if(b.confirmation!=="LIMPAR BARRIGA")return reply({error:"confirmation_required"},400);const {error}=await db.from("oliver_game_settings").update({belly_cm:null,belly_revealed:false,updated_at:new Date().toISOString()}).eq("id",1);return error?reply({error:"reset_official_failed"},500):reply({ok:true});}
if(action==="adminResetGuesses"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);if(b.confirmation!=="ZERAR PALPITES")return reply({error:"confirmation_required"},400);const {count,error}=await db.from("oliver_game_guesses").delete({count:"exact"}).not("id","is",null);if(error)return reply({error:"reset_failed"},500);const {error:settingsError}=await db.from("oliver_game_settings").update({belly_revealed:false,birth_date_revealed:false,weight_revealed:false,length_revealed:false,jackpot_revealed:false,updated_at:new Date().toISOString()}).eq("id",1);if(settingsError)return reply({error:"reset_reveal_failed",deleted:count||0},500);return reply({ok:true,deleted:count||0});}
if(["adminSet","adminReveal"].includes(action)){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
if(action==="adminSet"){const fields:any={};if(Object.hasOwn(b,"birth_open"))return reply({error:"use_birth_control"},400);if(typeof b.belly_open==="boolean"){if(b.belly_open&&config.belly_cm!=null)return reply({error:"belly_measure_locked"},409);fields.belly_open=b.belly_open;}
for(const [key,min,max] of [["belly_cm",40,250],["actual_weight_g",100,7000],["actual_length_cm",20,75]] as const)if(Object.hasOwn(b,key)){if(!finite(b[key],min,max))return reply({error:"invalid_"+key},400);fields[key]=n(b[key]);}
if(Object.hasOwn(b,"actual_birth_date")){if(!iso(b.actual_birth_date))return reply({error:"invalid_date"},400);fields.actual_birth_date=b.actual_birth_date;}
const merged={...config,...fields};if(Object.hasOwn(fields,"belly_cm")){if(config.belly_revealed)return reply({error:"belly_results_locked"},409);fields.belly_revealed=false;fields.belly_open=false}
const started=["actual_birth_date","actual_weight_g","actual_length_cm"].some(k=>Object.hasOwn(fields,k));
if(started&&!config.birth_closed_at){
 const {data:announcement}=await db.from("oliver_birth_announcement").select("birth_time").eq("id",1).maybeSingle();
 fields.birth_open=false;fields.birth_closed_at=new Date().toISOString();fields.birth_closed_reason="official";
 await db.from("oliver_game_access_history").insert({game:"birth",operation:"closed_official",details:{field_names:Object.keys(fields).filter(x=>x.startsWith("actual_"))}});
}

const birthReady=merged.actual_birth_date!=null&&merged.actual_weight_g!=null&&merged.actual_length_cm!=null;
if(birthReady&&started){fields.birth_open=false}
const {error}=await db.from("oliver_game_settings").update({...fields,updated_at:new Date().toISOString()}).eq("id",1);return error?reply({error:"update_failed"},500):reply({ok:true,auto_revealed:{belly:!!fields.belly_revealed,birth:!!fields.birth_date_revealed}});}
const category=String(b.category),mapping:any={belly:["belly_cm","belly_revealed"],birth:["actual_birth_date","birth_date_revealed"],weight:["actual_weight_g","weight_revealed"],length:["actual_length_cm","length_revealed"],jackpot:["actual_birth_date","jackpot_revealed"]};const target=mapping[category];if(!target)return reply({error:"invalid_category"},400);if(config[target[0]]==null||(category==="jackpot"&&(config.actual_weight_g==null||config.actual_length_cm==null)))return reply({error:"actual_missing"},409);
const updates:any={[target[1]]:true,updated_at:new Date().toISOString()};if(category==="belly")updates.belly_open=false;if(["birth","weight","length","jackpot"].includes(category))updates.birth_open=false;const {error}=await db.from("oliver_game_settings").update(updates).eq("id",1);return error?reply({error:"reveal_failed"},500):reply({ok:true});}
return reply({error:"unknown_action"},400);
}catch(e){return reply({error:"server_error"},500)}
});