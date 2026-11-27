/* Regras de negócio. Dados de identificação não têm edição pela interface.
 * Intervalos abaixo são operacionais, fornecidos/inferidos do briefing;
 * não representam exigências legais. Confirmar vistoria, seguro e licenciamento.
 */
const RULES = Object.freeze({warningDays:30,warningKm:1000,oilKm:9000,tireKm:40000,preventiveDays:90,
  documents:[{key:'inspection',name:'Vistoria / semestral',months:6},{key:'license',name:'Licenciamento',months:12},{key:'insurance',name:'Seguro',months:12},{key:'tachograph',name:'Cronotacógrafo',months:0},{key:'extinguisher',name:'Extintor',months:0}],
  services:[{key:'oil',name:'Óleo e filtro',km:9000},{key:'preventive',name:'Manutenção preventiva',days:90},{key:'grease',name:'Engraxamento'},{key:'alignment',name:'Alinhamento'},{key:'springs',name:'Serviço no moleiro'},{key:'electrical',name:'Revisão elétrica'}],
  equipment:['Câmera de ré','Kit de emergência','Estepe','Macaco','Chave de roda','Limpador de para-brisa','Esguicho de água','Desembaçador']
});
function dateOnly(d=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(d)}
function dateObj(s){return new Date(s+'T12:00:00')}
function addDate(s,n,unit='days'){const d=dateObj(s);if(unit==='months'){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last))}else d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function daysUntil(s,today=dateOnly()){return Math.round((dateObj(s)-dateObj(today))/86400000)}
function fuelMetrics(entries){let base=null,liters=0,distance=0,totalLiters=0,last=null;for(const e of [...entries].sort((a,b)=>a.km-b.km)){if(base)liters+=e.liters;if(e.full){if(base&&e.km>base.km&&liters>0){distance+=e.km-base.km;totalLiters+=liters;last=(e.km-base.km)/liters}base=e;liters=0}}return{average:totalLiters?distance/totalLiters:null,last}}
function vehicleAlerts(v,today=dateOnly()){
 const a=[]; const push=(title,level,detail,section)=>a.push({title,level,detail,section,vehicle:v.id});
 if(!v.model)push('Modelo','pending','Modelo não informado na planilha','overview');
 for(const issue of v.importIssues||[]){if(issue.field==='plate'&&!v.plateReviewConfirmed)push('Confirmar placa','pending',issue.message,'overview')}
 if(v.km==null)push('Quilometragem','pending','Hodômetro ainda não informado','overview');
 for(const issue of v.issues||[])if(issue.status==='open')push('Problema · '+issue.title,issue.severity==='urgent'?'red':'yellow',issue.description||'Ocorrência em aberto','maintenance');
 for(const rule of RULES.documents){const d=v.documents[rule.key];if(d?.applicability==='not-applicable')continue;if(!d||!d.due){push(rule.name,'pending',d?.status==='invalid'?'Data inválida na planilha: '+d.rawValue:d?.status==='uncertain'?'Data da fotografia a confirmar':d?.present==='no'?'Não possui • conferir necessidade':'Validade não informada','documents');continue}const left=daysUntil(d.due,today);if(left<0)push(rule.name,'red',`Venceu há ${-left} dia(s)`,'documents');else if(left<=RULES.warningDays)push(rule.name,'yellow',left===0?'Vence hoje':`Vence em ${left} dia(s)`,'documents')}
 for(const rule of RULES.services){const s=v.services[rule.key];if(rule.km){if(s?.km==null||v.km==null){push(rule.name,'pending',s?.km==null?'Última troca não informada':'Hodômetro atual não informado','maintenance');continue}const left=s.km+rule.km-v.km;if(left<=RULES.warningKm)push(rule.name,left<=0?'red':'yellow',left<0?`${-left} km além do intervalo`:left===0?'Troca devida agora':`Trocar em ${left} km`,'maintenance')}
 if(rule.days){if(!s?.date){push(rule.name,'pending','Última manutenção não informada','maintenance');continue}const left=daysUntil(addDate(s.date,rule.days),today);if(left<=RULES.warningDays)push(rule.name,left<0?'red':'yellow',left<0?`Atrasada há ${-left} dia(s)`:`Em ${left} dia(s)`,'maintenance')}}
 for(const t of v.tires){if(t.km==null||!t.serial||v.km==null){push(`Pneu · ${t.position}`,'pending','Cadastro incompleto','tires');continue}const left=t.km+RULES.tireKm-v.km;if(left<=RULES.warningKm)push(`Pneu · ${t.position}`,left<=0?'red':'yellow',left<=0?'Intervalo de troca atingido':`Trocar em ${left} km`,'tires')}
 for(const [name,status] of Object.entries(v.equipment)){if(status==='bad')push(name,'red','Problema identificado','equipment');else if(v.checked&&(status==='no'||status==='unknown'))push(name,'pending',status==='no'?'Não possui • conferir necessidade':'Funcionamento não conferido','equipment')}
 if(!v.checked)push('Checklist de equipamentos','pending','Conferência ainda não registrada','equipment');return a;
}
function vehicleStatus(v){const a=vehicleAlerts(v);return a.some(x=>x.level==='red')?'red':a.some(x=>x.level==='yellow')?'yellow':a.some(x=>x.level==='pending')?'pending':'green'}
if(typeof module!=='undefined')module.exports={RULES,dateOnly,addDate,daysUntil,fuelMetrics,vehicleAlerts,vehicleStatus};
