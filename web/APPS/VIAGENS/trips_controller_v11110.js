/* AF+ 11.11.0 — Viagens estável 4/4
   Controlador próprio para Viagens, Roteiro, Reservas, Despesas e Checklist.
*/
(function(){
  const FILE=FILES.trips;
  const yes=v=>['sim','true','1','yes'].includes(String(v??'').trim().toLowerCase());
  const low=v=>String(v??'').trim().toLowerCase();
  const n=v=>Number(String(v??'').replace(',','.'))||0;
  const iso=v=>String(v||'').slice(0,10);
  const money=v=>`R$ ${fmt(n(v))}`;
  const dt=v=>v?brDate(iso(v)):'—';
  const nowISO=()=>new Date().toISOString();
  const todayISO=()=>new Date().toISOString().slice(0,10);
  const pill=t=>`<span class="af-pill soft">${esc(t||'—')}</span>`;
  const empty=(title,text)=>`<div class="af-empty"><strong>${esc(title)}</strong><span>${esc(text)}</span></div>`;

  state.tripTab=state.tripTab||'dashboard';
  state.tripSelectedStable=state.tripSelectedStable||'';
  state.tripSearch=state.tripSearch||'';
  state.tripShowArchived=state.tripShowArchived||false;

  const sheetHeaders=name=>(rows(FILE,name)[0]||[]).map(String);
  const tripRowsAll=()=>objRows(FILE,'Viagens');
  const routeRows=()=>objRows(FILE,'Roteiro');
  const reservationRows=()=>objRows(FILE,'Reservas');
  const expenseRows=()=>objRows(FILE,'Despesas');
  const checklistRows=()=>objRows(FILE,'Checklist');
  const tripById=id=>tripRowsAll().find(x=>String(x.id)===String(id));
  const activeTrips=()=>tripRowsAll().filter(x=>state.tripShowArchived?yes(x.archived):!yes(x.archived));
  const linked=(name,id)=>objRows(FILE,name).filter(x=>String(x.tripId)===String(id));
  const sum=(arr,key)=>arr.reduce((a,x)=>a+n(x[key]),0);

  function filteredTrips(){
    const q=low(state.tripSearch);
    let list=activeTrips();
    if(q) list=list.filter(x=>`${x.name||''} ${x.destination||''} ${x.status||''} ${x.lodging||''} ${x.mainTransport||''}`.toLowerCase().includes(q));
    return list.sort((a,b)=>String(a.startDate||'9999-12-31').localeCompare(String(b.startDate||'9999-12-31')));
  }
  function tripCard(v){
    const expenses=linked('Despesas',v.id),checks=linked('Checklist',v.id),done=checks.filter(x=>yes(x.done)).length;
    return `<article class="card"><div class="af-row-between"><div><span class="body-kicker">${esc(v.destination||'VIAGEM')}</span><h3>${esc(v.name||v.destination||'Sem nome')}</h3></div>${pill(v.status||'Planejando')}</div>
      <p>${dt(v.startDate)} → ${dt(v.endDate)}</p><div class="muted">${esc([v.lodging,v.mainTransport].filter(Boolean).join(' • ')||'Sem detalhes')}</div>
      <div class="overview-line"><strong>Gasto</strong><span>${money(sum(expenses,'amount'))}${v.budget?` de ${money(v.budget)}`:''}</span></div>
      <div class="overview-line"><strong>Checklist</strong><span>${checks.length?`${done}/${checks.length}`:'—'}</span></div>
      <div class="actions"><button class="btn small primary" data-trip-open-stable="${esc(v.id)}">Abrir</button><button class="btn small" data-trip-edit-stable="${esc(v.id)}">Editar</button><button class="btn small" data-trip-archive-stable="${esc(v.id)}">${yes(v.archived)?'Restaurar':'Arquivar'}</button></div></article>`;
  }
  function dashboard(){
    const list=activeTrips(),t=todayISO(),upcoming=list.filter(x=>String(x.endDate||'9999-12-31')>=t&&!low(x.status).includes('concl')).sort((a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')));
    const next=upcoming[0],expenses=expenseRows(),checks=checklistRows(),done=checks.filter(x=>yes(x.done)).length;
    return `<div class="grid smart-kpis">${card('Viagens',list.length,'ativas')}${card('Próximas',upcoming.length,'planejadas')}${card('Reservas',reservationRows().length,'registros')}${card('Despesas',money(sum(expenses,'amount')),'registradas')}${card('Checklist',checks.length?`${done}/${checks.length}`:'—','concluído')}</div>
      ${next?`<section class="af-trip-hero"><div><span class="body-kicker">PRÓXIMA VIAGEM</span><h2>${esc(next.name||next.destination)}</h2><p>${esc(next.destination||'')} • ${dt(next.startDate)} → ${dt(next.endDate)}</p><div class="actions"><button class="btn primary" data-trip-open-stable="${esc(next.id)}">Abrir viagem</button><button class="btn" data-trip-edit-stable="${esc(next.id)}">Editar</button></div></div>${pill(next.status||'Planejando')}</section>`:empty('Nenhuma próxima viagem','Cadastre uma viagem para organizar roteiro, reservas, despesas e checklist.')}
      <div class="sectiontitle"><div><span class="body-kicker">VIAGENS</span><h3>Planejamento</h3></div><button class="btn primary" id="tripNewStable">+ Nova viagem</button></div><div class="af-card-grid">${upcoming.slice(1).map(tripCard).join('')}</div>`;
  }
  function tripList(){const list=filteredTrips();return `<div class="module-toolbar"><div class="foodfilters"><input id="tripSearchStable" value="${esc(state.tripSearch)}" placeholder="Buscar viagem, destino ou hospedagem"></div><div class="actions"><button class="btn ${state.tripShowArchived?'primary':''}" id="tripArchivedStable">Arquivados</button><button class="btn primary" id="tripNewStable">+ Nova viagem</button></div></div><div class="af-card-grid">${list.map(tripCard).join('')||empty('Nenhuma viagem','Crie sua primeira viagem.')}</div>`}
  function detail(id){
    const v=tripById(id);if(!v)return tripList();const route=linked('Roteiro',id).sort((a,b)=>`${a.date||''} ${a.time||''}`.localeCompare(`${b.date||''} ${b.time||''}`)),res=linked('Reservas',id),exp=linked('Despesas',id),checks=linked('Checklist',id),spent=sum(exp,'amount'),done=checks.filter(x=>yes(x.done)).length;
    const budget=n(v.budget),remain=budget?budget-spent:null;
    return `<div class="af-trip-hero"><div><button class="btn small" id="tripBackStable">← Viagens</button><span class="body-kicker">${esc(v.destination||'VIAGEM')}</span><h2>${esc(v.name||v.destination)}</h2><p>${dt(v.startDate)} → ${dt(v.endDate)}</p><div class="muted">${esc([v.lodging,v.mainTransport].filter(Boolean).join(' • '))}</div></div>${pill(v.status||'')}</div>
      <div class="grid smart-kpis">${card('Orçamento',budget?money(budget):'—')}${card('Gasto',money(spent),budget?`${Math.round(spent/budget*100)}% do orçamento`:'')}${card('Saldo',remain===null?'—':money(remain))}${card('Reservas',res.length)}${card('Checklist',checks.length?`${done}/${checks.length}`:'—')}</div>
      <div class="af-trip-columns"><section class="card"><div class="sectiontitle"><h3>Roteiro</h3><button class="btn small" data-trip-add-stable="Roteiro" data-trip-id="${esc(id)}">+ Item</button></div>${route.map(r=>`<div class="af-timeline"><b>${dt(r.date)} ${esc(r.time||'')}</b><div><strong>${esc(r.place||'')}</strong><small>${esc([r.category,r.address].filter(Boolean).join(' • '))}</small></div><button class="btn small" data-trip-row-edit="Roteiro" data-row-id="${esc(r.id)}">Editar</button></div>`).join('')||'<span class="muted">Roteiro vazio.</span>'}</section>
      <section><div class="card"><div class="sectiontitle"><h3>Reservas</h3><button class="btn small" data-trip-add-stable="Reservas" data-trip-id="${esc(id)}">+ Reserva</button></div>${res.map(r=>`<div class="overview-line"><strong>${esc(r.type||'Reserva')}</strong><span>${esc(r.provider||'')} ${r.confirmation?`• ${esc(r.confirmation)}`:''}</span><button class="btn small" data-trip-row-edit="Reservas" data-row-id="${esc(r.id)}">Editar</button></div>`).join('')||'<span class="muted">Sem reservas.</span>'}</div>
      <div class="card"><div class="sectiontitle"><h3>Checklist</h3><button class="btn small" data-trip-add-stable="Checklist" data-trip-id="${esc(id)}">+ Item</button></div>${checks.map(r=>`<div class="overview-line"><strong>${yes(r.done)?'✓':'○'}</strong><span>${esc(r.item||'')}</span><button class="btn small" data-trip-check-toggle="${esc(r.id)}">${yes(r.done)?'Reabrir':'Concluir'}</button></div>`).join('')||'<span class="muted">Checklist vazio.</span>'}</div></section></div>
      <section class="card"><div class="sectiontitle"><h3>Despesas</h3><button class="btn small" data-trip-add-stable="Despesas" data-trip-id="${esc(id)}">+ Despesa</button></div>${exp.map(r=>`<div class="overview-line"><strong>${dt(r.date)}</strong><span>${esc(r.description||r.category||'Despesa')}</span><b>${money(r.amount)}</b><button class="btn small" data-trip-row-edit="Despesas" data-row-id="${esc(r.id)}">Editar</button></div>`).join('')||'<span class="muted">Sem despesas.</span>'}</section>`;
  }
  function genericSheet(name){const list=objRows(FILE,name).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));return `<div class="module-toolbar"><div><span class="muted">${list.length} registro(s)</span></div><button class="btn primary" data-trip-add-stable="${name}">+ Novo</button></div>${genericRowsTable('trips',name)}`}

  function audit(){
    const issues=[],ids=new Set(),tripIds=new Set();tripRowsAll().forEach(t=>{const id=String(t.id||'');if(!id)issues.push(['erro','Viagem sem ID']);else if(ids.has(id))issues.push(['erro',`ID de viagem duplicado: ${id}`]);ids.add(id);tripIds.add(id);if(t.startDate&&t.endDate&&String(t.endDate)<String(t.startDate))issues.push(['erro',`${t.name||id}: data final anterior à inicial`]);if(n(t.budget)<0)issues.push(['erro',`${t.name||id}: orçamento negativo`]);});
    [['Roteiro',routeRows()],['Reservas',reservationRows()],['Despesas',expenseRows()],['Checklist',checklistRows()]].forEach(([name,list])=>{const seen=new Set();list.forEach(r=>{const id=String(r.id||'');if(!id)issues.push(['erro',`${name}: registro sem ID`]);else if(seen.has(id))issues.push(['erro',`${name}: ID duplicado ${id}`]);seen.add(id);if(r.tripId&&!tripIds.has(String(r.tripId)))issues.push(['erro',`${name}: registro órfão ${id||'sem ID'}`]);});});
    expenseRows().forEach(r=>{if(n(r.amount)<0)issues.push(['atenção',`Despesa negativa: ${r.id||r.description||'sem ID'}`])});reservationRows().forEach(r=>{if(n(r.amount)<0)issues.push(['atenção',`Reserva com valor negativo: ${r.id||'sem ID'}`])});
    return {issues,tripCount:tripRowsAll().length,routeCount:routeRows().length,reservationCount:reservationRows().length,expenseCount:expenseRows().length,checkCount:checklistRows().length};
  }
  function auditView(){const a=audit();return `<div class="grid smart-kpis">${card('Viagens',a.tripCount)}${card('Roteiro',a.routeCount)}${card('Reservas',a.reservationCount)}${card('Despesas',a.expenseCount)}${card('Checklist',a.checkCount)}${card('Pendências',a.issues.length,a.issues.length?'revisar':'sem inconsistências')}</div><section class="card"><div class="sectiontitle"><div><span class="body-kicker">AUDITORIA</span><h3>Integridade do módulo</h3></div></div>${a.issues.length?a.issues.map(i=>`<div class="overview-line"><strong>${esc(i[0].toUpperCase())}</strong><span>${esc(i[1])}</span></div>`).join(''):empty('Sem inconsistências','IDs, vínculos e datas estão coerentes.')}</section>`}
  function renderTripsStable(){const tabs=[['dashboard','Visão geral'],['trips','Viagens'],['route','Roteiro'],['reservations','Reservas'],['expenses','Despesas'],['checklist','Checklist'],['audit','Auditoria']];let c=hero('VIAGENS','Planeje viagens, roteiro, reservas, despesas e checklist em um único lugar.')+`<div class="tabs af-tabs">${tabs.map(([id,l])=>`<button class="tab ${state.tripTab===id?'active':''}" data-trip-tab-stable="${id}">${l}</button>`).join('')}</div>`;if(state.tripSelectedStable)c+=detail(state.tripSelectedStable);else if(state.tripTab==='dashboard')c+=dashboard();else if(state.tripTab==='trips')c+=tripList();else if(state.tripTab==='audit')c+=auditView();else c+=genericSheet({route:'Roteiro',reservations:'Reservas',expenses:'Despesas',checklist:'Checklist'}[state.tripTab]);return shell(c,'Viagens')}

  function tripModal(id=''){
    const o=id?tripById(id):{status:'Planejando',favorite:'Não',archived:'Não'};
    state.modal=`<div class="modaltitle"><div><span class="body-kicker">VIAGEM</span><h3>${id?'Editar viagem':'Nova viagem'}</h3></div><button class="x" data-close>×</button></div><div class="formgrid smart-form">
      <div class="field full"><label>Nome *</label><input id="tName" value="${esc(o?.name||'')}"></div><div class="field full"><label>Destino *</label><input id="tDestination" value="${esc(o?.destination||'')}"></div>
      <div class="field"><label>Início</label><input id="tStart" type="date" value="${esc(iso(o?.startDate))}"></div><div class="field"><label>Fim</label><input id="tEnd" type="date" value="${esc(iso(o?.endDate))}"></div>
      <div class="field"><label>Status</label><select id="tStatus">${['Planejando','Reservado','Em andamento','Concluído','Cancelado'].map(v=>`<option ${low(o?.status)===low(v)?'selected':''}>${v}</option>`).join('')}</select></div><div class="field"><label>Orçamento</label><input id="tBudget" type="number" min="0" step="0.01" value="${esc(o?.budget||'')}"></div>
      <div class="field"><label>Hospedagem</label><input id="tLodging" value="${esc(o?.lodging||'')}"></div><div class="field"><label>Transporte principal</label><input id="tTransport" value="${esc(o?.mainTransport||'')}"></div>
      <div class="field full"><label>Link da reserva</label><input id="tBooking" value="${esc(o?.bookingLink||'')}"></div><div class="field full"><label>Documentos / observações</label><textarea id="tDocs" rows="2">${esc(o?.documentsNotes||'')}</textarea></div><div class="field full"><label>Notas</label><textarea id="tNotes" rows="3">${esc(o?.notes||'')}</textarea></div>
    </div><div class="actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="tripSaveStable">Salvar</button></div>`;render();document.getElementById('tripSaveStable').onclick=()=>saveTrip(id);
  }
  async function saveTrip(id=''){
    const name=document.getElementById('tName').value.trim(),destination=document.getElementById('tDestination').value.trim(),startDate=document.getElementById('tStart').value,endDate=document.getElementById('tEnd').value;if(!name||!destination){toast('Informe nome e destino');return}if(startDate&&endDate&&endDate<startDate){toast('A data final não pode ser anterior à inicial');return}
    const h=sheetHeaders('Viagens'),all=tripRowsAll();let o=all.find(x=>String(x.id)===String(id));if(!o){o={id:`trip-${Date.now()}`,userId:'local',favorite:'Não',archived:'Não',createdAt:nowISO()};all.push(o)}Object.assign(o,{name,destination,startDate,endDate,status:document.getElementById('tStatus').value,budget:document.getElementById('tBudget').value,notes:document.getElementById('tNotes').value.trim(),lodging:document.getElementById('tLodging').value.trim(),mainTransport:document.getElementById('tTransport').value.trim(),bookingLink:document.getElementById('tBooking').value.trim(),documentsNotes:document.getElementById('tDocs').value.trim(),updatedAt:nowISO()});await saveSheet(FILE,'Viagens',toRows(all,h));state.modal=null;state.tripSelectedStable=o.id;toast('Viagem salva');render();
  }
  async function archiveTrip(id){const h=sheetHeaders('Viagens'),all=tripRowsAll(),o=all.find(x=>String(x.id)===String(id));if(!o)return;o.archived=yes(o.archived)?'Não':'Sim';o.updatedAt=nowISO();await saveSheet(FILE,'Viagens',toRows(all,h));toast(yes(o.archived)?'Viagem arquivada':'Viagem restaurada');render()}
  function rowModal(sheet,tripId='',rowId=''){const headers=sheetHeaders(sheet),all=objRows(FILE,sheet),o=all.find(x=>String(x.id)===String(rowId))||{tripId:tripId||state.tripSelectedStable,userId:'local'};const fields=headers.filter(h=>!['id','userId'].includes(h));state.modal=`<div class="modaltitle"><div><span class="body-kicker">${esc(sheet.toUpperCase())}</span><h3>${rowId?'Editar':'Novo'} registro</h3></div><button class="x" data-close>×</button></div><div class="formgrid smart-form">${fields.map(h=>{if(h==='tripId')return `<div class="field full"><label>Viagem</label><select id="tr_${h}">${tripRowsAll().map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(o.tripId)?'selected':''}>${esc(t.name||t.destination)}</option>`).join('')}</select></div>`;if(h==='done')return `<div class="field"><label>Concluído</label><select id="tr_${h}"><option ${yes(o[h])?'selected':''}>Sim</option><option ${!yes(o[h])?'selected':''}>Não</option></select></div>`;if(h==='notes')return `<div class="field full"><label>Observações</label><textarea id="tr_${h}" rows="3">${esc(o[h]||'')}</textarea></div>`;const type=h==='date'?'date':h==='time'?'time':['amount'].includes(h)?'number':'text';return `<div class="field"><label>${esc(h)}</label><input id="tr_${h}" type="${type}" ${type==='number'?'min="0" step="0.01"':''} value="${esc(o[h]||'')}"></div>`}).join('')}</div><div class="actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="tripRowSaveStable">Salvar</button></div>`;render();document.getElementById('tripRowSaveStable').onclick=()=>saveRow(sheet,rowId,o.id);
  }
  async function saveRow(sheet,rowId='',existingId=''){const h=sheetHeaders(sheet),all=objRows(FILE,sheet);let o=all.find(x=>String(x.id)===String(rowId));if(!o){o={id:existingId||`${sheet.toLowerCase()}-${Date.now()}`,userId:'local'};all.push(o)}h.forEach(k=>{if(['id','userId'].includes(k))return;const el=document.getElementById(`tr_${k}`);if(el)o[k]=el.value});if(o.amount!==undefined&&n(o.amount)<0){toast('O valor não pode ser negativo');return}await saveSheet(FILE,sheet,toRows(all,h));state.modal=null;toast('Registro salvo');render()}
  async function toggleCheck(id){const h=sheetHeaders('Checklist'),all=checklistRows(),o=all.find(x=>String(x.id)===String(id));if(!o)return;o.done=yes(o.done)?'Não':'Sim';await saveSheet(FILE,'Checklist',toRows(all,h));render()}

  const oldGeneric=generic,oldBind=bind;
  generic=function(page){return page==='trips'?renderTripsStable():oldGeneric(page)};
  bind=function(){oldBind();if(state.page!=='trips')return;
    document.querySelectorAll('[data-trip-tab-stable]').forEach(b=>b.onclick=()=>{state.tripTab=b.dataset.tripTabStable;state.tripSelectedStable='';render()});
    document.getElementById('tripNewStable')?.addEventListener('click',()=>tripModal());
    document.getElementById('tripBackStable')?.addEventListener('click',()=>{state.tripSelectedStable='';render()});
    document.getElementById('tripSearchStable')?.addEventListener('input',e=>{state.tripSearch=e.target.value;render();setTimeout(()=>document.getElementById('tripSearchStable')?.focus(),0)});
    document.getElementById('tripArchivedStable')?.addEventListener('click',()=>{state.tripShowArchived=!state.tripShowArchived;render()});
    document.querySelectorAll('[data-trip-open-stable]').forEach(b=>b.onclick=()=>{state.tripSelectedStable=b.dataset.tripOpenStable;render()});
    document.querySelectorAll('[data-trip-edit-stable]').forEach(b=>b.onclick=()=>tripModal(b.dataset.tripEditStable));
    document.querySelectorAll('[data-trip-archive-stable]').forEach(b=>b.onclick=()=>archiveTrip(b.dataset.tripArchiveStable));
    document.querySelectorAll('[data-trip-add-stable]').forEach(b=>b.onclick=()=>rowModal(b.dataset.tripAddStable,b.dataset.tripId||state.tripSelectedStable));
    document.querySelectorAll('[data-trip-row-edit]').forEach(b=>b.onclick=()=>rowModal(b.dataset.tripRowEdit,state.tripSelectedStable,b.dataset.rowId));
    document.querySelectorAll('[data-trip-check-toggle]').forEach(b=>b.onclick=()=>toggleCheck(b.dataset.tripCheckToggle));
  };
  window.AF_TRIPS_AUDIT_11110=audit;
})();
