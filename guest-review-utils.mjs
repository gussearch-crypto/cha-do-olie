export const RSVP_DEADLINE='2026-11-30';
export const RSVP_DEADLINE_LABEL='30/11/2026';
export function deadlineState(now=new Date()){
  const values=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));
  const date=`${values.year}-${values.month}-${values.day}`;
  const days=Math.round((Date.parse(RSVP_DEADLINE)-Date.parse(date))/86400000);
  return {days,expired:days<0,label:days<0?'Prazo de confirmação encerrado':days===0?'Último dia para confirmar':`Confirmações até ${RSVP_DEADLINE_LABEL} · faltam ${days} dia(s)`};
}
const normalized=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().replace(/\s+/g,' ').toLowerCase();
export function reviewFamilies(families){
  const names=new Map();
  for(const f of families)for(const g of f.guests||[]){const name=normalized(g.name);if(name.split(' ').length<2)continue;const entries=names.get(name)||[];entries.push({familyId:f.id,name:g.name});names.set(name,entries)}
  return families.map(f=>{
    const guests=f.guests||[],pending=guests.filter(g=>!['yes','no'].includes(g.attendance));
    const incomplete=[];
    if(!String(f.display_name||'').trim())incomplete.push('Nome do núcleo não informado');
    if(!guests.length)incomplete.push('Núcleo sem integrantes');
    for(const g of guests){if(!String(g.name||'').trim())incomplete.push('Integrante sem nome');if(g.attendance==='yes'&&g.person_type==='child'&&!['under_5','five_or_more'].includes(g.child_age_group))incomplete.push(`${g.name||'Criança'}: faixa etária não informada`)}
    const duplicates=[...new Set(guests.filter(g=>{const n=normalized(g.name);return (names.get(n)||[]).length>1}).map(g=>g.name))];
    return {family:f,pending,incomplete,duplicates};
  }).filter(r=>r.pending.length||r.incomplete.length||r.duplicates.length);
}
