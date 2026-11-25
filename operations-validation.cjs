const {dateOnly}=require('./dist/rules.js');
function text(value,max=500){return typeof value==='string'&&value.length<=max}
function date(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value))return false;const day=value.slice(0,10);const d=new Date(day+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===day&&day<=dateOnly()&&(!value.includes('T')||(+value.slice(11,13)<24&&+value.slice(14,16)<60))}
function fail(message){throw Error(message)}
function validateOperations(v){
 if(v.capacity!==undefined&&v.capacity!==null&&v.capacity!==''&&(!Number.isInteger(v.capacity)||v.capacity<1||v.capacity>200))fail('Capacidade inválida. Informe a quantidade de lugares.');
 if(v.capacityNote!==undefined&&!text(v.capacityNote,500))fail('Observação da capacidade inválida.');
 if(v.operating){const o=v.operating;if(!['running','stopped','workshop'].includes(o.status)||!date(o.since)||!text(o.location,150)||!text(o.notes,1000))fail('Situação de operação inválida.')}
 if(v.toll){const t=v.toll;if(!['yes','no','unknown'].includes(t.present)||!text(t.provider,80)||!text(t.notes,500)||(t.present==='yes'&&!t.provider.trim()))fail('Cadastro de pedágio automático inválido.')}
 for(const key of ['issues','cleanings']){const entries=v[key];if(entries===undefined)continue;if(!Array.isArray(entries)||entries.length>5000)fail('Registros de rotina inválidos.');const ids=new Set();for(const e of entries){if(!e||!text(e.id,100)||!e.id||ids.has(e.id)||!date(e.date))fail('Registro de rotina inválido.');ids.add(e.id);
  if(key==='issues'){if(!text(e.title,120)||!e.title.trim()||!text(e.description,2000)||!['attention','urgent'].includes(e.severity)||!['open','resolved'].includes(e.status))fail('Ocorrência inválida.');if(e.status==='resolved'&&(!date(e.resolvedOn)||e.resolvedOn.slice(0,10)<e.date.slice(0,10)||!text(e.resolution,2000)||!e.resolution.trim()))fail('Resolução da ocorrência inválida.')}
  else if(!['complete','external','internal','other'].includes(e.type)||!text(e.place,150)||!text(e.performedBy,150)||!e.performedBy.trim()||!text(e.notes,1000)||(e.cost!==null&&(!Number.isFinite(e.cost)||e.cost<0)))fail('Registro de limpeza inválido.');
 }}
 if(v.fipe){const f=v.fipe;if(!['cars','trucks','motorcycles'].includes(f.type)||!/^\d+$/.test(f.brandId)||!/^\d+$/.test(f.modelId)||!/^\d{4,5}-\d+$/.test(f.yearId))fail('Vínculo FIPE inválido.');if(f.price!==undefined&&!text(f.price,80))fail('Valor FIPE inválido.')}
}
module.exports={validateOperations};
