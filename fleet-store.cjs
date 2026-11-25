const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {RULES}=require('./dist/rules.js');
const requested=require('./dist/vehicle-registration.js');
const {validateOperations}=require('./operations-validation.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function validate(data){
 if(data?.version!==1||!Array.isArray(data.vehicles)||data.vehicles.length>2000)throw Error('Frota inválida.');
 const plates=new Set(),ids=new Set();
 for(const v of data.vehicles){
  if(!v||typeof v.id!=='string'||!v.id||ids.has(v.id)||!/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v.plate)||plates.has(v.plate)||typeof v.model!=='string'||!(v.km===null||(Number.isFinite(v.km)&&v.km>=0))||!v.documents||!v.services||!v.equipment||!Array.isArray(v.tires)||!Array.isArray(v.fuel)||!Array.isArray(v.history))throw Error('Cadastro de veículo inválido.');
  ids.add(v.id);plates.add(v.plate);
  validateOperations(v);for(const d of Object.values(v.documents)){if(!d||typeof d!=='object'||(d.applicability!==undefined&&!['applicable','not-applicable','unknown'].includes(d.applicability))||(d.applicability==='not-applicable'&&(typeof d.applicabilityReason!=='string'||d.applicabilityReason.trim().length<5||d.applicabilityReason.length>500)))throw Error('Confira a aplicabilidade e a justificativa dos documentos.');}
  for(const e of v.fuel)if(!e.id||typeof e.date!=='string'||!Number.isFinite(e.km)||!Number.isFinite(e.liters)||e.liters<=0||!Number.isFinite(e.total)||e.total<0||v.km==null||e.km>v.km)throw Error('Abastecimento inválido.');
 }
 const profiles=data.profiles??[];if(!Array.isArray(profiles)||profiles.length>100)throw Error('Lista de perfis inválida.');const profileIds=new Set();
 for(const p of profiles){if(!p||typeof p.id!=='string'||!p.id||profileIds.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>80||typeof p.title!=='string'||p.title.length>80||typeof p.photo!=='string'||p.photo.length>200000||(p.photo&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.photo)))throw Error('Perfil inválido.');profileIds.add(p.id)}
 return {version:1,demo:false,vehicles:clone(data.vehicles),profiles:clone(profiles)};
}
function initial(){return {version:1,demo:false,vehicles:requested.map(fields=>({id:crypto.randomUUID(),...fields,documents:{},services:{},tires:['Dianteiro esquerdo','Dianteiro direito','Traseiro esquerdo','Traseiro direito','Estepe'].map(position=>({position,serial:'',size:'',brand:'',km:null,date:''})),equipment:Object.fromEntries(RULES.equipment.map(x=>[x,'unknown'])),checked:'',fuel:[],history:[]}))}}
function threeWay(base,local,remote,where='frota'){
 if(same(local,base))return remote;if(same(remote,base)||same(local,remote))return local;
 if(/^frota\.vehicles\.[^.]+\.km$/.test(where)&&Number.isFinite(local)&&Number.isFinite(remote)&&local>=(base??0)&&remote>=(base??0))return Math.max(local,remote);
 if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)){
  const field=where.split('.').at(-1);const key=field==='vehicles'?'plate':['fuel','profiles','issues','cleanings'].includes(field)?'id':field==='tires'?'position':null;
  if(key){const bm=new Map(base.map(x=>[x[key],x])),lm=new Map(local.map(x=>[x[key],x])),rm=new Map(remote.map(x=>[x[key],x]));const out=[];for(const id of new Set([...rm.keys(),...lm.keys(),...bm.keys()])){const value=threeWay(bm.get(id),lm.get(id),rm.get(id),where+'.'+id);if(value!==undefined)out.push(value)}return out}
  if(field==='history'&&base.every(x=>local.some(y=>same(x,y)))&&base.every(x=>remote.some(y=>same(x,y))))return [...local.filter(x=>!base.some(y=>same(x,y))),...remote].filter((x,i,a)=>a.findIndex(y=>same(x,y))===i);
 }
 if(base&&local&&remote&&[base,local,remote].every(x=>typeof x==='object'&&!Array.isArray(x))){const out={};for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){if(['__proto__','constructor','prototype'].includes(key))throw Error('Campo inválido.');const value=threeWay(base[key],local[key],remote[key],where+'.'+key);if(value!==undefined)out[key]=value}return out}
 const err=Error('Este dado foi alterado em outro aparelho: '+where);err.status=409;throw err;
}
function createStore(directory){
 fs.mkdirSync(directory,{recursive:true});const file=path.join(directory,'fleet.json');let snapshot;
 if(fs.existsSync(file)){snapshot=JSON.parse(fs.readFileSync(file,'utf8'));snapshot.data=validate(snapshot.data);if(!Number.isInteger(snapshot.revision))throw Error('Revisão do banco inválida.')}else{snapshot={revision:1,data:validate(initial()),updatedAt:new Date().toISOString()};atomic(snapshot)}
 function atomic(value){const tmp=file+'.tmp';const fd=fs.openSync(tmp,'w');try{fs.writeFileSync(fd,JSON.stringify(value,null,2));fs.fsyncSync(fd)}finally{fs.closeSync(fd)}fs.renameSync(tmp,file)}
 function write(data){data=validate(data);if(same(data,snapshot.data))return read();const backups=path.join(directory,'backups');fs.mkdirSync(backups,{recursive:true});fs.writeFileSync(path.join(backups,`${Date.now()}-${crypto.randomUUID()}.json`),JSON.stringify(snapshot,null,2));const next={revision:snapshot.revision+1,data,updatedAt:new Date().toISOString()};atomic(next);snapshot=next;return read()}
 function read(){return {...clone(snapshot),capabilities:{profiles:true,actorHistory:true,brand:'Nova Aliança',accounts:true,timeclock:true}}}
 function save(input,actorId=''){const local=validate(input.data);if(!input.data.profiles)local.profiles=clone(snapshot.data.profiles);if(!Number.isInteger(input.revision))throw Error('Revisão não informada.');let next;if(input.revision===snapshot.revision)next=local;else{if(!input.base){const e=Error('A frota mudou. Atualize os dados antes de salvar.');e.status=409;throw e}const base=validate(input.base);if(!input.base.profiles)base.profiles=clone(snapshot.data.profiles);next=threeWay(base,local,snapshot.data)}
  const actor=next.profiles.find(p=>p.id===actorId);if(actor){for(const v of next.vehicles){const old=snapshot.data.vehicles.find(x=>x.plate===v.plate);if(!same(old,v)){v.updatedBy={id:actor.id,name:actor.name};v.updatedAt=new Date().toISOString()}for(const entry of v.history){if(!old?.history.some(h=>entry.id?h.id===entry.id:same(h,entry)))entry.recordedBy={id:actor.id,name:actor.name}}for(const key of ['fuel','issues','cleanings'])for(const entry of v[key]||[]){const previous=(old?.[key]||[]).find(e=>e.id===entry.id);if(!previous)entry.recordedBy={id:actor.id,name:actor.name};if(key==='issues'&&entry.status==='resolved'&&previous?.status!=='resolved')entry.resolvedBy={id:actor.id,name:actor.name}}}}
  return write(next)}
 function migrate(input){const local=validate(input.data);const archives=path.join(directory,'imports');fs.mkdirSync(archives,{recursive:true});fs.writeFileSync(path.join(archives,crypto.randomUUID()+'.json'),JSON.stringify(local,null,2));const data=clone(snapshot.data);let added=0,conflicts=0;
  function fill(target,source){for(const [key,value]of Object.entries(source)){if(['__proto__','constructor','prototype','id','plate','source'].includes(key))continue;const old=target[key];if(value===null||value===''||value===undefined)continue;if(key==='km'){target[key]=Math.max(old??0,value);continue}if(Array.isArray(value)){if(!Array.isArray(old))target[key]=clone(value);else if(key==='fuel'||key==='history'){for(const x of value)if(!old.some(y=>key==='fuel'?y.id===x.id:same(y,x)))old.push(clone(x))}else if(key==='tires'){for(const x of value){const t=old.find(y=>y.position===x.position);if(t)fill(t,x);else old.push(clone(x))}}continue}if(value&&typeof value==='object'){if(!old||typeof old!=='object')target[key]=clone(value);else fill(old,value);continue}if(old==null||old===''||old==='unknown')target[key]=value;else if(old!==value)conflicts++}}
  for(const v of local.vehicles){if(String(v.chassis).startsWith('9BMDEMO00')&&String(v.gearbox).startsWith('EXEMPLO-'))continue;const existing=data.vehicles.find(x=>x.plate===v.plate);if(!existing){if(data.vehicles.some(x=>x.id===v.id))v.id=crypto.randomUUID();data.vehicles.push(v);added++}else fill(existing,v)}
  return {...write(data),migration:{added,conflicts}};
 }
 return{read,save,migrate};
}
module.exports={createStore,validate,threeWay};
