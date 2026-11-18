import React,{useState} from 'react';
import {Gift,Package} from 'lucide-react';
import PixGift from './pix-gift.jsx';
import './games-online.css';

/** A única apresentação de presentes usada no registro real e na simulação administrativa. */
export default function OnlineGiftCard({message='',url='',pixEnabled=false,pixPayload='',pixReceiverName='',pixInstitution='',reminder=false}){
 const [addressOpen,setAddressOpen]=useState(false);
 if(!message&&!url&&!pixEnabled)return null;
 return <div className="olieRemoteGift">
  <Gift size={28}/>
  <h3>{reminder?'Ainda não presenteou o Oliver? 💚':'Quer enviar um carinho para o Oliver?'}</h3>
  {reminder&&<p className="olieRemoteGiftReminder">Se ainda não teve a oportunidade, você pode contribuir com o enxoval do Oliver de maneira simples. Escolha a opção que preferir! <strong>Presentear é opcional e não altera seus palpites nem a classificação.</strong></p>}
  {message&&<p>{message}</p>}
  {url&&<a className="olieRemotePrimary" href={url} target="_blank" rel="noopener noreferrer">Ver lista de presentes</a>}
  <PixGift enabled={pixEnabled} payload={pixPayload} receiverName={pixReceiverName} institution={pixInstitution}/>
  <button type="button" className="olieRemoteOutline" onClick={()=>setAddressOpen(v=>!v)}><Package size={18}/> {addressOpen?'Ocultar informações de entrega':'Ver sugestão de fraldas e entrega'}</button>
  {addressOpen&&<div className="olieRemoteAddress">
    <p><strong>Sugestão:</strong> um pacote de fraldas tamanho M ou G, conforme sua preferência.</p>
    <p><strong>Destinatários:</strong> Gustavo e/ou Vanessa</p>
    <address>Rua Olavo Faggin, 133<br/>Jd. Três Marias<br/>São Paulo/SP — CEP 08331-110</address>
    <button type="button" className="olieRemoteOutline" onClick={()=>navigator.clipboard?.writeText('Gustavo e/ou Vanessa, Rua Olavo Faggin, 133, Jd. Três Marias, São Paulo/SP, 08331-110')}>Copiar endereço</button>
  </div>}
 </div>;
}
