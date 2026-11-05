import React,{useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import QRCode from 'qrcode';
import {ArrowLeft,Copy,Printer,Check} from 'lucide-react';
// A folha de estilos é carregada diretamente pelo index.html para garantir sua aplicação.

function GamesQRCode(){
 useEffect(()=>{
   // Configuração A4 aplicada somente nesta rota, sem afetar impressão de outras páginas.
   const style=document.createElement('style');
   style.textContent='@page { size: A4; margin: 12mm; }';
   document.head.appendChild(style);
   return()=>style.remove();
 },[]);
 const [channel,setChannel]=useState('presencial');
 const initial=useMemo(()=>window.location.origin+ (channel==='presencial'?'/games':'/games/online'),[channel]);
 const [manual,setManual]=useState('');
 const [img,setImg]=useState('');
 const [error,setError]=useState('');
 const [copied,setCopied]=useState(false);
 const url=manual.trim()||initial;
 useEffect(()=>{let active=true;setError('');QRCode.toDataURL(url,{width:460,margin:3,errorCorrectionLevel:'H',color:{dark:'#20361D',light:'#FFFFFF'}}).then(data=>{if(active)setImg(data)}).catch(()=>{if(active){setImg('');setError('Não foi possível gerar o QR Code')}});return()=>{active=false}},[url]);
 const copy=async()=>{try{await navigator.clipboard.writeText(url);setCopied(true)}catch{setError('Copie o endereço manualmente a partir do campo.')}};
 return <main className="olieQrPage">
  <nav className="olieQrToolbar" aria-label="Ferramentas do QR Code">
    <a href="/?painel=1"><ArrowLeft size={18}/> Voltar ao painel</a>
    <div className="olieQrTabs" role="group" aria-label="Tipo de acesso">
      <button type="button" className={channel==='presencial'?'is-active':''} aria-pressed={channel==='presencial'} onClick={()=>{setChannel('presencial');setManual('')}}>Presencial</button>
      <button type="button" className={channel==='online'?'is-active':''} aria-pressed={channel==='online'} onClick={()=>{setChannel('online');setManual('')}}>Online</button>
    </div>
  </nav>
  <section className="olieQrSettings">
    <label>Link que será aberto pelo QR Code<input type="url" value={manual||initial} onChange={e=>setManual(e.target.value)} aria-label="Endereço do QR Code"/></label>
    <div className="olieQrActions">
      <button type="button" onClick={copy}>{copied?<Check size={17}/>:<Copy size={17}/>} {copied?'Copiado':'Copiar link'}</button>
      <button type="button" onClick={()=>window.print()} disabled={!img}><Printer size={17}/> Imprimir placa</button>
    </div>
    <small>Confira o endereço acima antes de imprimir, especialmente se estiver usando uma prévia da Vercel.</small>
    {error&&<p role="alert">{error}</p>}
  </section>
  <article className="olieQrPoster">
    <span className="olieQrMascots" aria-hidden="true">🦁 🐼 🦒 🐓</span>
    <p className="olieQrEyebrow">CHÁ DO OLIVER · 04 DE DEZEMBRO</p>
    <h1>{channel==='presencial'?'Brincadeiras do Olie!':'De longe, mas pertinho do Olie!'}</h1>
    <p className="olieQrMessage">{channel==='presencial'?'Acerte o palpite e entre na nossa brincadeira!':'Adivinhe quando o Oliver vai chegar e participe da nossa espera.'}</p>
    <div className="olieQrImage">{img?<img src={img} alt={'QR Code para os Jogos do Oliver '+channel}/>:<p>Gerando QR Code...</p>}</div>
    <p className="olieQrScan">APONTE A CÂMERA DO CELULAR</p>
    <p className="olieQrAddress">{url}</p>
    <footer>Feito com carinho para a chegada do Oliver 💛</footer>
  </article>
 </main>;
}
createRoot(document.getElementById('root')).render(<GamesQRCode/>);
