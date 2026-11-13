export const normalizedGuestText=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function guestFamilyStatus(f={}){
 const people=Array.isArray(f.guests)?f.guests:[];
 const yes=people.filter(g=>g.attendance==='yes').length,no=people.filter(g=>g.attendance==='no').length;
 return !people.length?'pending':yes===people.length?'confirmed':no===people.length?'declined':yes||no?'partial':'pending';
}
export function guestFilterCounts(families=[]){
 const counts={all:families.length,confirmed:0,pending:0,partial:0,declined:0};
 for(const f of families)counts[guestFamilyStatus(f)]++;
 return counts;
}
export function guestGroups(families=[]){
 return [...new Set(families.map(f=>String(f.group_name||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}
export function filterGuestFamilies(families=[],{search='',status='all',sent='all',group='all',person='all',sort='number'}={}){
 const q=normalizedGuestText(search).replace(/^#/,'');
 const original=new Map(families.map((f,i)=>[f,i]));
 const list=families.filter(f=>{
  const people=f.guests||[];
  if(status!=='all'&&guestFamilyStatus(f)!==status)return false;
  if(sent==='sent'&&!f.invite_sent||sent==='not_sent'&&f.invite_sent)return false;
  if(group!=='all'&&f.group_name!==group)return false;
  if(person!=='all'&&!people.some(g=>person==='adult'?g.person_type!=='child':g.person_type==='child'&&g.child_age_group===person))return false;
  return !q||[String(f.number??f.family_number??''),f.display_name,f.group_name,...people.map(g=>g.name)].some(v=>normalizedGuestText(v).includes(q));
 });
 const urgency={pending:0,partial:1,confirmed:2,declined:3};
 return list.sort((a,b)=>{
  if(sort==='attention')return urgency[guestFamilyStatus(a)]-urgency[guestFamilyStatus(b)]||original.get(a)-original.get(b);
  if(sort==='name')return String(a.display_name||'').localeCompare(String(b.display_name||''),'pt-BR')||original.get(a)-original.get(b);
  const an=Number(a.number??a.family_number),bn=Number(b.number??b.family_number);
  return Number.isFinite(an)&&Number.isFinite(bn)?an-bn||original.get(a)-original.get(b):original.get(a)-original.get(b);
 });
}


/**
 * Resumo consolidado para a aba Convidados.
 * Não conta crianças abaixo de 5 anos nas vagas; inclui pendências de idade
 * separadamente para evitar apresentar a ocupação como definitiva.
 * Núcleos marcados como teste são excluídos do planejamento.
 */
export function guestOverview(families=[],capacity=100){
 const valid=families.filter(f=>f.is_test!==true&&normalizedGuestText(f.group_name)!=='teste');
 const people=valid.flatMap(f=>Array.isArray(f.guests)?f.guests:[]);
 const confirmed=people.filter(g=>g.attendance==='yes');
 const pending=people.filter(g=>!['yes','no'].includes(g.attendance));
 const declined=people.filter(g=>g.attendance==='no');
 const child=g=>g.person_type==='child';
 const underFive=g=>child(g)&&g.child_age_group==='under_5';
 const olderChildren=people.filter(g=>child(g)&&g.child_age_group==='five_or_more');
 const underFiveAll=people.filter(underFive);
 const unknownChildAge=confirmed.filter(g=>child(g)&&!['under_5','five_or_more'].includes(g.child_age_group)).length;
 const counted=confirmed.filter(g=>!underFive(g)).length;
 const state={confirmed:0,pending:0,partial:0,declined:0};
 valid.forEach(f=>state[guestFamilyStatus(f)]++);
 return {
  capacity,available:Math.max(0,capacity-counted),overCapacity:Math.max(0,counted-capacity),
  counted,confirmed:confirmed.length,pending:pending.length,declined:declined.length,
  families:valid.length,people:people.length,
  adults:people.filter(g=>!child(g)).length,olderChildren:olderChildren.length,
  underFive:underFiveAll.length,confirmedUnderFive:confirmed.filter(underFive).length,
  unknownChildAge,states:state
 };
}
