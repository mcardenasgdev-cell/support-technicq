import http from 'node:http';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { catalog, validateRepair } from './catalog.js';
import { phaseFor, roleFor } from './game.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
function shortText(value, max = 600) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(400, `Introduce texto entre 1 y ${max} caracteres.`);
  return value.trim();
}
export function createApp({dbPath = ':memory:', origin = '', now = Date.now} = {}) {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS rooms(code TEXT PRIMARY KEY, expires INTEGER, data TEXT); CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, code TEXT, member TEXT, expires INTEGER);');
  const save = room => db.prepare('INSERT OR REPLACE INTO rooms VALUES(?,?,?)').run(room.code, room.expires, JSON.stringify(room));
  const get = code => {
    const row = db.prepare('SELECT data FROM rooms WHERE code=? AND expires>?').get(code, now());
    if (!row) fail(404, 'La sala no existe o ha caducado.');
    return JSON.parse(row.data);
  };
  const limits = new Map();
  const cleanup = () => {
    db.prepare('DELETE FROM rooms WHERE expires<=?').run(now());
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(now());
    for (const [key, entry] of limits) if (entry.until <= now()) limits.delete(key);
  };
  const timer = setInterval(cleanup, 60000); timer.unref();
  const files = new Map(['/','/app.js','/style.css'].map(path => [path, readFileSync(new URL(`./public/${path === '/' ? 'index.html' : path.slice(1)}`, import.meta.url))]));
  function snapshot(room, member) {
    const phase = phaseFor(room, now());
    const role = roleFor(room,member,now());
    const support = role === 'support';
    const closed = room.tickets.filter(t=>t.status==='closed');
    return {code:room.code, phase, now:now(), started:room.started, host:room.host === member.id,
      me:{...member,role},
      members:room.members.map(m => ({...m,role:roleFor(room,m,now())})),
      tickets:room.tickets.filter(t => support || t.client === member.id).map(t => {
        if (support) return {...t};
        const {id,number,scenario,client,phase,status,assignee,messages} = t;
        return {id,number,scenario,client,phase,status,assignee,messages};
      }),
      catalog:catalog.map(c => {
        if (support) { const {solution,...details}=c; return details; }
        const {id,category,title,client,reproduce,action,priority}=c;
        return {id,category,title,client,reproduce,action,priority};
      }),
      ...(phase==='finished' ? {results:{total:room.tickets.length,closed:closed.length,
        scores:room.members.map(m=>({name:m.name,repaired:closed.filter(t=>t.assignee===m.id).length,confirmed:closed.filter(t=>t.client===m.id).length}))}} : {})};
  }
  const server = http.createServer(async (req,res) => {
    const send = (status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(body)); };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    res.setHeader('Cache-Control','no-store');
    try {
      const path = new URL(req.url,'http://localhost').pathname;
      if (req.method === 'GET' && files.has(path)) {
        res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8');
        return res.end(files.get(path));
      }
      if (path === '/favicon.ico') { res.writeHead(204); return res.end(); }
      if (req.method === 'GET' && path === '/api/health') { db.prepare('SELECT 1').get(); return send(200,{ok:true}); }
      if (!['GET','POST'].includes(req.method)) fail(405,'Método no permitido.');
      let body = {};
      if (req.method === 'POST') {
        const expected = origin || `http://${req.headers.host}`;
        if (req.headers.origin && req.headers.origin !== expected) fail(403,'Origen no permitido.');
        if (req.headers['sec-fetch-site'] === 'cross-site') fail(403,'Origen no permitido.');
        if (!req.headers['content-type']?.startsWith('application/json')) fail(415,'Se requiere JSON.');
        const ip = origin ? req.headers['x-real-ip'] || req.socket.remoteAddress : req.socket.remoteAddress;
        const entry = limits.get(ip) || {count:0,until:now()+60000};
        if (entry.until < now()) { entry.count=0; entry.until=now()+60000; }
        entry.count++; limits.set(ip,entry);
        if (entry.count > 240) fail(429,'Demasiadas acciones. Espera un minuto.');
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw)>10000) fail(413,'Solicitud demasiado grande.'); }
        try { body=JSON.parse(raw); } catch { fail(400,'JSON inválido.'); }
        if (!body || Array.isArray(body) || typeof body !== 'object') fail(400,'Objeto inválido.');
      }
      if (req.method === 'POST' && ['/api/create','/api/join'].includes(path)) {
        const name = shortText(body.name,30);
        let room;
        if (path === '/api/create') {
          cleanup();
          if (db.prepare('SELECT count(*) AS n FROM rooms').get().n >= 300) fail(429,'Se alcanzó el límite de salas activas.');
          room={code:randomBytes(5).toString('hex').toUpperCase(),expires:now()+86400000,started:null,members:[],tickets:[]};
        } else room=get(shortText(body.code,10).toUpperCase());
        if (phaseFor(room,now()) === 'finished') fail(409,'La sesión terminó. Crea otra sala para comenzar de nuevo.');
        if (room.members.length>=40) fail(409,'Sala llena (40 participantes).');
        const member={id:randomUUID(),name,team:room.members.length%2};
        room.members.push(member); room.host ||= member.id; save(room);
        const token=randomBytes(32).toString('hex');
        db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hash(token),room.code,member.id,room.expires);
        res.setHeader('Set-Cookie',`support_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${origin.startsWith('https:')?'; Secure':''}`);
        return send(200,snapshot(room,member));
      }
      const token = /(?:^|; )support_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
      const session = token && db.prepare('SELECT * FROM sessions WHERE token=? AND expires>?').get(hash(token),now());
      if (!session) fail(401,'Entra a una sala para comenzar.');
      const room=get(session.code), member=room.members.find(m=>m.id===session.member);
      if (req.method === 'GET' && path === '/api/state') return send(200,snapshot(room,member));
      if (req.method !== 'POST') fail(404,'Ruta no encontrada.');
      if (path === '/api/start') {
        if (room.host!==member.id) fail(403,'Solo el anfitrión inicia la sesión.');
        if (room.started) fail(409,'La sesión ya comenzó.');
        room.started=now();
      } else {
        const phase=phaseFor(room,now()), role=roleFor(room,member,now());
        if (!['first','second'].includes(phase)) fail(409,'La sesión no está activa.');
        if (path === '/api/ticket') {
          if (role !== 'client') fail(403,'Solo los clientes crean tickets.');
          const scenario=catalog.find(c=>c.id===body.scenario);
          if (!scenario) fail(400,'Incidente inválido.');
          if (room.tickets.filter(t=>t.client===member.id && t.phase===phase && t.status!=='closed').length>=3) fail(409,'Resuelve tus tres tickets abiertos antes de crear otro.');
          if (room.tickets.length>=120) fail(409,'Límite de tickets alcanzado.');
          room.tickets.push({id:randomUUID(),number:room.tickets.length+1,scenario:scenario.id,client:member.id,phase,status:'open',source:scenario.initial,assignee:null,attempts:0,messages:[{who:member.name,text:shortText(body.message),at:now()}]});
        } else {
          const ticket=room.tickets.find(t=>t.id===body.ticket);
          if (!ticket) fail(404,'Ticket no encontrado.');
          if (ticket.phase!==phase) fail(409,'Este ticket pertenece a la ronda anterior.');
          if (role==='client' && ticket.client!==member.id) fail(403,'Este ticket pertenece a otro cliente.');
          if (ticket.status==='closed') fail(409,'El ticket ya está cerrado.');
          const add = (who,text) => {
            if (ticket.messages.length>=100) fail(409,'Límite de mensajes alcanzado en este ticket.');
            ticket.messages.push({who,text,at:now()});
          };
          if (path==='/api/chat') add(member.name,shortText(body.message));
          else if (path==='/api/bot') {
            const replies=['Mi diagnóstico: el botón necesita vacaciones en la nube de algodón.','El DNS está triste. Ordena tus pestañas por signo zodiacal.','Para corregir el correo, pregúntale la hora a una impresora imaginaria.','Error 418: el servidor cree que es una tostadora submarina.','La solución está en el manual de jardinería de los píxeles.'];
            add('Asistente',replies[Math.floor(Math.random()*replies.length)]);
          } else if (path==='/api/claim') {
            if (role!=='support') fail(403,'Solo soporte puede tomar tickets.');
            if (ticket.assignee && ticket.assignee!==member.id) fail(409,'Otro agente está atendiendo este ticket.');
            ticket.assignee=member.id; ticket.status='working';
          } else if (path==='/api/repair') {
            if (role!=='support' || ticket.assignee!==member.id) fail(403,'Toma el ticket antes de repararlo.');
            ticket.source=shortText(body.source,3000); ticket.attempts++;
            const scenario=catalog.find(c=>c.id===ticket.scenario);
            ticket.status=validateRepair(scenario,ticket.source)?'review':'working';
            add('Sistema',ticket.status==='review'?'Validación correcta. Pendiente de confirmación del cliente.':'La validación falló. Revisa el criterio de aceptación.');
          } else if (path==='/api/confirm') {
            if (role!=='client' || ticket.client!==member.id) fail(403,'Solo el cliente del ticket puede confirmar.');
            if (ticket.status!=='review') fail(409,'Primero debe completarse la validación técnica.');
            ticket.status='closed'; add(member.name,'Probado y confirmado. Ticket resuelto.');
          } else fail(404,'Ruta no encontrada.');
        }
      }
      save(room); send(200,snapshot(room,member));
    } catch(error) {
      if (!error.status) console.error('request_failed',error.code || error.name);
      if (!res.headersSent) send(error.status || 500,{error:error.status?error.message:'Error interno. Intenta de nuevo.'});
      else res.end();
    }
  });
  server.requestTimeout=15000; server.headersTimeout=10000;
  server.once('close',()=>{clearInterval(timer);db.close();});
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync('data',{recursive:true});
  const port=Number(process.env.PORT || 8091);
  const app=createApp({dbPath:process.env.DB_PATH || 'data/support.sqlite',origin:process.env.PUBLIC_ORIGIN || ''});
  app.listen(port,process.env.HOST || '127.0.0.1',()=>console.log(`Technicq Support: http://localhost:${port}`));
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>app.close());
}
