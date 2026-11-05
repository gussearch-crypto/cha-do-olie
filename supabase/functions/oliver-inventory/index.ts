import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {createClient} from 'jsr:@supabase/supabase-js@2';

// Admin code hash is identical to the existing planning-api authorization.
// Never store a plaintext admin code in the source or browser bundle.
const ADMIN_HASH='be8f2e0e71d2ed6fe381fda864a08fa0f10601188c492a1fc7659d8e114c1fec';
const DEFAULT_ORIGIN='https://cha-oliver-mvp.vercel.app';
const allowedOrigin=()=>{
 const value=Deno.env.get('OLIVER_INVENTORY_ALLOWED_ORIGIN')||DEFAULT_ORIGIN;
 try{const url=new URL(value);return url.protocol==='https:'&&url.origin===value?value:DEFAULT_ORIGIN}
 catch{return DEFAULT_ORIGIN}
};
const cors=origin=>({
 'Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Headers':'content-type',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Max-Age':'300',
 'Vary':'Origin',
 'Cache-Control':'no-store'
});
const json=(data,status,origin)=>new Response(JSON.stringify(data),{
 status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8'}
});
const hash=async value=>{
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(value||'')));
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{6,100}$/.test(id);
const text=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
const round=v=>Math.round(v*100)/100;
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function normalize(items){
 if(!Array.isArray(items)||items.length>1000)throw Error('invalid_items');
 const seen=new Set();
 return items.map(v=>{
  if(!v||typeof v!=='object'||Array.isArray(v)||!validId(v.id)||seen.has(v.id))throw Error('invalid_id');
  seen.add(v.id);
  if(!['fralda','presente'].includes(v.type))throw Error('invalid_type');
  if(typeof v.description!=='string'||!v.description.trim()||v.description.length>120)throw Error('invalid_description');
  if(!integer(v.quantity,1,100000))throw Error('invalid_quantity');
  const isDiaper=v.type==='fralda';
  if(isDiaper&&!['RN','P','M','G','GG','XG'].includes(v.size))throw Error('invalid_size');
  if(isDiaper&&v.unitsPerPackage!==null&&v.unitsPerPackage!==undefined&&!integer(v.unitsPerPackage,1,1000))throw Error('invalid_units_per_package');
  if(typeof v.unitValue!=='number'||!Number.isFinite(v.unitValue)||v.unitValue<0||v.unitValue>1000000)throw Error('invalid_value');
  if(typeof v.brand!=='string'||v.brand.length>80||typeof v.notes!=='string'||v.notes.length>240)throw Error('invalid_notes');
  return {id:v.id,type:v.type,size:isDiaper?v.size:'',brand:text(v.brand,80),description:text(v.description,120),
   quantity:v.quantity,unitsPerPackage:isDiaper?(v.unitsPerPackage??null):null,unitValue:round(v.unitValue),notes:text(v.notes,240)};
 });
}
function buildHistory(before,after){
 const changes=[],old=new Map(before.map(item=>[item.id,item]));
 const next=new Map(after.map(item=>[item.id,item]));
 for(const id of new Set([...old.keys(),...next.keys()])){
  const a=old.get(id),b=next.get(id);
  if(JSON.stringify(a)===JSON.stringify(b))continue;
  changes.push({itemId:id,kind:!a?'added':!b?'deleted':'updated',title:(b||a).description.slice(0,120)});
 }
 return changes;
}

Deno.serve(async request=>{
 const origin=allowedOrigin();
 const from=request.headers.get('origin');
 if(from&&from!==origin)return json({error:'origin_not_allowed'},403,origin);
 if(request.method==='OPTIONS')return new Response('',{status:204,headers:cors(origin)});
 if(request.method!=='POST')return json({error:'method_not_allowed'},405,origin);
 let body:any;
 try {
  const raw=await request.text();
  if(raw.length>250000)return json({error:'payload_too_large'},413,origin);
  body=JSON.parse(raw);
 } catch {return json({error:'invalid_json'},400,origin)}
 if(!body||typeof body!=='object'||!['get','save'].includes(body.action))return json({error:'unknown_action'},400,origin);
 if(typeof body.adminCode!=='string'||body.adminCode.length>128||(await hash(body.adminCode))!==ADMIN_HASH)return json({error:'unauthorized'},403,origin);
 const supabaseUrl=Deno.env.get('SUPABASE_URL');
 const adminKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!supabaseUrl||!adminKey)return json({error:'not_configured'},503,origin);
 const db=createClient(supabaseUrl,adminKey,{auth:{persistSession:false}});
 const {data:current,error:loadError}=await db.from('oliver_inventory_state')
  .select('data,revision,updated_at').eq('id','main').maybeSingle();
 if(loadError)return json({error:'storage_unavailable'},503,origin);
 if(!current)return json({error:'migration_required'},503,origin);
 const revision=Number(current.revision||0);
 if(body.action==='get')return json({revision,items:current.data?.items||[],
  history:(current.data?.history||[]).slice(0,40),updatedAt:current.updated_at},200,origin);
 if(!integer(body.expectedRevision,0,Number.MAX_SAFE_INTEGER))return json({error:'expected_revision_required'},400,origin);
 if(body.expectedRevision!==revision)return json({error:'conflict',revision},409,origin);
 let items:any[];
 try{items=normalize(body.items)}catch(e){return json({error:String(e.message||'invalid_items')},400,origin)}
 let previous:any[];
 try{previous=normalize(current.data?.items||[])}catch{return json({error:'stored_data_invalid'},503,origin)}
 const change=buildHistory(previous,items);
 if(change.length===0)return json({revision,unchanged:true,items},200,origin);
 const history=[{at:new Date().toISOString(),changes:change},...(current.data?.history||[])].slice(0,150);
 const {data:updated,error:saveError}=await db.from('oliver_inventory_state')
  .update({data:{items,history},revision:revision+1,updated_at:new Date().toISOString()})
  .eq('id','main').eq('revision',revision).select('revision,updated_at').maybeSingle();
 if(saveError)return json({error:'storage_unavailable'},503,origin);
 if(!updated)return json({error:'conflict',revision},409,origin);
 return json({ok:true,revision:updated.revision,updatedAt:updated.updated_at,items,changed:change.length},200,origin);
});
