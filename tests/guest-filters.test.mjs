import test from 'node:test';
import assert from 'node:assert/strict';
import {guestFamilyStatus,guestFilterCounts,guestGroups,filterGuestFamilies} from '../guest-filters.mjs';
import {readFileSync} from 'node:fs';
const data=[
 {id:1,number:2,display_name:'Família Árvore',group_name:'Amigos',invite_sent:true,guests:[{name:'João',attendance:'yes',person_type:'adult'},{name:'Bia',attendance:'pending',person_type:'child',child_age_group:'under_5'}]},
 {id:2,number:1,display_name:'Família Lima',group_name:'Trabalho',invite_sent:false,guests:[{name:'Cecília',attendance:'pending',person_type:'adult'}]},
 {id:3,number:3,display_name:'Família Rosa',group_name:'Amigos',invite_sent:true,guests:[{name:'Davi',attendance:'yes',person_type:'adult'}]},
 {id:4,number:4,display_name:'Família Nunes',group_name:'Família',invite_sent:true,guests:[{name:'Edu',attendance:'no',person_type:'adult'}]}
];
test('separa status pendente de parcial e calcula números corretamente',()=>{
 assert.deepEqual(data.map(guestFamilyStatus),['partial','pending','confirmed','declined']);
 assert.deepEqual(guestFilterCounts(data),{all:4,confirmed:1,pending:1,partial:1,declined:1});
});
test('busca acentos, núcleos, pessoas e número',()=>{
 assert.deepEqual(filterGuestFamilies(data,{search:'familia arvore'}).map(f=>f.id),[1]);
 assert.deepEqual(filterGuestFamilies(data,{search:'cecilia'}).map(f=>f.id),[2]);
 assert.deepEqual(filterGuestFamilies(data,{search:'#2'}).map(f=>f.id),[1]);
});
test('combina filtros, grupo, envio e criança pequena sem mudar a base',()=>{
 const before=JSON.stringify(data);
 assert.deepEqual(guestGroups(data),['Amigos','Família','Trabalho']);
 assert.deepEqual(filterGuestFamilies(data,{group:'Amigos',status:'partial',sent:'sent',person:'under_5'}).map(f=>f.id),[1]);
 assert.deepEqual(filterGuestFamilies(data,{sent:'not_sent'}).map(f=>f.id),[2]);
 assert.deepEqual(filterGuestFamilies(data,{sort:'attention'}).map(f=>f.id),[2,1,3,4]);
 assert.equal(JSON.stringify(data),before);
});
test('interface integra filtros e preserva edição por senha',()=>{
 const admin=readFileSync(new URL('../admin-entry.jsx',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(admin,/className="confirmationFilter guestFilterPanel"/);
 assert.match(admin,/className="guestAdvancedFilters"/);
 assert.match(admin,/className="guestMoreActions"/);
 assert.match(admin,/<Pencil\/> Editar<\/button>/);
 assert.match(admin,/confirmationCode=window\.prompt/);
 assert.match(html,/admin-guest-refresh\.css/);
 assert.doesNotMatch(html,/import\('\/admin-group-filter\.js'\)/);
});
