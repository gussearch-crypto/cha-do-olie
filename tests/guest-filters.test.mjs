import test from 'node:test';
import assert from 'node:assert/strict';
import {guestFamilyStatus,guestFilterCounts,guestGroups,filterGuestFamilies} from '../guest-filters.mjs';
import {GUEST_EXPORT_HEADERS,guestExportRows,guestExportCSV} from '../guest-export.mjs';
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
 assert.match(admin,/className="guestExtraToggle"/);
 assert.match(admin,/className="guestSecondaryPanel"/);
 assert.match(admin,/<Pencil\/> Editar<\/button>/);
 assert.match(admin,/confirmationCode=window\.prompt/);
 assert.match(html,/admin-guest-refresh\.css/);
 assert.doesNotMatch(html,/import\('\/admin-group-filter\.js'\)/);
});

test('CSV exporta uma pessoa por linha com três colunas etárias e status individual',()=>{
 const input=[
  {display_name:'Família Sol',group_name:'Amigos',guests:[
   {name:'Ana',person_type:'adult',attendance:'yes'},
   {name:'Bia',person_type:'child',child_age_group:'five_or_more',attendance:'pending'},
   {name:'Caio',person_type:'child',child_age_group:'under_5',attendance:'no'},
   {name:'Dani',person_type:'child',child_age_group:null,attendance:'pending'}
  ]},
  {display_name:'Família Teste',group_name:'Teste',guests:[{name:'Exemplo',person_type:'adult',attendance:'yes'}]},
  {display_name:'Núcleo técnico',group_name:'Amigos',is_test:true,guests:[{name:'Teste oculto',person_type:'adult',attendance:'yes'}]}
 ];
 const before=JSON.stringify(input);
 const rows=guestExportRows(input);
 assert.deepEqual(GUEST_EXPORT_HEADERS,[
  'Nome convidado','Núcleo','Grupo','Adulto','Criança ≥5 anos','Criança <5 anos','Status do convidado'
 ]);
 assert.equal(rows.length,5);
 assert.deepEqual(rows[1],['Ana','Família Sol','Amigos',1,'','','Confirmado']);
 assert.deepEqual(rows[2],['Bia','Família Sol','Amigos','',1,'','Aguardando']);
 assert.deepEqual(rows[3],['Caio','Família Sol','Amigos','','',1,'Não irá']);
 assert.deepEqual(rows[4],['Dani','Família Sol','Amigos','','','','Aguardando']);
 assert.equal(JSON.stringify(input),before);
});

test('exportação respeita o status individual, não o status parcial do núcleo',()=>{
 const input=[{display_name:'Núcleo parcial',group_name:'Família',invite_status:'partial',guests:[
  {name:'Adulto',person_type:'adult',attendance:'yes'},
  {name:'Criança',person_type:'child',child_age_group:'five_or_more',attendance:'pending'},
  {name:'Ausente',person_type:'child',child_age_group:'under_5',attendance:'no'}
 ]}];
 assert.deepEqual(guestExportRows(input,'confirmed').slice(1).map(r=>r[0]),['Adulto']);
 assert.deepEqual(guestExportRows(input,'pending').slice(1).map(r=>r[0]),['Criança']);
 assert.deepEqual(guestExportRows(input,'declined').slice(1).map(r=>r[0]),['Ausente']);
 assert.equal(guestExportRows(input,'all').length,4);
});

test('CSV usa BOM, ponto-e-vírgula, mantém acentos e bloqueia fórmula maliciosa',()=>{
 const rows=guestExportRows([{display_name:'Família "Lima"',group_name:'Amigos',guests:[
  {name:'=HYPERLINK("exemplo")',person_type:'adult',attendance:'yes'},
  {name:'José',person_type:'child',child_age_group:'under_5',attendance:'pending'}
 ]}]);
 const csv=guestExportCSV(rows);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/Nome convidado";"Núcleo";"Grupo";"Adulto"/);
 assert.match(csv,/Criança ≥5 anos/);
 assert.match(csv,/Criança <5 anos/);
 assert.match(csv,/Status do convidado/);
 assert.match(csv,/José/);
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/Família ""Lima""/);
 assert.equal(csv.split('\r\n').length,3);
});

test('interface utiliza o CSV categorizado sem perder os filtros existentes',()=>{
 const admin=readFileSync(new URL('../admin-entry.jsx',import.meta.url),'utf8');
 assert.match(admin,/guestExportCSV\(guestExportRows\(familiesToExport,exportStatus\)\)/);
 assert.match(admin,/exportScope==='filtered'\?shown:families/);
 assert.match(admin,/Status individual na exportação/);
 assert.match(admin,/Inclui adulto, criança de 5 anos ou mais/);
});
