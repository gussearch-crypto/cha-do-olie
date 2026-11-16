import React,{useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {Copy,Check,Heart,QrCode} from 'lucide-react';
import {validPixPayload} from './game-awards.mjs';

/** Render bank-issued PIX locally. No payment provider, backend logging or tracking. */
export default function PixGift({payload,enabled}){
 const code=String(payload||'').trim(),valid=!!enabled&&validPixPayload(code);
 const [image,setImage]=useState(''),[copied,setCopied]=useState(false);
 useEffect(()=>{let alive=true;setImage('');if(!valid)return;
  QRCode.toDataURL(code,{width:256,margin:2,errorCorrectionLevel:'M'}).then(url=>{if(alive)setImage(url)}).catch(()=>{if(alive)setImage('')});
  return()=>{alive=false};
 },[code,valid]);
 if(!valid)return null;
 const copy=async()=>{try{await navigator.clipboard.writeText(code);setCopied(true)}catch{setCopied(false)}};
 return <section className="olieRemotePix" aria-label="Presentear por PIX">
  <div className="olieRemotePixTitle"><Heart size={20}/><strong>Contribuir via PIX</strong></div>
  <p>Se desejar, você pode enviar um carinho para o Oliver com qualquer valor. Isso é opcional e não influencia o jogo.</p>
  {image?<img className="olieRemotePixQR" src={image} width="224" height="224" alt="QR Code PIX para contribuição opcional" loading="lazy"/>:<div className="olieRemotePixLoading"><QrCode size={42}/><span>Preparando QR Code...</span></div>}
  <button type="button" className="olieRemoteOutline olieRemotePixCopy" onClick={copy}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?'Código PIX copiado':'Copiar código PIX'}</button>
  <small>Confira o nome do destinatário e os detalhes no aplicativo do seu banco antes de confirmar o pagamento.</small>
 </section>;
}
