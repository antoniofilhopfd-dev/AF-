/* AF+ 9.0.0 — Final Estável
   Camada transversal de excelência: contexto Hoje/Semana/Mês, tendências MM7/MM14/MM30,
   favoritos/recentes, filtros persistentes, exportação/diagnóstico, fila de gravação,
   recuperação de operação, acessibilidade e atalhos. Não inventa dados ausentes. */
(() => {
  const VERSION='11.2.1', BUILD='20260927';
  const LS='afplus:v900:';
  const readJSON=(k,d)=>{try{return JSON.parse(localStorage.getItem(LS+k)||'null')??d}catch{return d}};
  const writeJSON=(k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v))}catch{}};
  const low=v=>String(v??'').trim().toLowerCase();
  const iso=v=>{const s=String(v??'');return /^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):''};
  const parseDate=s=>{const x=iso(s);return x?new Date(`${x}T12:00:00`):null};
  const addDays=(s,n)=>{const d=parseDate(s)||new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
  const sum=(a,f=x=>num(x))=>a.reduce((t,x)=>t+num(f(x)),0);
  const mean=a=>a.length?sum(a)/a.length:0;
  const yes=v=>['sim','true','1','yes'].includes(low(v));
  const storage={
    context:localStorage.getItem(LS+'context')||'today',
    favorites:readJSON('favorites',[]),
    recents:readJSON('recents',[]),
    hiddenCards:readJSON('hiddenCards',[]),
    density:localStorage.getItem(LS+'density')||'comfortable',
    reducedMotion:localStorage.getItem(LS+'reducedMotion')==='1',
    lastSnapshot:readJSON('lastSnapshot',null)
  };
  Object.assign(state,{v9Context:storage.context,v9Compare:'previous',v9CommandQuery:''});

  function moduleLabel(page){return MODS.find(x=>x[0]===page)?.[2]||page}
  function addRecent(page){if(!page||page==='system')return;const item={page,label:moduleLabel(page),at:Date.now()};storage.recents=[item,...storage.recents.filter(x=>x.page!==page)].slice(0,8);writeJSON('recents',storage.recents)}
  function toggleFavorite(page){if(storage.favorites.includes(page))storage.favorites=storage.favorites.filter(x=>x!==page);else storage.favorites=[...storage.favorites,page];writeJSON('favorites',storage.favorites);render()}
  function periodBounds(kind){const t=today();if(kind==='today')return[t,t];if(kind==='week'){const d=parseDate(t),dow=d.getDay();return[addDays(t,-dow),addDays(t,6-dow)]}const [y,m]=t.split('-').map(Number);const first=`${y}-${String(m).padStart(2,'0')}-01`;const last=new Date(y,m,0).toISOString().slice(0,10);return[first,last]}
  function inRange(v,a,b){const d=iso(v);return !!d&&d>=a&&d<=b}
  function dateValue(r){for(const k of ['date','startDate','createdAt','finishedAt','startedAt']){const d=iso(r[k]);if(d)return d}return''}
  function dailySeries(list,valueFn){const m=new Map();list.forEach(r=>{const d=dateValue(r);if(!d)return;m.set(d,(m.get(d)||0)+num(valueFn(r)))});return [...m].map(([date,value])=>({date,value})).sort((a,b)=>a.date.localeCompare(b.date))}
  function rolling(series,days){return series.map((p,i)=>{const start=addDays(p.date,-days+1);const w=series.filter((x,j)=>j<=i&&x.date>=start&&x.date<=p.date);return {...p,ma:w.length?mean(w.map(x=>x.value)):null,count:w.length}})}
  function lastMA(series,days){const x=rolling(series,days).at(-1);return x?{value:x.ma,count:x.count}:null}
  function deltaWindow(series,days){if(!series.length)return null;const end=series.at(-1).date,curStart=addDays(end,-days+1),prevEnd=addDays(end,-days),prevStart=addDays(end,-days*2+1);const cur=series.filter(x=>x.date>=curStart&&x.date<=end),prev=series.filter(x=>x.date>=prevStart&&x.date<=prevEnd);if(!cur.length)return null;return{current:mean(cur.map(x=>x.value)),previous:prev.length?mean(prev.map(x=>x.value)):null,delta:prev.length?mean(cur.map(x=>x.value))-mean(prev.map(x=>x.value)):null,count:cur.length}}
  function metric(title,value,sub='',detail=''){return `<article class="card af9-card"><h3>${esc(title)}</h3><div class="metric">${value}</div>${sub?`<div class="muted">${esc(sub)}</div>`:''}${detail?`<small class="af9-detail">${detail}</small>`:''}</article>`}
  function trendTag(v,unit=''){if(v==null)return'<span class="af-status warn">sem comparação</span>';const cls=Math.abs(v)<0.0001?'warn':v<0?'good':'soft';return `<span class="af-status ${cls}">${v>0?'+':''}${fmt(v)}${unit}</span>`}

  function contextDashboard(){
    const [a,b]=periodBounds(state.v9Context);const label=state.v9Context==='today'?'Hoje':state.v9Context==='week'?'Esta semana':'Este mês';
    const weights=objRows(FILES.body,'Peso').map(x=>({date:iso(x.date),value:num(x.weightKg||x.weight||x.peso)})).filter(x=>x.date&&x.value).sort((x,y)=>x.date.localeCompare(y.date));
    const cons=consumptionRows().filter(x=>inRange(x.date,a,b)), trains=trainingRows().filter(x=>inRange(x.date,a,b)), reads=objRows(FILES.reading,'Sessoes').filter(x=>inRange(x.date,a,b)), ag=objRows(FILES.agenda,'Agenda').filter(x=>inRange(x.date,a,b)&&!yes(x.archived));
    const waters=waterRows().filter(x=>inRange(x.date,a,b));const w7=lastMA(weights,7),w14=lastMA(weights,14),w30=lastMA(weights,30),wd=deltaWindow(weights,7);
    const days=Math.max(1,Math.round((parseDate(b)-parseDate(a))/86400000)+1);const done=trains.filter(x=>low(x.status)==='executado');
    const cards={
      weight:metric('Peso / tendência',weights.at(-1)?`${fmt(weights.at(-1).value)} kg`:'—',w7?`MM7 ${fmt(w7.value)} kg (${w7.count} reg.)`:'sem MM7',`${w14?`MM14 ${fmt(w14.value)} kg`:''}${w30?` • MM30 ${fmt(w30.value)} kg`:''} ${wd?.delta!=null?trendTag(wd.delta,' kg'):''}`),
      nutrition:metric('Nutrição',`${fmt(sum(cons,x=>x.kcal)/days)} kcal/dia`,`${cons.length} consumo(s)`,cons.length?`Proteína média ${fmt(sum(cons,x=>x.proteinG)/days)} g/dia`:''),
      water:metric('Água',waters.length?`${fmt(sum(waters,x=>x.amountMl||x.ml||x.amount)/days)} ml/dia`:'—',`${waters.length} registro(s)`),
      training:metric('Treinos',done.length,`${fmt(sum(done,x=>x.executedDurationMin||x.plannedDurationMin))} min executados`,trains.length?`${Math.round(done.length/trains.length*100)}% executado/registrado`:''),
      reading:metric('Leitura',reads.length,`${fmt(sum(reads,x=>x.durationMin))} min`,reads.length?`${fmt(sum(reads,x=>x.durationMin)/days)} min/dia`:''),
      agenda:metric('Agenda',ag.length,`${label.toLowerCase()}`,ag.filter(x=>low(x.status).includes('cancel')).length?'inclui cancelados':''),
    };
    const order=['weight','nutrition','water','training','reading','agenda'].filter(k=>!storage.hiddenCards.includes(k));
    const favoriteBtns=storage.favorites.map(p=>`<button class="btn small" data-v9-go="${esc(p)}">★ ${esc(moduleLabel(p))}</button>`).join('')||'<span class="muted">Nenhum módulo favorito.</span>';
    const recentBtns=storage.recents.slice(0,5).map(x=>`<button class="btn small" data-v9-go="${esc(x.page)}">${esc(x.label)}</button>`).join('')||'<span class="muted">Nenhum acesso recente.</span>';
    return shell(`${hero('AF+ FINAL ESTÁVEL','Uma visão única do período, com tendências calculadas apenas a partir dos dados existentes.')}
      <div class="af9-contextbar"><div class="tabs"><button class="tab ${state.v9Context==='today'?'active':''}" data-v9-context="today">Hoje</button><button class="tab ${state.v9Context==='week'?'active':''}" data-v9-context="week">Semana</button><button class="tab ${state.v9Context==='month'?'active':''}" data-v9-context="month">Mês</button></div><div class="actions"><button class="btn" id="v9Customize">Personalizar cards</button><button class="btn" id="v9Command">⌘ Comandos</button></div></div>
      <div class="af9-period"><strong>${label}</strong><span>${brDate(a)}${a!==b?` → ${brDate(b)}`:''}</span></div>
      <div class="grid af9-dashboard">${order.map(k=>cards[k]).join('')}</div>
      <div class="af-dashboard-two"><section class="card"><div class="sectiontitle"><h3>Favoritos</h3></div><div class="actions">${favoriteBtns}</div></section><section class="card"><div class="sectiontitle"><h3>Recentes</h3></div><div class="actions">${recentBtns}</div></section></div>
      <div class="af-dashboard-two"><section class="card"><div class="sectiontitle"><div><span class="body-kicker">TENDÊNCIA</span><h3>Médias móveis do peso</h3></div><button class="btn small" data-v9-go="body">Abrir Corpo</button></div><div class="af9-trend-grid">${metric('MM7',w7?`${fmt(w7.value)} kg`:'—',w7?`${w7.count} registros`:'' )}${metric('MM14',w14?`${fmt(w14.value)} kg`:'—',w14?`${w14.count} registros`:'' )}${metric('MM30',w30?`${fmt(w30.value)} kg`:'—',w30?`${w30.count} registros`:'' )}</div></section><section class="card"><div class="sectiontitle"><h3>Ações rápidas</h3></div><div class="af-quick-actions"><button class="btn" data-v8-action="weight">+ Peso</button><button class="btn" data-v9-go="nutrition">Nutrição</button><button class="btn" data-v9-go="training">Treinos</button><button class="btn" data-v8-action="event">+ Evento</button><button class="btn" data-v9-go="reading">Leitura</button></div></section></div>`,'Visão geral');
  }

  function customizeCards(){const opts=[['weight','Peso'],['nutrition','Nutrição'],['water','Água'],['training','Treinos'],['reading','Leitura'],['agenda','Agenda']];state.modal=`<div class="modalhead"><div><h3>Personalizar painel</h3><div class="muted">Escolha os cards visíveis. A preferência fica salva neste dispositivo.</div></div><button class="x" data-close>×</button></div><div class="af9-checks">${opts.map(([id,l])=>`<label><input type="checkbox" data-v9-card="${id}" ${storage.hiddenCards.includes(id)?'':'checked'}> ${l}</label>`).join('')}</div><div class="modalactions"><button class="btn primary" id="v9SaveCards">Salvar</button></div>`;render()}
  function commandPalette(q=''){state.v9CommandQuery=q;const actions=[...MODS.map(m=>({label:`Abrir ${m[2]}`,action:`go:${m[0]}`})),{label:'Criar backup',action:'backup'},{label:'Abrir pasta DADOS',action:'data'},{label:'Exportar diagnóstico',action:'diagnostic'},{label:'Exportar dados atuais em JSON',action:'json'},{label:'Central do AF+',action:'system'}];const n=low(q),list=actions.filter(x=>!n||low(x.label).includes(n));state.modal=`<div class="modalhead"><div><h3>Comandos rápidos</h3><div class="muted">Atalho: Ctrl+Shift+P</div></div><button class="x" data-close>×</button></div><div class="af-searchbox"><input id="v9CommandInput" value="${esc(q)}" placeholder="Digite um comando..."></div><div class="af-search-results">${list.map(x=>`<button data-v9-command="${esc(x.action)}"><strong>${esc(x.label)}</strong></button>`).join('')}</div>`;render();setTimeout(()=>document.getElementById('v9CommandInput')?.focus(),0)}
  function download(name,text,type='application/json'){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),500)}
  function diagnostics(){const mods=Object.entries(FILES).map(([k,f])=>({module:k,file:f,sheets:Object.keys(state.books[f]||{}).length,records:Object.values(state.books[f]||{}).reduce((n,r)=>n+Math.max(0,(r?.length||1)-1),0)}));const data={version:VERSION,build:BUILD,generatedAt:new Date().toISOString(),modules:mods,preferences:{context:state.v9Context,favorites:storage.favorites,hiddenCards:storage.hiddenCards,density:storage.density},pendingWrite:readJSON('pendingWrite',null)};download(`AF_PLUS_DIAGNOSTICO_${today()}.json`,JSON.stringify(data,null,2))}
  function exportAllJSON(){download(`AF_PLUS_DADOS_${today()}.json`,JSON.stringify(state.books,null,2))}
  function currentPageFavorite(){return storage.favorites.includes(state.page)}

  const previousOverview=overview, previousShell=shell, previousBind=bind, previousRender=render, previousSave=saveSheet;
  overview=contextDashboard;
  shell=function(content,title='AF+'){
    let html=previousShell(content,title).replace(/AF\+ 8\.1\.0/g,`AF+ ${VERSION}`).replace(/build 20260926/g,`build ${BUILD}`).replace(/<small>v8<\/small>/g,'<small>v11</small>').replace(/<small>v9<\/small>/g,'<small>v11</small>');
    html=html.replace('<div class="actions af-top-actions">',`<div class="actions af-top-actions"><button class="btn af9-fav ${currentPageFavorite()?'active':''}" id="v9FavPage" title="Favoritar módulo">★</button>`);
    return html;
  };

  // Serializa gravações e mantém uma recuperação leve da última operação pendente.
  let writeChain=Promise.resolve();
  saveSheet=function(file,sheet,data){const snapshot={file,sheet,rows:data,at:new Date().toISOString()};writeJSON('pendingWrite',snapshot);return writeChain=writeChain.then(async()=>{try{const r=await previousSave(file,sheet,data);localStorage.removeItem(LS+'pendingWrite');return r}catch(e){writeJSON('lastFailedWrite',snapshot);throw e}})};

  render=function(){addRecent(state.page);previousRender();document.body.dataset.density=storage.density;if(storage.reducedMotion)document.body.classList.add('af-reduced-motion');else document.body.classList.remove('af-reduced-motion')};

  function bindV9(){
    document.querySelectorAll('[data-v9-context]').forEach(b=>b.onclick=()=>{state.v9Context=b.dataset.v9Context;localStorage.setItem(LS+'context',state.v9Context);render()});
    document.querySelectorAll('[data-v9-go]').forEach(b=>b.onclick=()=>{state.page=b.dataset.v9Go;render()});
    document.getElementById('v9Customize')?.addEventListener('click',customizeCards);
    document.getElementById('v9Command')?.addEventListener('click',()=>commandPalette());
    document.getElementById('v9FavPage')?.addEventListener('click',()=>toggleFavorite(state.page));
    document.querySelectorAll('[data-v9-card]').forEach(x=>x.onchange=()=>{});
    document.getElementById('v9SaveCards')?.addEventListener('click',()=>{storage.hiddenCards=[...document.querySelectorAll('[data-v9-card]')].filter(x=>!x.checked).map(x=>x.dataset.v9Card);writeJSON('hiddenCards',storage.hiddenCards);state.modal=null;render()});
    document.getElementById('v9CommandInput')?.addEventListener('input',e=>commandPalette(e.target.value));
    document.querySelectorAll('[data-v9-command]').forEach(b=>b.onclick=async()=>{const a=b.dataset.v9Command;if(a.startsWith('go:')){state.modal=null;state.page=a.slice(3);render()}else if(a==='backup'){state.modal=null;render();document.getElementById('backup')?.click()}else if(a==='data'){fetch('/api/open-data')}else if(a==='diagnostic')diagnostics();else if(a==='json')exportAllJSON();else if(a==='system'){state.modal=null;state.page='system';render()}});
    // Persistência dos filtros genéricos já existentes.
    document.getElementById('v8GenericSearch')?.addEventListener('change',e=>{const m=readJSON('genericSearch',{});m[state.page]=e.target.value;writeJSON('genericSearch',m)});
    document.querySelectorAll('[data-v8-gperiod]').forEach(b=>b.addEventListener('click',()=>{const m=readJSON('genericPeriod',{});m[state.page]=b.dataset.v8Gperiod;writeJSON('genericPeriod',m)}));
  }
  bind=function(){previousBind();bindV9()};

  // Restaura preferências de filtro uma vez por sessão.
  try{const gs=readJSON('genericSearch',{}),gp=readJSON('genericPeriod',{});state.genericSearch={...(state.genericSearch||{}),...gs};state.genericPeriod={...(state.genericPeriod||{}),...gp}}catch{}

  window.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='p'){e.preventDefault();commandPalette()}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='b'){e.preventDefault();toggleFavorite(state.page)}
  });

  // Reconcilia uma gravação que pode ter sido concluída antes do navegador fechar.
  // Só remove a pendência quando a matriz carregada do XLSX é idêntica ao snapshot salvo.
  function sameMatrix(a,b){try{return JSON.stringify(a||[])===JSON.stringify(b||[])}catch(_){return false}}
  const pending=readJSON('pendingWrite',null);
  if(pending){
    const current=state.books?.[pending.file]?.[pending.sheet];
    if(current&&sameMatrix(current,pending.rows)){
      localStorage.removeItem(LS+'pendingWrite');
      try{localStorage.removeItem(LS+'lastFailedWrite')}catch(_){}
    }else{
      setTimeout(()=>toast(`Há uma gravação realmente pendente em ${pending.sheet}. Abra a Central do AF+ para revisar.`),1200);
    }
  }
  localStorage.setItem('afplus:version',VERSION);localStorage.setItem('afplus:build',BUILD);
})();
