const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {ecoSportUsbVehicle,readUsbPosition}=require('./j16-usb.cjs');
const {fleetTracking}=require('./tracking.cjs');
const {createStore}=require('./fleet-store.cjs');
const {createFipeService}=require('./fipe-service.cjs');
const {createPeopleRoutes}=require('./people-routes.cjs');
const {createAttendanceRoutes}=require('./attendance.cjs');
const {createBackupRoutes}=require('./backup.cjs');
function createApplication({directory=process.env.FROTA_DATA_DIR||path.join(__dirname,'data'),background=true}={}){
const root=path.join(__dirname,'dist'),port=Number(process.env.FROTA_PORT)||4174;
const store=createStore(directory);
const fipe=createFipeService({store,directory:directory,broadcast});
const streams=new Map();let accounts;
function broadcast(){for(const[res,entry]of streams){try{accounts.authorize(entry.req,{roles:['admin','manager']});res.write(`event: fleet\ndata: ${store.read().revision}\n\n`)}catch{res.end();streams.delete(res)}}}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value))}
async function readInput(req){const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>10*1024*1024){const e=Error('Arquivo excede 10 MB.');e.status=413;throw e}parts.push(part)}try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{throw Error('Dados inválidos.')}}
accounts=createPeopleRoutes({directory:directory,store,broadcast,json,readInput});
const backups=createBackupRoutes({directory,accounts,json,readInput});
const attendance=createAttendanceRoutes({directory,accounts,json,readInput});
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname.startsWith('/api/')){
   if(req.headers.origin&&req.headers.origin!==`${process.env.VERCEL?'https':'http'}://${req.headers.host}`)return json(res,403,{error:'Origem não autorizada.'});
   if(await accounts.handle(req,res,url))return;
   if(await attendance.handle(req,res,url))return;
   if(await backups.handle(req,res,url))return;
   if(url.pathname==='/api/today'&&req.method==='GET'){const access=accounts.authorize(req),school=attendance.school.view(access.user),point=accounts.people.today(access.user.id);const routes=school.routes.filter(r=>r.active&&r.weekdays.includes(new Date(school.today+'T12:00:00Z').getUTCDay())).map(r=>{const t=school.trips.find(t=>t.routeId===r.id);return {id:r.id,line:r.line,school:r.school,time:r.time,direction:r.direction,students:r.students.length,tripId:t?.id,status:t?.status||'waiting',marked:Object.keys(t?.marks||{}).length}});json(res,200,{date:school.today,routes,point,...(access.user.role==='admin'?{team:accounts.people.listUsers().filter(u=>u.active).map(u=>{const d=accounts.people.today(u.id).summary;return {id:u.id,name:u.name,status:d.status,hasSchedule:d.planned.configured,expectedMinutes:d.planned.minutes,recorded:d.original.length,review:d.anomalies.length>0||(!d.complete&&d.original.length>0)}})}:{})});return}

   const access=accounts.authorize(req,{roles:['admin','manager'],write:!['GET','HEAD'].includes(req.method)});
   if(url.pathname==='/api/tracking'&&req.method==='GET'){
    const vehicles=store.read().data.vehicles;
    const vehicle=vehicles.find(v=>v.id===url.searchParams.get('vehicle'));
    if(!vehicle)return json(res,404,{error:'Veículo não encontrado.'});
    if(process.env.TRACCAR_URL&&process.env.TRACCAR_TOKEN){
     const result=await fleetTracking([vehicle]);
     return json(res,200,result.vehicles[0]||{position:null});
    }
    if(process.env.J16_USB_TOKEN&&ecoSportUsbVehicle(vehicles)?.id===vehicle.id){
     const latest=await readUsbPosition();
     const position=latest?.position||null;
     return json(res,200,{source:'usb',live:!!position&&Date.now()-Date.parse(position.time)<60000,position});
    }
    return json(res,200,{position:null});
   }
   if(url.pathname==='/api/fipe/catalog'&&req.method==='GET')return json(res,200,await fipe.catalog(url.searchParams.get('path')||''));
   if(url.pathname==='/api/fipe/quote'&&req.method==='GET')return json(res,200,await fipe.quote(Object.fromEntries(['type','brandId','modelId','yearId'].map(k=>[k,url.searchParams.get(k)||'']))));
   if(url.pathname.startsWith('/api/fipe/')&&req.method==='POST'){
    const input=await readInput(req);if(typeof input.vehicleId!=='string'||input.vehicleId.length>100)throw Error('Veículo inválido.');let result;
    if(url.pathname==='/api/fipe/link')result=await fipe.link(input.vehicleId,input.selection,access.user.profileId||'');
    else if(url.pathname==='/api/fipe/refresh')result=await fipe.refreshDue(input.vehicleId,true);
    else if(url.pathname==='/api/fipe/unlink')result=fipe.unlink(input.vehicleId,access.user.profileId||'');
    else return json(res,404,{error:'Recurso não encontrado.'});
    return json(res,200,result);
   }
   if(url.pathname==='/api/events'&&req.method==='GET'&&process.env.VERCEL)return json(res,200,{polling:true});
   if(url.pathname==='/api/events'&&req.method==='GET'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});res.write(': conectado\n\n');streams.set(res,{req});req.on('close',()=>streams.delete(res));return}
   if(url.pathname==='/api/fleet'&&req.method==='GET'){const snapshot=store.read();if(req.headers['if-none-match']===`"${snapshot.revision}"`){res.writeHead(304,{'Cache-Control':'no-store'});return res.end()}res.setHeader('ETag',`"${snapshot.revision}"`);return json(res,200,snapshot)}
   if((url.pathname==='/api/fleet'&&req.method==='PUT')||(url.pathname==='/api/migrate'&&req.method==='POST')){
    const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>10*1024*1024){json(res,413,{error:'Arquivo excede 10 MB.'});return}parts.push(part)}
    let input;try{input=JSON.parse(Buffer.concat(parts).toString('utf8'))}catch{return json(res,400,{error:'Dados inválidos.'})}
    const actor=accounts.ensureProfile(access.user);if(url.pathname==='/api/fleet'){const profiles=store.read().data.profiles;input.data.profiles=profiles;if(input.base)input.base.profiles=profiles}const snapshot=url.pathname==='/api/migrate'?store.migrate(input):store.save(input,actor.profileId);json(res,200,snapshot);broadcast();return;
   }
   return json(res,404,{error:'Recurso não encontrado.'});
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end()}
  let name;try{name=decodeURIComponent(url.pathname)}catch{res.writeHead(400);return res.end('Invalid URL')}
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');res.end(req.method==='HEAD'?'':data)})
 }catch(error){console.error(error.message);if(!res.headersSent)json(res,error.status||400,{error:error.message})}
});
const timers=[];
if(background){timers.push(setInterval(()=>{for(const[res,entry]of streams){try{accounts.authorize(entry.req,{roles:['admin','manager']});res.write(': conectado\n\n')}catch{res.end();streams.delete(res)}}},20000));timers.push(setInterval(()=>{try{accounts.people.backup()}catch(e){console.error('Backup da equipe: '+e.message)}},30*60*1000));timers.push(setInterval(()=>fipe.refreshDue().catch(e=>console.error('FIPE: '+e.message)),30*60*1000));timers.push(setTimeout(()=>fipe.refreshDue().catch(e=>console.error('FIPE: '+e.message)),1500));timers.forEach(t=>t.unref())}
return {server,handler:server.listeners('request')[0],store,accounts,attendance,fipe,backups,close(){timers.forEach(clearTimeout);for(const[res]of streams)res.end();attendance.school.close();accounts.close()}};
}
module.exports={createApplication};
if(require.main===module){const app=createApplication(),port=Number(process.env.FROTA_PORT)||4174;app.server.listen(port,'0.0.0.0',()=>{console.log('Nova Alianca - frota, equipe e chamadas. Mantenha esta janela aberta.');console.log(`Local: http://127.0.0.1:${port}`);for(const ips of Object.values(os.networkInterfaces()))for(const ip of ips)if(ip.family==='IPv4'&&!ip.internal)console.log(`LAN: http://${ip.address}:${port}`)})}
