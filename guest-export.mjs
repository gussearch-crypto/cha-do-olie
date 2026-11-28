import {normalizedGuestText} from './guest-filters.mjs';

/** Uma linha por pessoa; as três colunas de perfil permitem somar participantes no Excel. */
export const GUEST_EXPORT_HEADERS=[
  'Nome convidado',
  'Núcleo',
  'Grupo',
  'Adulto',
  'Criança ≥5 anos',
  'Criança <5 anos',
  'Status do convidado'
];

const PRESENCE_LABELS={yes:'Confirmado',no:'Não irá'};
const STATUS_FILTERS={confirmed:'Confirmado',pending:'Aguardando',declined:'Não irá'};

/** A presença é sempre individual, mesmo quando o núcleo tem status parcial. */
export function guestExportRows(families=[],statusFilter='all'){
  const rows=[GUEST_EXPORT_HEADERS];
  for(const family of families){
    if(family.is_test===true||normalizedGuestText(family.group_name)==='teste')continue;
    for(const guest of family.guests||[]){
      const status=PRESENCE_LABELS[guest.attendance]||'Aguardando';
      if(statusFilter!=='all'&&status!==STATUS_FILTERS[statusFilter])continue;
      const child=guest.person_type==='child';
      rows.push([
        guest.name||'',
        family.display_name||'',
        family.group_name||'',
        child?'':1,
        child&&guest.child_age_group==='five_or_more'?1:'',
        child&&guest.child_age_group==='under_5'?1:'',
        status
      ]);
    }
  }
  return rows;
}

/** UTF-8 com BOM, separador Excel pt-BR e proteção contra fórmulas em dados livres. */
export function guestExportCSV(rows){
  const csvCell=value=>{
    const cell=String(value??'').replace(/^\s*([=+@-])/,"'$1");
    return '"'+cell.replace(/"/g,'""')+'"';
  };
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
