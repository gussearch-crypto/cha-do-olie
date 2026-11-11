// Regras puras do painel de presença. Não acessa banco, não altera dados.
// Usadas pela Edge Function e por testes automatizados antes da publicação.
export function countsAsGuest(guest){
  return guest?.attendance === 'yes'
    && !(guest?.person_type === 'child' && guest?.child_age_group === 'under_5');
}
export function isRealFamily(family){
  return !family?.is_test && String(family?.group_name || '').trim().toLowerCase() !== 'teste';
}
export function projectedFamilyCapacity({before=[],after=[],all=[],oldFamily={},newFamily={},capacity=100}){
  if(!Number.isSafeInteger(capacity)||capacity<=0)throw Error('invalid_capacity');
  const currentGlobal=all.filter(g=>isRealFamily(g.families)&&countsAsGuest(g)).length;
  const oldFamilyCount=isRealFamily(oldFamily)?before.filter(countsAsGuest).length:0;
  const newFamilyCount=isRealFamily(newFamily)?after.filter(countsAsGuest).length:0;
  const projectedGlobal=currentGlobal-oldFamilyCount+newFamilyCount;
  return {
    currentGlobal,projectedGlobal,available:Math.max(0,capacity-currentGlobal),
    allowed:projectedGlobal<=capacity || projectedGlobal<=currentGlobal
  };
}
export function familyAttendanceStatus(guests){
  if(!Array.isArray(guests)||guests.length===0)throw Error('empty_family');
  const yes=guests.filter(g=>g.attendance==='yes').length;
  const no=guests.filter(g=>g.attendance==='no').length;
  return no===guests.length?'declined':yes===guests.length?'confirmed':
    yes===0&&no===0?'waiting':'partial';
}
export function expectedGiftSlots(mode,guests){
  if(mode==='per_adult')return guests.filter(g=>g.attendance==='yes'&&g.person_type!=='child').length;
  if(mode==='family')return guests.some(g=>g.attendance==='yes')?1:0;
  return guests.some(g=>g.attendance==='yes')?null:0;
}
export function plannedDiaperChanges(assignments,expected){
  if(!Number.isSafeInteger(expected)||expected<0||expected>10000)throw Error('invalid_slot_target');
  const assigned=Array.isArray(assignments)?assignments:[];
  const needed=Math.max(0,assigned.length-expected);
  // Nunca apagar unidades recebidas, nem registros de fonte desconhecida.
  const removable=assigned
    .filter(a=>a.id && a.source==='planned' && !a.received_at)
    .sort((a,b)=>b.slot_number-a.slot_number)
    .slice(0,needed);
  const removed=new Set(removable.map(a=>a.id));
  const remaining=assigned.filter(a=>!removed.has(a.id));
  const toCreate=Math.max(0,expected-remaining.length);
  const nextSlot=remaining.reduce((max,a)=>Math.max(max,Number(a.slot_number)||0),0)+1;
  return {
    removeIds:removable.map(a=>a.id),
    newSlots:Array.from({length:toCreate},(_,i)=>nextSlot+i),
    retained:remaining.length
  };
}
