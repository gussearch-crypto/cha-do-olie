/** Gera localmente um comprovante em PNG. Não inclui telefone, núcleo ou protocolo. */
export function downloadOliverTicket(entry){
  if(!entry||typeof document==='undefined')return false;
  const canvas=document.createElement('canvas');
  canvas.width=900;canvas.height=1150;
  const c=canvas.getContext('2d');
  if(!c)return false;
  const rounded=(x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};
  const date=entry.birth_date?String(entry.birth_date).split('-').reverse().join('/'):'';
  const time=String(entry.birth_time||'').slice(0,5);
  const weight=entry.weight_g!=null&&Number.isFinite(Number(entry.weight_g))
    ?(Number(entry.weight_g)/1000).toFixed(3).replace('.',',')+' kg':'';
  const length=entry.length_cm!=null?String(entry.length_cm).replace('.',',')+' cm':'';
  const belly=entry.belly_cm!=null?String(entry.belly_cm).replace('.',',')+' cm':'';
  c.fillStyle='#faf6ec';c.fillRect(0,0,900,1150);
  c.strokeStyle='#c5d2b6';c.lineWidth=8;rounded(28,28,844,1094,37);c.stroke();
  c.fillStyle='#eff4e8';rounded(48,48,804,225,26);c.fill();
  c.textAlign='center';
  c.fillStyle='#5d724b';c.font='700 24px Georgia,serif';c.fillText('CHÁ DO OLIVER',450,99);
  c.fillStyle='#425e36';c.font='700 42px Georgia,serif';c.fillText('Meu palpite para o Oliver',450,167);
  c.font='400 22px Arial,sans-serif';c.fillText('Uma lembrança da nossa espera 💛',450,219);
  c.fillStyle='#8a9a7d';c.fillRect(85,310,730,2);
  c.fillStyle='#718361';c.font='700 19px Arial,sans-serif';c.fillText('PARTICIPANTE',450,355);
  c.fillStyle='#415c37';c.font='700 29px Arial,sans-serif';
  const name=String(entry.participant_name||'Participante').trim();
  const words=name.split(/\s+/),lines=[];let current='';
  for(const w of words){const next=(current?current+' ':'')+w;if(c.measureText(next).width>725&&current){lines.push(current);current=w}else current=next}
  if(current)lines.push(current);
  lines.slice(0,2).forEach((x,i)=>c.fillText(x,450,402+i*36,730));
  const fields=[];
  if(date)fields.push(['NASCIMENTO',date+(time?' às '+time:'')]);
  if(weight)fields.push(['PESO PREVISTO',weight]);
  if(length)fields.push(['COMPRIMENTO PREVISTO',length]);
  if(belly)fields.push(['MEDIDA DA BARRIGA',belly]);
  const xPos=[90,465],yPos=[492,677];
  fields.slice(0,4).forEach(([label,value],idx)=>{
    const col=idx%2,row=Math.floor(idx/2),x=xPos[col],y=yPos[row];
    c.fillStyle='#eff4e7';rounded(x,y,345,154,19);c.fill();
    c.fillStyle='#738363';c.textAlign='left';c.font='700 17px Arial,sans-serif';c.fillText(label,x+20,y+41);
    c.fillStyle='#45633c';c.font='700 27px Arial,sans-serif';c.fillText(value,x+20,y+99,304);
  });
  c.textAlign='center';c.fillStyle='#516b43';c.font='700 24px Georgia,serif';
  c.fillText('Feito com carinho para a chegada do Oliver',450,940,750);
  c.fillStyle='#829176';c.font='400 20px Arial,sans-serif';
  c.fillText('Palpites registrados não podem ser alterados.',450,990);
  c.fillText('Os vencedores serão divulgados após a chegada.',450,1025);
  const link=document.createElement('a');
  link.download='meu-palpite-oliver.png';
  link.href=canvas.toDataURL('image/png');
  document.body.appendChild(link);link.click();link.remove();
  return true;
}
