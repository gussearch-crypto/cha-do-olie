import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import QRCode from 'qrcode';
import {ArrowLeft,Copy,Printer,Check,ExternalLink,ShieldCheck,TriangleAlert} from 'lucide-react';
import {OFFICIAL_EVENT_ORIGIN,qrTarget,qrIsPrintable} from './games-qr-target.mjs';
// O CSS da placa está no index.html para evitar conflitos com os estilos globais do convite.

function GamesQRCode(){
 const previewAvailable=window.location.origin!==OFFICIAL_EVENT_ORIGIN;
 const [channel,setChannel]=useState('presencial');
 const [paper,setPaper]=useState('A5');
 const [mode,setMode]=useState('official');
 const [image,setImage]=useState('');
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const origin=mode==='preview'&&previewAvailable?window.location.origin:OFFICIAL_EVENT_ORIGIN;
 const url=useMemo(()=>qrTarget(channel,origin),[channel,origin]);
 const printable=qrIsPrintable(origin);
 useEffect(()=>{
   const style=document.createElement('style');
   style.dataset.oliePrintPaper='true';
   style.textContent=paper==='A5'?'@page { size: A5; margin: 9mm; }':'@page { size: A4; margin: 12mm; }';
   document.head.appendChild(style);
   return()=>style.remove();
 },[paper]);
 useEffect(()=>{
   let active=true;
   setImage('');setError('');setCopied(false);
   QRCode.toDataURL(url,{width:800,margin:4,errorCorrectionLevel:'H',color:{dark:'#223c20',light:'#ffffff'}})
    .then(data=>{if(active)setImage(data)})
    .catch(()=>{if(active){setImage('');setError('Não foi possível gerar o QR Code. Atualize a página.')}});
   return()=>{active=false};
 },[url]);
 const copy=async()=>{
   try{await navigator.clipboard.writeText(url);setCopied(true);setError('')}
   catch{setError('Não foi possível copiar automaticamente. Utilize o link abaixo.')}
 };
 const print=()=>{
   if(!printable){setError('Para imprimir, selecione Endereço oficial. Links temporários são somente para testes.');return}
   if(image)window.print();
 };
 return <main className={'olieQrPage '+(paper==='A5'?'is-a5':'is-a4')}>
  <nav className="olieQrToolbar" aria-label="Ferramentas do QR Code">
   <a href="/?painel=1"><ArrowLeft size={18}/> Voltar ao painel</a>
   <span className="olieQrToolTag">MATERIAIS DO EVENTO</span>
  </nav>
  <section className="olieQrSettings" aria-label="Configurar placa">
   <div className="olieQrSettingsHeading"><div><h2>Placas dos Jogos do Oliver</h2><p>Escolha a brincadeira, o formato e confira o endereço antes de imprimir.</p></div></div>
   <div className="olieQrSettingsRows">
    <fieldset className="olieQrGroup">
      <legend>Destino</legend>
      <div className="olieQrTabs" role="group" aria-label="Tipo de jogo">
       <button type="button" className={channel==='presencial'?'is-active':''} aria-pressed={channel==='presencial'} onClick={()=>setChannel('presencial')}>Presencial</button>
       <button type="button" className={channel==='online'?'is-active':''} aria-pressed={channel==='online'} onClick={()=>setChannel('online')}>Online</button>
      </div>
    </fieldset>
    <fieldset className="olieQrGroup">
     <legend>Formato de impressão</legend>
     <div className="olieQrTabs" role="group" aria-label="Tamanho da placa">
      <button type="button" className={paper==='A5'?'is-active':''} aria-pressed={paper==='A5'} onClick={()=>setPaper('A5')}>A5 · Mesa</button>
      <button type="button" className={paper==='A4'?'is-active':''} aria-pressed={paper==='A4'} onClick={()=>setPaper('A4')}>A4 · Painel</button>
     </div>
    </fieldset>
   </div>
   {previewAvailable&&<div className="olieQrEnvironment" role="group" aria-label="Ambiente do QR">
     <span>Destino do código:</span>
     <div className="olieQrTabs">
      <button type="button" className={mode==='official'?'is-active':''} aria-pressed={mode==='official'} onClick={()=>setMode('official')}>Endereço oficial</button>
      <button type="button" className={mode==='preview'?'is-active':''} aria-pressed={mode==='preview'} onClick={()=>setMode('preview')}>Testar Preview</button>
     </div>
   </div>}
   <div className={'olieQrTargetLine'+(printable?' is-permanent':' is-temporary')}>
    {printable?<ShieldCheck size={20}/>:<TriangleAlert size={20}/>}
    <div><strong>{printable?'Link permanente para impressão':'Link temporário · somente testes'}</strong><a href={url} target="_blank" rel="noopener noreferrer">{url}<ExternalLink size={13}/></a></div>
   </div>
   <div className="olieQrActions">
    <button type="button" className="olieQrSecondary" onClick={copy}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Link copiado':'Copiar link'}</button>
    <button type="button" onClick={print} disabled={!image||!printable}><Printer size={17}/> Imprimir placa {paper}</button>
   </div>
   <small>{printable?'A impressão sempre utiliza o domínio oficial. Ao testar em Preview, esse QR Code abre a versão atual de produção.':'Este endereço muda entre implantações e não deve ser usado em material impresso.'}</small>
   {error&&<p role="alert">{error}</p>}
  </section>
  <div className="olieQrPreviewLabel"><strong>Prévia da placa · {paper}</strong><span>Somente o quadro abaixo será impresso.</span></div>
  <article className="olieQrPoster" aria-label={'Placa '+paper+' com QR Code para jogos '+channel}>
   <div className="olieQrPosterTop">
    <span className="olieQrMascots" aria-hidden="true">🦁 🐼 🦒 🐓</span>
    <p className="olieQrEyebrow">CHÁ DO OLIVER · 04 DE DEZEMBRO</p>
    <h1>{channel==='presencial'?'Brincadeiras do Olie!':'De longe, mas pertinho do Olie!'}</h1>
    <p className="olieQrMessage">{channel==='presencial'?'Aponte a câmera e participe dos nossos jogos!':'Adivinhe quando o Oliver vai chegar. Participe de onde estiver!'}</p>
   </div>
   <div className="olieQrImage">{image?<img src={image} alt={'QR Code dos Jogos do Oliver — '+channel}/>:<p>Gerando QR Code...</p>}</div>
   <p className="olieQrScan">APONTE A CÂMERA DO CELULAR</p>
   <p className="olieQrAddress">{url}</p>
   <footer>Feito com carinho para a chegada do Oliver 💛</footer>
  </article>
 </main>;
}
createRoot(document.getElementById('root')).render(<GamesQRCode/>);
