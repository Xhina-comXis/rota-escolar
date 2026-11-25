const fs=require('node:fs'),path=require('node:path');
const BASE='https://fipe.parallelum.com.br/api/v2/';
const monthKey=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(date).slice(0,7);
const months=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function referenceKey(label){const parts=String(label).toLowerCase().match(/([a-zç]+)(?:\s+de\s+|\/)(\d{4})/);const month=parts?months.indexOf(parts[1]):-1;return month<0?'':parts[2]+'-'+String(month+1).padStart(2,'0')}
const selectionKey=s=>[s?.type,s?.brandId,s?.modelId,s?.yearId].join('/');
function validSelection(s){return s&&['cars','trucks','motorcycles'].includes(s.type)&&/^\d{1,6}$/.test(s.brandId)&&/^\d{1,8}$/.test(s.modelId)&&/^\d{4,5}-[1-6]$/.test(s.yearId)}
function allowedPath(value){return value==='references'||/^(cars|trucks|motorcycles)\/brands(?:\/\d{1,6}\/models(?:\/\d{1,8}\/years(?:\/\d{4,5}-[1-6])?)?)?$/.test(value)}
function createFipeService({store,directory,broadcast=()=>{},fetchImpl=fetch,now=()=>new Date()}){
 const file=path.join(directory,'fipe-cache.json');let cache={entries:{},usage:{}};if(fs.existsSync(file)){try{cache=JSON.parse(fs.readFileSync(file,'utf8'))}catch{}}
 const pending=new Map();let refreshRunning=false;
 function persist(){const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(cache));fs.renameSync(tmp,file)}
 async function api(relative,reference){
  if(!allowedPath(relative))throw Error('Consulta FIPE inválida.');
  const key=monthKey(now())+'/'+relative+(reference?'?reference='+reference:'');
  const existing=cache.entries[key];if(existing&&Date.parse(existing.expires)>now().getTime())return structuredClone(existing.data);
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{const day=now().toISOString().slice(0,10);if((cache.usage[day]||0)>=450)throw Error('Limite diário de consultas FIPE atingido. Tente amanhã.');cache.usage[day]=(cache.usage[day]||0)+1;
   const response=await fetchImpl(BASE+relative+(reference?'?reference='+encodeURIComponent(reference):''),{signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw Error(response.status===429?'O serviço FIPE limitou as consultas. Tente mais tarde.':'Consulta FIPE indisponível ('+response.status+').');
   const data=await response.json();if(data?.error)throw Error('A referência FIPE não foi encontrada.');
   cache.entries[key]={data,expires:new Date(now().getTime()+(relative==='references'?6:24)*3600000).toISOString()};persist();return structuredClone(data);
  })();pending.set(key,task);try{return await task}finally{pending.delete(key)}
 }
 async function quote(selection){
  if(!validSelection(selection))throw Error('Selecione tipo, marca, versão e ano da FIPE.');
  const refs=await api('references');const ref=refs.filter(r=>referenceKey(r.month)&&referenceKey(r.month)<=monthKey(now())).sort((a,b)=>Number(b.code)-Number(a.code))[0];if(!ref)throw Error('Referência FIPE não disponível.');
  const detail=await api(`${selection.type}/brands/${selection.brandId}/models/${selection.modelId}/years/${selection.yearId}`,ref.code);
  if(typeof detail.price!=='string'||!/^\d{6}-\d$/.test(detail.codeFipe)||Number(detail.modelYear)!==Number(selection.yearId.split('-')[0]))throw Error('Resposta FIPE incompleta ou incompatível com o ano selecionado.');
  return {type:selection.type,brandId:selection.brandId,modelId:selection.modelId,yearId:selection.yearId,code:detail.codeFipe,brand:detail.brand,model:detail.model,modelYear:detail.modelYear,fuel:detail.fuel,price:detail.price,referenceMonth:detail.referenceMonth,referenceKey:referenceKey(detail.referenceMonth),referenceCode:String(ref.code),checkedAt:now().toISOString(),lastAttemptAt:now().toISOString(),lastError:'',source:'FIPE API / Parallelum'};
 }
 function writeVehicle(id,update,actorId=''){const snapshot=store.read(),data=structuredClone(snapshot.data),v=data.vehicles.find(v=>v.id===id);if(!v)throw Error('Veículo não encontrado.');update(v);const result=store.save({revision:snapshot.revision,base:snapshot.data,data},actorId);broadcast();return result}
 async function link(id,selection,actorId=''){
  if(!validSelection(selection))throw Error('Selecione tipo, marca, versão e ano da FIPE.');
  const before=store.read().data.vehicles.find(v=>v.id===id);if(!before)throw Error('Veículo não encontrado.');if(before.year&&Number(before.year)!==Number(selection.yearId?.split('-')[0]))throw Error('O ano/modelo da FIPE precisa corresponder ao do veículo.');
  const detail=await quote(selection);return writeVehicle(id,v=>{if(v.year&&Number(v.year)!==detail.modelYear)throw Error('O cadastro foi alterado. Confira o ano/modelo.');v.fipe=detail;v.history.unshift({id:require('node:crypto').randomUUID(),date:now().toISOString().slice(0,10),text:'Referência FIPE vinculada: '+detail.code+' · '+detail.model+' · '+detail.modelYear,system:'fipe-link'})},actorId);
 }
 async function refreshVehicle(id,force=false){const v=store.read().data.vehicles.find(v=>v.id===id);if(!v?.fipe)return;const old=v.fipe,key=selectionKey(old);if(!force&&(old.referenceKey===monthKey(now())||now()-new Date(old.lastAttemptAt||0)<6*3600000))return 'skipped';
  try{const detail=await quote(old);writeVehicle(id,current=>{if(selectionKey(current.fipe)===key)current.fipe={...current.fipe,...detail}});return detail.referenceKey===monthKey(now())?'updated':'pending'}catch(e){writeVehicle(id,current=>{if(selectionKey(current.fipe)===key)current.fipe={...current.fipe,lastAttemptAt:now().toISOString(),lastError:e.message}});return 'failed'}
 }
 async function refreshDue(id,force=false,{budgetMs=20000}={}){if(refreshRunning)throw Error('A atualização FIPE já está em andamento.');refreshRunning=true;try{const started=Date.now(),result={updated:0,failed:0,pending:0,skipped:0,remaining:0},vehicles=store.read().data.vehicles.filter(v=>v.fipe&&(!id||v.id===id));for(let i=0;i<vehicles.length;i++){if(Date.now()-started>=budgetMs){result.remaining=vehicles.slice(i).filter(v=>force||v.fipe.referenceKey!==monthKey(now())).length;break}const outcome=await refreshVehicle(vehicles[i].id,force);result[outcome||'skipped']++}return {...store.read(),fipeRefresh:result}}finally{refreshRunning=false}}
 function unlink(id,actorId=''){return writeVehicle(id,v=>{if(!v.fipe)return;const old=v.fipe;delete v.fipe;v.history.unshift({id:require('node:crypto').randomUUID(),date:now().toISOString().slice(0,10),text:'Vínculo FIPE removido: '+old.code+' · '+old.model+'.',system:'fipe-unlink'})},actorId)}
 return {catalog:api,quote,link,unlink,refreshDue};
}
module.exports={createFipeService,monthKey,referenceKey,validSelection,allowedPath};
