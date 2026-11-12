// Cronograma consolidado do Chá do Oliver, sem dados financeiros.
// IDs estáveis permitem importar sem duplicar ou sobrescrever tarefas editadas.
const rows=[
['2026-12-03','18:00','19:00','Retirar decoração Pegue e Monte','Gustavo','Decoração','Fest Belly, Av. João Firmino, 435 — São Bernardo do Campo. Retirada contratada para 03/12 às 18h. Conferir peças e guardar para montagem na sexta.'],
['2026-12-04','10:00','10:30','Receber chaves e vistoriar salão','Gustavo e Vanessa','Local','Terra Mágica, Av. das Nações, 151 — Santo André. Conferir limpeza, cozinha, freezer, geladeiras, tomadas, mesas e banheiros. Guardar alimentos e colocar bebidas para gelar.'],
['2026-12-04','10:30','12:30','Montar decoração e balões','Gustavo, Vanessa e apoio','Decoração','Montar painéis, cilindros, arco de balões e mesa decorativa. Não fixar materiais nas superfícies do salão.'],
['2026-12-04','12:30','13:15','Organizar mesas, cadeiras e toalhas','Equipe de apoio','Estrutura','Distribuir lugares, conferir circulação e as 20 toalhas previstas no contrato do salão.'],
['2026-12-04','13:15','14:15','Montar mesa de serviço e estações dos jogos','Equipe de apoio','Estrutura','Preparar bandejas, pratos, copos, guardanapos, QR Codes nas mesas, estação de barbantes e materiais das brincadeiras.'],
['2026-12-04','14:15','16:00','Retirar encomendas e armazenar alimentos','Gustavo e apoio','Alimentação','Buscar salgados, pão de metro, mini pães e sorvetes; horários e rota ainda a confirmar. Armazenar respeitando a temperatura de cada alimento; sorvetes direto ao freezer.'],
['2026-12-04','15:00','16:15','Conferir doces, cozinha e prêmios','Vanessa e apoio','Alimentação','Preparar o serviço da salsicha com molho. Conferir 200 docinhos (70 brigadeiros, 70 beijinhos e 60 bichos de pé); 130 sorvetes em 7 sabores; sacolinhas apenas para crianças. Salpicão 4–5 kg opcional.'],
['2026-12-04','16:15','16:30','Revisão final do salão e equipamentos','Equipe de apoio','Estrutura','Conferir microfone, som, decoração, pratos, prêmios, brincadeiras, QR Codes e refrigeração.'],
['2026-12-04','16:30','17:30','Preparação pessoal e fotos','Gustavo e Vanessa','Outros','Trocar de roupa e fotografar o salão pronto. Delegar pendências à equipe de apoio.'],
['2026-12-04','17:30','18:00','Preparar recepção e alimentos iniciais','Equipe de apoio','Alimentação','Música, primeiras porções de salgados, bebidas e mesas prontas. Monitoras do salão previstas 10 min antes do evento, mediante confirmação do horário.'],
['2026-12-04','18:00','18:30','Recepção dos convidados','Equipe de recepção','Outros','QR Codes e estação de barbantes disponíveis desde a chegada. Receber presentes e servir alimentos.'],
['2026-12-04','18:30','18:45','Abertura e explicação das dinâmicas','Apresentador','Outros','Explicar A Chegada do Oliver (QR Code e consulta futura), Cuide do Seu Bebê/Nazaré (roubos e contagem final) e barbante para medir a barriga.'],
['2026-12-04','18:45','19:30','Confraternização e atividades livres','Todos','Outros','Palpites de nascimento, hora, peso e tamanho; separação de barbantes; jogo Nazaré acontecendo em paralelo.'],
['2026-12-04','19:30','19:55','Papinha Maluca — 2 rodadas','Apresentador e apoio','Outros','4 participantes por rodada, em duas duplas. Ganha a dupla que terminar primeiro. Dois prêmios: um kit de café por rodada, com 2 xícaras, chocolates e cappuccino solúvel.'],
['2026-12-04','19:55','20:20','Alimentação, reposição e fotos','Equipe da cozinha','Alimentação','Serviço contínuo de salgados, mini hotdogs, pão de metro e bebidas, com reposições menores.'],
['2026-12-04','20:20','20:40','Parto da Bexiga','Apresentador e apoio','Outros','Vence quem parir a bexiga primeiro. Prêmio: copo térmico com bombons.'],
['2026-12-04','20:40','21:00','Pausa e recolhimento dos barbantes','Equipe de apoio','Outros','Recolher barbantes identificados. Encerrar recebimento dos palpites às 20h50.'],
['2026-12-04','21:00','21:20','Medição da barriga da Vanessa','Vanessa e apresentador','Outros','Participação feminina. Vence o barbante que mais se aproximar da circunferência real. Prêmio: kit de autocuidado.'],
['2026-12-04','21:20','21:40','Nazaré — contagem e premiação','Apresentador e apoio','Outros','Encerrar roubos às 21h20. Vence quem tiver mais bebês, com pelo menos 6 roubos válidos. Prêmio: mini cesta de café da manhã.'],
['2026-12-04','21:40','22:00','Agradecimentos e despedida','Gustavo e Vanessa','Outros','Fotos, agradecimento, possível oração e entrega das sacolinhas de doces às crianças.'],
['2026-12-04','22:00','23:00','Desmontar, limpar e devolver chaves','Equipe de apoio','Local','Recolher presentes, guardar alimentos, desmontar a decoração e retirar itens do salão. Entrega obrigatória das chaves até 23h.'],
['2026-12-07','20:00','22:00','Devolver decoração à Fest Belly','Gustavo','Decoração','Prazo contratual até 07/12 às 22h. Horário de chegada a combinar com a loja; devolver peças limpas e embaladas.']
];
const types=['Local','Decoração','Estrutura','Alimentação','Outros'];
export const oliverScheduleTasks=rows.map((r,i)=>({
 id:'olie-cronograma-2026-'+String(i+1).padStart(2,'0'),
 eventDate:r[0],eventTime:r[1],eventEnd:r[2],title:r[3],responsible:r[4],
 category:types.includes(r[5])?r[5]:'Outros',notes:r[6],
 due:r[0],priority:'medium',status:'todo',completedAt:'',
 contact:'',place:'',cost:false,dependsOn:[],subtasks:[]
}));
export function mergeOliverSchedule(tasks){
 const original=Array.isArray(tasks)?tasks:[];
 const ids=new Set(original.map(t=>t.id));
 const signatures=new Set(original.filter(t=>t.eventTime).map(t=>[t.eventDate,t.eventTime,String(t.title||'').trim().toLocaleLowerCase('pt-BR')].join('|')));
 const additions=oliverScheduleTasks.filter(t=>!ids.has(t.id)&&!signatures.has([t.eventDate,t.eventTime,t.title.toLocaleLowerCase('pt-BR')].join('|')));
 return {tasks:[...original,...additions],added:additions.length};
}
