import {useEffect,useRef,useState} from 'react';
import {mergePlanningStates,planningStatesEqual as equal} from './planning-utils.mjs';
export function usePlanningSync({data,setData,api,normalize,storageKey}) {
  const [sync,setSync]=useState('loading'),[conflict,setConflict]=useState(null);
  const current=useRef(data),engine=useRef({ready:false,busy:false,base:null,revision:0,conflict:null,timer:null,live:true});
  current.current=data;
  const cache=()=>{const e=engine.current;localStorage.setItem(storageKey,JSON.stringify(current.current));if(e.base)localStorage.setItem(storageKey+'Sync',JSON.stringify({base:e.conflict?.base||e.base,revision:e.revision}))};
  const adopt=value=>{current.current=value;setData(value);cache()};
  const reconcile=async()=>{
    const e=engine.current,remote=await api('get');if(!e.live)return;
    const incoming=normalize(remote.data||{tasks:[],expenses:[]}),base=e.base||normalize({tasks:[],expenses:[]});
    const merged=mergePlanningStates(base,current.current,incoming);
    e.base=incoming;e.revision=remote.revision||0;
    if(merged.conflicts.length){e.conflict={base,remote:incoming,conflicts:merged.conflicts};setConflict(e.conflict);setSync('conflict');cache();return}
    e.conflict=null;setConflict(null);adopt(merged.data);setSync(equal(merged.data,incoming)?'synced':'saving');
  };
  const flush=async()=>{
    const e=engine.current;if(!e.live||!e.ready||e.busy||e.conflict)return;
    e.busy=true;
    try {
      if(!e.base)await reconcile();
      for(let attempt=0;attempt<3&&!e.conflict&&!equal(current.current,e.base);attempt++){
        const snapshot=structuredClone(current.current);setSync('saving');
        try{const result=await api('save',snapshot,e.revision);if(!e.live)return;if(Array.isArray(result.history)){snapshot.history=result.history;current.current={...current.current,history:result.history};setData(current.current)}e.base=snapshot;e.revision=result.revision;cache()}
        catch(error){if(error.code!=='conflict')throw error;await reconcile()}
      }
      if(!e.conflict)setSync(equal(current.current,e.base)?'synced':'offline');
    }catch{if(e.live)setSync('offline')}
    finally{e.busy=false;if(e.live&&!e.conflict&&e.base&&equal(current.current,e.base))cache()}
  };
  useEffect(()=>{
    const e=engine.current;e.live=true;
    (async()=>{
      try{
        let meta;try{meta=JSON.parse(localStorage.getItem(storageKey+'Sync')||'null')}catch{}
        if(meta?.base){e.base=normalize(meta.base);e.revision=meta.revision||0}
        const remote=await api('get');if(!e.live)return;
        const incoming=normalize(remote.data||current.current);
        if(!e.base){e.base=incoming;e.revision=remote.revision||0;adopt(incoming)}
        else{const base=e.base,merged=mergePlanningStates(base,current.current,incoming);e.base=incoming;e.revision=remote.revision||0;
          if(merged.conflicts.length){e.conflict={base,remote:incoming,conflicts:merged.conflicts};setConflict(e.conflict);setSync('conflict');cache()}
          else adopt(merged.data)
        }
        // A missing server row must be created even if it matches the local seed.
        if(!remote.data&&!e.conflict){e.base=null;e.revision=0;const snapshot=structuredClone(current.current);const saved=await api('save',snapshot,0);if(Array.isArray(saved.history)){snapshot.history=saved.history;current.current={...current.current,history:saved.history};setData(current.current)}e.base=snapshot;e.revision=saved.revision;cache()}
        e.ready=true;if(!e.conflict)await flush();
      }catch{e.ready=true;if(e.live){if(!e.base)e.base=normalize({tasks:[],expenses:[]});cache();setSync('offline')}}
    })();
    const retry=()=>{clearTimeout(e.timer);flush()};window.addEventListener('online',retry);
    return()=>{e.live=false;clearTimeout(e.timer);window.removeEventListener('online',retry)};
  },[]);
  useEffect(()=>{
    const e=engine.current;if(!e.ready)return;cache();if(e.conflict)return;
    if(equal(data,e.base))return;setSync('saving');clearTimeout(e.timer);e.timer=setTimeout(flush,350);
  },[data]);
  const resolve=choices=>{const e=engine.current;if(!e.conflict)return;const merged=mergePlanningStates(e.conflict.base,current.current,e.conflict.remote,choices);e.conflict=null;setConflict(null);adopt(merged.data);flush()};
  const documentApi=async(action,payload)=>{
    const e=engine.current;if(e.busy||e.conflict||!equal(current.current,e.base))throw new Error('Aguarde a sincronização antes de alterar documentos.');
    e.busy=true;
    try{return await api(action,payload,e.revision)}
    catch(error){if(error.code==='conflict')await reconcile();throw error}
    finally{e.busy=false}
  };
  const acceptExpense=(expense,revision)=>{
    const e=engine.current,next={...current.current,expenses:current.current.expenses.map(x=>x.id===expense.id?expense:x)};
    e.base=next;e.revision=revision;adopt(next);setSync('synced');
  };
  return {sync,conflict,resolve,retry:flush,documentApi,acceptExpense};
}
