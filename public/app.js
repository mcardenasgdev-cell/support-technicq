const $ = id => document.getElementById(id);
const statusNames = {open:'Nuevo',working:'En atención',review:'Por confirmar',closed:'Resuelto'};
let state, selected, renderedTicket, renderedPhase, offset=0, pending=false, revision=0;
const drafts = new Map();
function notice(text) { $('notice').textContent=text; }
function element(tag,text,className) { const el=document.createElement(tag); el.textContent=text; if(className) el.className=className; return el; }
async function request(path,body) {
  const response=await fetch(`/api/${path}`,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok) throw Object.assign(new Error(data.error),{status:response.status});
  return data;
}
async function action(path,body) {
  if(pending) return;
  pending=true; revision++;
  try { state=await request(path,body); offset=state.now-Date.now(); notice(''); render(); return true; }
  catch(error) { notice(error.message); return false; }
  finally { pending=false; }
}
function current() { return state?.tickets.find(t=>t.id===selected); }
function scenarioFor(ticket) { return state.catalog.find(c=>c.id===ticket.scenario); }
function clock() {
  if(!state) return;
  const remaining=state.started?Math.max(0,600000-(Date.now()+offset-state.started)):600000;
  const seconds=Math.ceil(remaining/1000);
  $('clock').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
function render() {
  $('entry').hidden=true; $('workspace').hidden=false;
  $('room-label').textContent=`SALA ${state.code} · ${state.members.length} PARTICIPANTES`;
  $('role').textContent=`${state.me.name} · ${state.me.role==='support'?'Soporte':'Cliente'}`;
  $('round').textContent={lobby:'Esperando al equipo',first:'Ronda 1 · cambio a los 5 min',second:'Ronda 2 · roles intercambiados',finished:'Sesión terminada'}[state.phase];
  $('workspace-title').textContent=state.me.role==='support'?'Mesa de soporte':'Tu espacio de cliente';
  $('lobby').hidden=state.phase!=='lobby'; $('desk').hidden=state.phase==='lobby'; $('summary').hidden=state.phase!=='finished';
  if(renderedPhase && renderedPhase!==state.phase) {
    renderedTicket=null; selected=null; drafts.clear();
    $('source').value=''; $('control').replaceChildren();
    $('control-label').textContent=''; $('expected').textContent=''; $('brief-text').textContent='';
    if(state.phase==='second') notice('Cambio de turno. Tu rol se ha actualizado. Los tickets anteriores quedan en el historial.');
    $('new-dialog').close();
  }
  renderedPhase=state.phase;
  $('members').replaceChildren(...state.members.map(m=>element('span',`${m.name} · ${m.role==='support'?'Soporte':'Cliente'}`)));
  $('start').hidden=!state.host;
  $('waiting').textContent=state.host?'Tú decides cuándo iniciar, incluso si estás solo.':'El anfitrión iniciará la sesión.';
  if(state.phase==='finished') {
    $('results').textContent=`${state.results.closed} de ${state.results.total} tickets resueltos y confirmados.`;
    $('scores').replaceChildren(...state.results.scores.map(m=>element('span',`${m.name}: ${m.repaired} reparaciones · ${m.confirmed} confirmaciones`)));
  }
  $('new-ticket').hidden=state.me.role!=='client' || state.phase==='finished';
  const tickets=state.tickets.filter(t=>$('filter').value==='all'||($('filter').value==='closed'?t.status==='closed':t.status!=='closed'));
  $('count').textContent=String(tickets.length);
  $('ticket-list').replaceChildren(...tickets.map(t=>{
    const c=scenarioFor(t),button=element('button','',`ticket${t.id===selected?' selected':''}`);
    button.append(element('small',`#${String(t.number).padStart(3,'0')} · ${c.category} · ${c.priority}`),element('strong',c.title),element('small',`${statusNames[t.status]}${t.phase!==state.phase?' · Historial':''}`));
    button.onclick=()=>{selected=t.id;renderedTicket=null;render();};
    return button;
  }));
  if(!tickets.length) $('ticket-list').append(element('p','No hay tickets en esta vista.','muted'));
  const ticket=current();
  $('empty').hidden=!!ticket; $('ticket-detail').hidden=!ticket;
  $('chat-form').hidden=!ticket; $('bot').disabled=!ticket;
  if(ticket) renderTicket(ticket);
  else { $('messages').replaceChildren(); delete $('messages').dataset.signature; $('chat-hint').textContent='Selecciona un ticket.'; }
  clock();
}
function renderTicket(t) {
  const c=scenarioFor(t),support=state.me.role==='support';
  const active=t.phase===state.phase && state.phase!=='finished' && t.status!=='closed';
  const canRepair=active && support && t.assignee===state.me.id;
  $('ticket-number').textContent=`TICKET #${String(t.number).padStart(3,'0')} / ${c.category}`;
  $('ticket-status').textContent=statusNames[t.status]; $('ticket-title').textContent=c.title;
  $('ticket-description').textContent=c.client;
  $('brief-label').textContent=support?'Diagnóstico y resolución':'Detalles de tu solicitud';
  $('brief-text').textContent=support?c.support:'Explica el problema con tus propias palabras, responde las preguntas de soporte y comprueba la solución antes de confirmar.';
  $('reproduce').textContent=`Cómo reproducir: ${c.reproduce}`;
  $('lab-title').textContent=support?'Consola técnica':'Verificar solución';
  $('expected').hidden=!support;
  $('expected').textContent=support?`Criterio de aceptación: ${c.expected}`:'';
  $('claim').hidden=!active || !support || !!t.assignee;
  $('assignment').textContent=t.assignee?`Atiende: ${state.members.find(m=>m.id===t.assignee)?.name}`:'Sin agente asignado';
  $('editor-wrap').hidden=!support || c.mode!=='editor'; $('control-wrap').hidden=!support || c.mode!=='controls';
  $('source').readOnly=!canRepair; $('control').disabled=!canRepair;
  if(!support) {
    $('source').value=''; $('control').replaceChildren(); $('control-label').textContent='';
    if(renderedTicket!==t.id) $('preview-result').textContent='';
    renderedTicket=t.id;
  } else if(renderedTicket!==t.id) {
    $('source').value=drafts.get(t.id) ?? t.source;
    $('control-label').textContent=`Configuración: ${c.key}`;
    let value; try { value=JSON.parse(t.source)[c.key]; } catch { value=c.options?.[0]; }
    const options=c.options || [value];
    $('control').replaceChildren(...options.map(v=>{const option=element('option',String(v));option.value=JSON.stringify(v);return option;}));
    $('control').value=JSON.stringify(value);
    $('preview-result').textContent=''; renderedTicket=t.id;
  } else if(!canRepair) $('source').value=t.source;
  if(support && !canRepair && c.mode==='controls') {
    let value; try { value=JSON.parse(t.source)[c.key]; } catch { value='Configuración inválida'; }
    const option=element('option',String(value)); option.value=JSON.stringify(value);
    $('control').replaceChildren(option);
  }
  $('repair').hidden=!canRepair; $('reset').hidden=!canRepair;
  $('preview-state').textContent=['review','closed'].includes(t.status)?(support?'✓ Validación completada':'✓ Soporte aplicó una solución. Verifica el resultado.'):'! El incidente sigue presente';
  $('try').textContent=c.action;
  $('try').disabled=c.id===1 && !['review','closed'].includes(t.status);
  $('confirm').hidden=!active || support || t.client!==state.me.id || t.status!=='review';
  $('chat-hint').textContent='Conversación compartida entre cliente y soporte.';
  const previous=$('messages').dataset.signature;
  const signature=`${t.id}:${t.messages.length}`;
  if(previous!==signature) {
    $('messages').replaceChildren(...t.messages.map(m=>{
      const box=element('div','',`message${(m.who.startsWith('Asistente') || m.who.startsWith('Bot Caos'))?' bot-message':''}`);
      box.append(element('b',m.who),element('p',m.text));return box;
    }));
    $('messages').dataset.signature=signature; $('messages').scrollTop=$('messages').scrollHeight;
  }
  $('chat-form').hidden=!active; $('bot').disabled=!active;
}
$('entry-form').onsubmit=async event=>{
  event.preventDefault();
  const intent=event.submitter.value;
  await action(intent,{name:$('name').value,code:$('room-code').value});
};
$('copy-room').onclick=async()=>{
  if(!state) return;
  try {
    await navigator.clipboard.writeText(state.code);
    notice('Código de sala copiado. Ya puedes pegarlo y compartirlo.');
  } catch {
    notice(`No se pudo copiar automáticamente. Copia este código manualmente: ${state.code}`);
  }
};
$('start').onclick=()=>action('start',{});
$('filter').onchange=render;
$('source').oninput=()=>drafts.set(selected,$('source').value);
$('claim').onclick=()=>{renderedTicket=null;return action('claim',{ticket:selected});};
$('repair').onclick=()=>{
  const c=scenarioFor(current());
  const source=c.mode==='editor'?$('source').value:JSON.stringify({[c.key]:JSON.parse($('control').value)});
  action('repair',{ticket:selected,source});
};
$('reset').onclick=()=>{const c=scenarioFor(current());$('source').value=c.initial;drafts.set(selected,c.initial);$('control').value=JSON.stringify(JSON.parse(c.initial)[c.key]);};
$('try').onclick=()=>{const t=current();$('preview-result').textContent=['review','closed'].includes(t.status)?`✓ ${scenarioFor(t).action}: operación completada.`:`✕ ${scenarioFor(t).client}`;};
$('confirm').onclick=()=>action('confirm',{ticket:selected});
$('bot').onclick=()=>action('bot',{ticket:selected});
$('chat-form').onsubmit=async event=>{event.preventDefault();if(await action('chat',{ticket:selected,message:$('message').value})) $('message').value='';};
function selectScenario() { const c=state.catalog.find(c=>c.id===Number($('scenario').value));$('scenario-description').textContent=`${c.client} ${c.reproduce}`;$('report').value=c.client; }
$('new-ticket').onclick=()=>{
  $('scenario').replaceChildren(...state.catalog.map(c=>{const o=element('option',`${String(c.id).padStart(2,'0')} · ${c.category} — ${c.title}`);o.value=c.id;return o;}));
  selectScenario();$('new-dialog').showModal();
};
$('scenario').onchange=selectScenario;
$('close-dialog').onclick=()=>$('new-dialog').close();
$('ticket-form').onsubmit=async event=>{
  event.preventDefault();
  if(await action('ticket',{scenario:Number($('scenario').value),message:$('report').value})) {
    selected=state.tickets.at(-1).id;renderedTicket=null;$('new-dialog').close();render();
  }
};
$('again').onclick=()=>{state=null;selected=null;renderedTicket=null;renderedPhase=null;$('workspace').hidden=true;$('entry').hidden=false;$('name').focus();};
async function poll(initial=false) {
  if(pending || (!state && !initial)) return;
  const version=revision;
  try {
    const next=await request('state');
    if(pending || version!==revision) return;
    state=next;offset=state.now-Date.now();render();
    if($('notice').textContent.startsWith('Conexión')) notice('');
  } catch(error) {
    if(error.status===401 || error.status===404) {
      if(state){state=null;$('entry').hidden=false;$('workspace').hidden=true;notice('La sala caducó. Crea una nueva sesión.');}
    } else notice('Conexión interrumpida. Reintentando automáticamente; tus cambios escritos se conservan.');
  }
}
poll(true);setInterval(poll,2000);setInterval(clock,1000);
