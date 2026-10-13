import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "jsr:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(d:any,status=200)=>new Response(JSON.stringify(d),{status,headers:{...cors,"Content-Type":"application/json"}});
const HASH="be8f2e0e71d2ed6fe381fda864a08fa0f10601188c492a1fc7659d8e114c1fec";
async function admin(value:any){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value||"")));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")===HASH}
const norm=(s:any)=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().replace(/\s+/g," ").toLowerCase();
const n=(v:any)=>Number(v);
const finite=(v:any,min:number,max:number)=>Number.isFinite(n(v))&&n(v)>=min&&n(v)<=max;
const iso=(v:any)=>typeof v==="string"&&/^20\d{2}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+"T12:00:00Z"));
function aggregate(rows:any[],key:string){const vals=rows.map(r=>r[key]).filter((v:any)=>v!==null && v!==undefined);const distribution=Object.entries(vals.reduce((a:any,v:any)=>(a[String(v)]=(a[String(v)]||0)+1,a),{})).map(([value,count])=>({value,count})).sort((a:any,b:any)=>String(a.value).localeCompare(String(b.value),"pt-BR",{numeric:true}));return {count:vals.length,average:key==="birth_date"?null:vals.length?Math.round(vals.reduce((a:number,b:any)=>a+Number(b),0)/vals.length*10)/10:null,distribution};}
function ranking(rows:any[],key:string,actual:any,isDate=false){if(actual===null||actual===undefined)return [];return rows.filter(r=>r[key]!==null).map(r=>({name:r.participant_name,guess:r[key],difference:isDate?Math.abs((Date.parse(r[key]+"T12:00:00Z")-Date.parse(actual+"T12:00:00Z"))/86400000):Math.abs(Number(r[key])-Number(actual))})).sort((a,b)=>a.difference-b.difference||a.name.localeCompare(b.name));}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
try {const b=await req.json(),db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const action=String(b.action||"");
const {data:config,error:ce}=await db.from("oliver_game_settings").select("*").eq("id",1).single();if(ce)return reply({error:"settings_unavailable"},500);
if(action==="submit"){const name=String(b.name||"").trim().replace(/\s+/g," ");const key=norm(name);if(name.length<3||name.length>100||key.split(" ").length<2)return reply({error:"full_name_required"},400);
const kind=b.kind;if(!["belly","birth"].includes(kind))return reply({error:"invalid_game"},400);if(!config[kind+"_open"])return reply({error:"game_closed"},409);
const {data:old}=await db.from("oliver_game_guesses").select("*").eq("participant_key",key).maybeSingle();
if(kind==="belly" && (config.belly_revealed || !finite(b.belly_cm,40,250)))return reply({error:"invalid_or_closed_belly"},409);
if(kind==="birth" && (config.birth_date_revealed||config.weight_revealed||config.length_revealed||config.jackpot_revealed || !iso(b.birth_date)||!finite(b.weight_g,100,7000)||!finite(b.length_cm,20,75)))return reply({error:"invalid_or_closed_birth"},409);
const fields=kind==="belly"?{belly_cm:n(b.belly_cm)}:{birth_date:b.birth_date,weight_g:Math.round(n(b.weight_g)),length_cm:n(b.length_cm)};
const {error}=await db.from("oliver_game_guesses").upsert({...(old||{}),participant_key:key,participant_name:name,...fields,updated_at:new Date().toISOString()},{onConflict:"participant_key"});return error?reply({error:"save_failed"},500):reply({ok:true});}
if(action==="summary"||action==="adminGet"){if(action==="adminGet"&&!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
const {data:rows,error}=await db.from("oliver_game_guesses").select("*");if(error)return reply({error:"summary_failed"},500);
const list=rows||[], belly=aggregate(list,"belly_cm"),birth=aggregate(list,"birth_date"),weight=aggregate(list,"weight_g"),length=aggregate(list,"length_cm");
const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const data:any={settings:{belly_open:config.belly_open,birth_open:config.birth_open,belly_revealed:config.belly_revealed,birth_date_revealed:config.birth_date_revealed,weight_revealed:config.weight_revealed,length_revealed:config.length_revealed,jackpot_revealed:config.jackpot_revealed,birth_registered:!!config.actual_birth_date},summary:{belly,birth,weight,length,today,eliminated:birth.distribution.filter((x:any)=>x.value<today).reduce((a:number,x:any)=>a+Number(x.count),0)}};
const results:any={};
if(config.belly_revealed)results.belly={actual:config.belly_cm,ranking:ranking(list,"belly_cm",config.belly_cm)};
if(config.birth_date_revealed)results.birth={actual:config.actual_birth_date,ranking:ranking(list,"birth_date",config.actual_birth_date,true)};
if(config.weight_revealed)results.weight={actual:config.actual_weight_g,ranking:ranking(list,"weight_g",config.actual_weight_g)};
if(config.length_revealed)results.length={actual:config.actual_length_cm,ranking:ranking(list,"length_cm",config.actual_length_cm)};
if(config.jackpot_revealed)results.jackpot={winners:list.filter(r=>r.birth_date===config.actual_birth_date&&Number(r.weight_g)===config.actual_weight_g&&Number(r.length_cm)===Number(config.actual_length_cm)).map(r=>r.participant_name)};
data.results=results;
if(action==="adminGet"){data.settings={...config};data.guesses=list.sort((a:any,b:any)=>a.participant_name.localeCompare(b.participant_name))}return reply(data);}
if(action==="adminResetGuesses"){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);if(b.confirmation!=="ZERAR PALPITES")return reply({error:"confirmation_required"},400);const {count,error}=await db.from("oliver_game_guesses").delete({count:"exact"}).not("id","is",null);if(error)return reply({error:"reset_failed"},500);return reply({ok:true,deleted:count||0});}
if(["adminSet","adminReveal"].includes(action)){if(!(await admin(b.adminCode)))return reply({error:"unauthorized"},401);
if(action==="adminSet"){const fields:any={};for(const key of ["belly_open","birth_open"])if(typeof b[key]==="boolean")fields[key]=b[key];
for(const [key,min,max] of [["belly_cm",40,250],["actual_weight_g",100,7000],["actual_length_cm",20,75]] as const)if(Object.hasOwn(b,key)){if(!finite(b[key],min,max))return reply({error:"invalid_"+key},400);fields[key]=n(b[key]);}
if(Object.hasOwn(b,"actual_birth_date")){if(!iso(b.actual_birth_date))return reply({error:"invalid_date"},400);fields.actual_birth_date=b.actual_birth_date;}
const {error}=await db.from("oliver_game_settings").update({...fields,updated_at:new Date().toISOString()}).eq("id",1);return error?reply({error:"update_failed"},500):reply({ok:true});}
const category=String(b.category),mapping:any={belly:["belly_cm","belly_revealed"],birth:["actual_birth_date","birth_date_revealed"],weight:["actual_weight_g","weight_revealed"],length:["actual_length_cm","length_revealed"],jackpot:["actual_birth_date","jackpot_revealed"]};const target=mapping[category];if(!target)return reply({error:"invalid_category"},400);if(config[target[0]]==null||(category==="jackpot"&&(config.actual_weight_g==null||config.actual_length_cm==null)))return reply({error:"actual_missing"},409);
const updates:any={[target[1]]:true,updated_at:new Date().toISOString()};if(category==="belly")updates.belly_open=false;if(["birth","weight","length","jackpot"].includes(category))updates.birth_open=false;const {error}=await db.from("oliver_game_settings").update(updates).eq("id",1);return error?reply({error:"reveal_failed"},500):reply({ok:true});}
return reply({error:"unknown_action"},400);
}catch(e){return reply({error:"server_error"},500)}
});