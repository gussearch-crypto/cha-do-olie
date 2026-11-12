import React,{useEffect,useMemo,useState} from 'react';
import {Copy,Download,FileUp,RotateCcw,Save,MessageCircle,ChevronDown} from 'lucide-react';
import {MESSAGE_TYPES,MESSAGE_DEFAULTS,MESSAGE_VARIABLES,MESSAGE_STORE_KEY,
 validateMessageTemplates,readMessageTemplates,messageBackup,parseMessageBackup,
 renderMessageTemplate,messageParameters} from './oliver-message-templates.mjs';
import './oliver-message-center.css';

function download(name,content){
 const blob=new Blob([content],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const demo={display_name:'Família de Exemplo',invite_pin_plain:'1234'};
export default function OliverMessageCenter({families=[],adminCode,messageApi}){
 const [templates,setTemplates]=useState(()=>readMessageTemplates(window.localStorage));
 const [selected,setSelected]=useState('invitation');
 const [familyId,setFamilyId]=useState('');
 const [saved,setSaved]=useState(()=>readMessageTemplates(window.localStorage));
 const [message,setMessage]=useState('');
 const [copied,setCopied]=useState(false);
 const [revision,setRevision]=useState(null);
 const [syncing,setSyncing]=useState(true);
 const [saving,setSaving]=useState(false);
 const selectedFamily=families.find(f=>String(f.id)===familyId)||demo;
 const draft=templates[selected]||'';
 const invalid=[...draft.matchAll(/\{([^{}]+)\}/g)].map(m=>m[1]).filter(k=>!MESSAGE_VARIABLES.includes(k));
 const preview=useMemo(()=>renderMessageTemplate(draft,messageParameters(selectedFamily)),[draft,selectedFamily]);
 const dirty=JSON.stringify(templates)!==JSON.stringify(saved);
 useEffect(()=>{
  let active=true;
  async function sync(){
   if(!adminCode||!messageApi){if(active)setSyncing(false);return}
   try{
    const remote=await messageApi({action:'adminGetMessageTemplates',adminCode});
    if(!active)return;
    setRevision(remote.revision);
    if(remote.templates){
     const clean=validateMessageTemplates(remote.templates);
     setTemplates(clean);setSaved(clean);
     window.localStorage.setItem(MESSAGE_STORE_KEY,messageBackup(clean));
    }else{
     setMessage('Ainda não há modelos compartilhados. Seus textos deste navegador foram preservados: clique em Salvar modelos para disponibilizá-los aos convites.');
    }
   }catch{if(active)setMessage('Não foi possível consultar os modelos compartilhados. Verifique a conexão antes de salvar.')}
   finally{if(active)setSyncing(false)}
  }
  sync();
  const listener=()=>{const current=readMessageTemplates(window.localStorage);setTemplates(current);setSaved(current)};
  window.addEventListener('storage',listener);
  return()=>{active=false;window.removeEventListener('storage',listener)};
 },[adminCode,messageApi]);
 const save=async()=>{
  if(syncing||revision===null||saving)return setMessage('Não foi possível validar a versão compartilhada dos modelos. Recarregue o painel.');
  if(window.location.hostname!=='cha-oliver-mvp.vercel.app'&&!window.confirm('Esta Preview usa o Supabase oficial. Salvar os modelos aqui alterará os textos compartilhados da produção. Deseja continuar?'))return;
  setSaving(true);setMessage('');
  try{
   const clean=validateMessageTemplates(templates);
   const response=await messageApi({action:'adminSaveMessageTemplates',adminCode,templates:clean,expectedRevision:revision});
   if(!response.ok||!Number.isInteger(response.revision))throw new Error('save_unconfirmed');
   window.localStorage.setItem(MESSAGE_STORE_KEY,messageBackup(clean));
   setRevision(response.revision);setTemplates(clean);setSaved(clean);
   setMessage('Modelos salvos no Supabase. Os próximos convites e lembretes copiados usarão estas mensagens em qualquer acesso.');
   window.dispatchEvent(new CustomEvent('oliver-messages-changed'));
  }catch(e){
   setMessage(e.message==='templates_conflict'?'Os modelos foram alterados em outro acesso. Recarregue o painel antes de salvar para não sobrescrever mudanças.':'Não foi possível salvar no Supabase. O texto continua no editor e não foi publicado.');
  }finally{setSaving(false)}
 };
 const restore=()=>{
  if(!window.confirm('Restaurar os quatro modelos padrão? Seus textos atuais serão substituídos apenas depois de salvar.'))return;
  setTemplates({...MESSAGE_DEFAULTS});setMessage('Modelos padrão carregados no editor. Clique em Salvar modelos para confirmar.');
 };
 const importBackup=async e=>{
  const file=e.target.files?.[0];e.target.value='';if(!file)return;
  if(file.size>100000){setMessage('O arquivo deve ter até 100 KB.');return}
  try{
   const parsed=parseMessageBackup(await file.text());
   if(!window.confirm('Carregar modelos do backup? Confira os textos antes de salvar.'))return;
   setTemplates(parsed);setMessage('Backup carregado no editor. Revise e clique em Salvar modelos.');
  }catch{setMessage('Arquivo de mensagens inválido. Nenhuma alteração foi salva.')}
 };
 const copy=async()=>{
  try{await navigator.clipboard.writeText(preview);setCopied(true);setMessage('Mensagem copiada. Cole e envie manualmente no aplicativo escolhido; a cópia não registra envio.')}
  catch{setMessage('Falha ao copiar. Selecione o texto da prévia para copiá-lo manualmente.')}
 };
 return <section id="oliver-message-center" className="olieMessageCenter adminTabbedBlock" aria-label="Central de Mensagens do Oliver">
  <details className="olieMessageDisclosure">
   <summary className="olieMessageIntro olieMessageToggle">
    <div><span className="eyebrow">SPRINT 6 · COMUNICAÇÃO</span><h2><MessageCircle size={24}/> Central de Mensagens</h2>
     <p>Convites, lembretes e modelos personalizados. Abra somente quando precisar.</p></div>
    <span className="olieMessageTag">Exibir / ocultar <ChevronDown size={17} aria-hidden="true"/></span>
   </summary>
   <p className="olieMessageStorageNote">Os modelos salvos são compartilhados via <strong>Supabase</strong> entre os acessos administrativos. O backup JSON continua disponível. As mensagens são copiadas e enviadas manualmente.</p>
   <div className="olieMessagePanel">
   <label className="olieMessageLabel">Tipo de mensagem<select value={selected} onChange={e=>{setSelected(e.target.value);setCopied(false);setMessage('')}}>
    {MESSAGE_TYPES.map(t=><option value={t.key} key={t.key}>{t.label}</option>)}
   </select></label>
   <p className="olieMessageHelp">{MESSAGE_TYPES.find(t=>t.key===selected)?.description}</p>
   <p className="olieMessageHelp" role="note">{selected==='reminder'?'Este texto é utilizado nos botões Preparar lembrete de confirmação e Copiar lembrete de confirmação.':selected==='eventReminder'?'Este texto é utilizado no botão Copiar lembrete do evento.':selected==='invitation'?'Este texto é utilizado em Copiar convite até o prazo inicial.':'Este texto é utilizado em Copiar convite para novos convites após 30/11.'}</p>
   <div className="olieMessageGrid">
    <div className="olieMessageEditor">
     <label className="olieMessageLabel">Texto do modelo
      <textarea rows={12} maxLength={5000} value={draft} onChange={e=>{setTemplates(p=>({...p,[selected]:e.target.value}));setCopied(false)}}/>
     </label>
     <p className="olieMessageHelp">Insira as variáveis disponíveis no local do texto desejado:</p>
     <div className="olieMessageVariables">{MESSAGE_VARIABLES.map(v=><button type="button" key={v} onClick={()=>setTemplates(p=>({...p,[selected]:(p[selected]||'')+'{'+v+'}'}))}>{'{'+v+'}'}</button>)}</div>
     {invalid.length>0&&<p role="alert" className="olieMessageError">Variável desconhecida: {[...new Set(invalid)].join(', ')}. Use as opções acima.</p>}
    </div>
    <div className="olieMessagePreview">
     <label className="olieMessageLabel">Prévia para
      <select value={familyId} onChange={e=>{setFamilyId(e.target.value);setCopied(false)}}>
       <option value="">Família fictícia de exemplo</option>
       {families.filter(f=>f.is_test!==true).map(f=><option key={f.id} value={f.id}>{f.display_name}</option>)}
      </select>
     </label>
     <pre className="olieMessagePaper" aria-label="Prévia da mensagem">{preview}</pre>
     <button className="olieMessageCopy" type="button" onClick={copy} disabled={!!invalid.length||!draft.trim()}><Copy size={16}/>{copied?'Copiar novamente':'Copiar prévia'}</button>
     <small>A prévia não envia mensagens. Use o botão de copiar do núcleo familiar para preencher as informações dele automaticamente.</small>
    </div>
   </div>
   {dirty&&<p className="olieMessagePending" role="status">Alterações no editor ainda não foram salvas.</p>}
   {message&&<p className="olieMessageStatus" role="status">{message}</p>}
   <div className="olieMessageActions">
    <button type="button" className="olieMessageSave" onClick={save} disabled={!!invalid.length||syncing||saving||revision===null}><Save size={16}/>{saving?"Salvando…":syncing?"Carregando modelos…":"Salvar modelos"}</button>
    <button type="button" onClick={()=>download('modelos-mensagens-oliver.json',messageBackup(saved))}><Download size={16}/> Backup dos modelos salvos</button>
    <label className="olieMessageImport"><FileUp size={16}/> Importar backup<input type="file" hidden accept=".json,application/json" onChange={importBackup}/></label>
    <button type="button" onClick={restore}><RotateCcw size={16}/> Restaurar padrões</button>
   </div>
  </div>
   <p className="olieMessageFootnote">Importante: copiar não altera o histórico de envios. O status «Enviado» só deve ser marcado manualmente após o envio real. Alterações dos modelos não modificam mensagens já enviadas.</p>
  </details>
 </section>;
}
