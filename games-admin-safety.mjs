import {isPreviewGamesHost} from './game-environment.mjs';
// Escrita administrativa no backend real é restrita ao domínio oficial.
// O Laboratório /games/teste é um módulo separado, com dados sintéticos isolados.
export const READ_ONLY_GAME_ACTIONS=Object.freeze([
 'adminGet','adminBirthGet','adminBirthRanking','adminAuditList','adminDemoBirthRanking'
]);
export function canExecuteGamesAdminAction(hostname,action){
 if(!isPreviewGamesHost(hostname))return true;
 return READ_ONLY_GAME_ACTIONS.includes(action);
}
export function gamesAdminPhase(settings={}){
 const official=!!settings?.actual_birth_date&&settings?.actual_weight_g!=null&&settings?.actual_length_cm!=null;
 const published=!!settings?.results_published;
 const closed=!!settings?.birth_closed_at||settings?.birth_open===false||official||published;
 return {closed,official,published,
  steps:[{name:'Palpites',done:closed},{name:'Dados oficiais',done:official},{name:'Ranking',done:published}]};
}
