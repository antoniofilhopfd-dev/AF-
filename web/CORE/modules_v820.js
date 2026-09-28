// AF+ 8.2.0 — Segunda rodada de finalização dos módulos
(function(){
  const yes=v=>['sim','true','1','yes'].includes(String(v??'').trim().toLowerCase());
  const isConnected=v=>['conectado','connected','ativo'].includes(String(v??'').trim().toLowerCase());
  const low=v=>String(v??'').trim().toLowerCase();
  const dateMs=v=>{const d=new Date(String(v||''));return isNaN(d)?0:d.getTime()};
  const sum=(arr,fn)=>arr.reduce((a,x)=>a+num(fn(x)),0);
  const avg=(arr,fn)=>arr.length?sum(arr,fn)/arr.length:0;
  const daysAgo=n=>Date.now()-n*86400000;
  const progress=(v)=>`<div class="af-progress"><i style="width:${Math.max(0,Math.min(100,num(v)))}%"></i></div>`;
  const pill=(t,c='')=>`<span class="af-pill ${c}">${esc(t||'—')}</span>`;
  const fmtDate=v=>v?brDate(String(v).slice(0,10)):'—';
  state.media2Tab=state.media2Tab||'dashboard';
  state.trip2Tab=state.trip2Tab||'dashboard';
  state.int2Tab=state.int2Tab||'connections';
  state.mediaSearch=state.mediaSearch||'';
  state.tripSelected=state.tripSelected||'';
  state.showArchivedFoods=state.showArchivedFoods||false;

  Object.assign(FIELD_LABELS,{
    genre:'Gênero',releaseYear:'Ano',totalSeasons:'Total de temporadas',totalEpisodes:'Total de episódios',coverUrl:'URL da capa',whereToWatch:'Onde assistir',archived:'Arquivado',lodging:'Hospedagem',mainTransport:'Transporte principal',bookingLink:'Link da reserva',documentsNotes:'Documentos / observações',lastSyncAt:'Última sincronização',lastError:'Último erro',canRead:'Pode ler',canWrite:'Pode gravar',autoSync:'Sincronização automática',provider:'Serviço'
  });

  function moduleTabs(items,active,attr){return `<div class="tabs af-tabs">${items.map(([id,l])=>`<button class="tab ${active===id?'active':''}" ${attr}="${id}">${l}</button>`).join('')}</div>`}
  function emptyState(title,text,action=''){return `<div class="af-empty"><strong>${esc(title)}</strong><span>${esc(text)}</span>${action}</div>`}

  function mediaRowsFiltered(type=''){
    const q=low(state.mediaSearch);let list=objRows(FILES.media,'Midia').filter(x=>!yes(x.archived));
    if(type) list=list.filter(x=>low(x.type).normalize('NFD').replace(/[\u0300-\u036f]/g,'')===type);
    if(q) list=list.filter(x=>`${x.title||''} ${x.platform||''} ${x.genre||''} ${x.status||''}`.toLowerCase().includes(q));
    return list;
  }
  function mediaCard(x){
    const p=num(x.progress);const status=x.status||'Sem status';const type=x.type||'Mídia';
    return `<article class="af-media-card">
      <div class="af-cover">${x.coverUrl?`<img src="${esc(x.coverUrl)}" alt="">`:`<span>${esc(type.slice(0,1)||'▶')}</span>`}</div>
      <div class="af-media-content"><div class="af-row-between"><div>${pill(type,'soft')} ${yes(x.favorite)?'<span title="Favorito">★</span>':''}</div>${pill(status,low(status).includes('concl')?'ok':'')}</div>
      <h3>${esc(x.title||'Sem título')}</h3><div class="muted">${esc([x.genre,x.releaseYear,x.platform].filter(Boolean).join(' • '))}</div>
      ${progress(p)}<div class="af-row-between"><small>${fmt(p)}% concluído</small><small>${x.season?`T${esc(x.season)}`:''}${x.episode?` • E${esc(x.episode)}`:''}</small></div>
      <div class="actions"><button class="btn small" data-media-edit="${esc(x.id||'')}">Editar</button><button class="btn small" data-media-session="${esc(x.id||'')}">Registrar sessão</button></div></div></article>`;
  }
  function mediaDashboard(){
    const all=mediaRowsFiltered();const watching=all.filter(x=>['assistindo','em andamento'].includes(low(x.status)));const done=all.filter(x=>low(x.status).includes('concl'));const fav=all.filter(x=>yes(x.favorite));
    const recent=objRows(FILES.media,'Sessoes').slice().sort((a,b)=>dateMs(b.date)-dateMs(a.date)).slice(0,5);
    return `<div class="grid smart-kpis">${card('Em andamento',watching.length,'continuar assistindo')}${card('Concluídos',done.length,'histórico')}${card('Favoritos',fav.length,'marcados')}${card('Sessões',objRows(FILES.media,'Sessoes').length,'registradas')}</div>
      <div class="af-two-col"><section><div class="sectiontitle"><div><span class="body-kicker">CONTINUAR</span><h3>Continuar assistindo</h3></div></div><div class="af-card-grid">${watching.map(mediaCard).join('')||emptyState('Nada em andamento','Marque um título como Assistindo para ele aparecer aqui.')}</div></section>
      <section class="card"><div class="sectiontitle"><h3>Sessões recentes</h3></div>${recent.map(s=>{const m=all.find(x=>String(x.id)===String(s.mediaId));return `<div class="overview-line"><strong>${fmtDate(s.date)}</strong><span>${esc(m?.title||'Mídia')} ${s.episode?`• E${esc(s.episode)}`:''}</span></div>`}).join('')||'<span class="muted">Nenhuma sessão registrada.</span>'}</section></div>`;
  }
  function mediaLibrary(type){const list=mediaRowsFiltered(type);return `<div class="module-toolbar"><div class="foodfilters"><input id="mediaSearch2" placeholder="Buscar título, gênero ou plataforma" value="${esc(state.mediaSearch)}"></div><button class="btn primary" id="newMedia2">+ Novo</button></div><div class="af-card-grid">${list.map(mediaCard).join('')||emptyState('Nenhum título','Cadastre o primeiro item desta categoria.')}</div>`}
  function mediaSessions(){return `<div class="module-toolbar"><div><span class="muted">Histórico de sessões</span></div><button class="btn primary" id="newMediaSession2">+ Registrar sessão</button></div>${genericRowsTable('media','Sessoes')}`}
  function renderMedia2(){const tabs=[['dashboard','Hoje'],['filme','Filmes'],['serie','Séries'],['novela','Novelas'],['sessions','Sessões']];let c=hero('MÍDIA','Seu catálogo pessoal para acompanhar o que está assistindo, progresso e histórico.')+moduleTabs(tabs,state.media2Tab,'data-m2tab');if(state.media2Tab==='dashboard')c+=mediaDashboard();else if(state.media2Tab==='sessions')c+=mediaSessions();else c+=mediaLibrary(state.media2Tab);return shell(c,'Mídia')}

  function tripRows(){return objRows(FILES.trips,'Viagens').filter(x=>!yes(x.archived))}
  function tripName(id){return tripRows().find(x=>String(x.id)===String(id))?.name||'Viagem'}
  function tripDashboard(){
    const list=tripRows();const t=today();const upcoming=list.filter(x=>String(x.endDate||'9999-12-31')>=t&&!low(x.status).includes('concl')).sort((a,b)=>String(a.startDate||'').localeCompare(String(b.startDate||'')));const next=upcoming[0];
    const expenses=objRows(FILES.trips,'Despesas');const total=sum(expenses,x=>x.amount);const checks=objRows(FILES.trips,'Checklist'),done=checks.filter(x=>yes(x.done)).length;
    return `<div class="grid smart-kpis">${card('Próximas viagens',upcoming.length,'planejadas')}${card('Reservas',objRows(FILES.trips,'Reservas').length,'registros')}${card('Despesas',`R$ ${fmt(total)}`,'registradas')}${card('Checklist',checks.length?`${Math.round(done/checks.length*100)}%`:'—','concluído')}</div>
      ${next?`<section class="af-trip-hero"><div><span class="body-kicker">PRÓXIMA VIAGEM</span><h2>${esc(next.name||next.destination)}</h2><p>${esc(next.destination||'')} • ${fmtDate(next.startDate)} → ${fmtDate(next.endDate)}</p><div class="actions"><button class="btn primary" data-trip-open="${esc(next.id)}">Abrir viagem</button><button class="btn" data-trip-edit="${esc(next.id)}">Editar</button></div></div><div>${pill(next.status||'Planejando')}</div></section>`:emptyState('Nenhuma próxima viagem','Cadastre uma viagem para montar roteiro, reservas, despesas e checklist.','<button class="btn primary" id="newTrip2">+ Nova viagem</button>')}
      <div class="af-card-grid">${upcoming.slice(1,6).map(v=>`<article class="card af-click" data-trip-open="${esc(v.id)}"><div class="af-row-between"><h3>${esc(v.name||v.destination)}</h3>${pill(v.status||'')}</div><p>${esc(v.destination||'')}</p><small>${fmtDate(v.startDate)} → ${fmtDate(v.endDate)}</small></article>`).join('')}</div>`;
  }
  function tripList(){return `<div class="module-toolbar"><div><span class="muted">${tripRows().length} viagem(ns)</span></div><button class="btn primary" id="newTrip2">+ Nova viagem</button></div><div class="af-card-grid">${tripRows().map(v=>`<article class="card"><div class="af-row-between"><div><span class="body-kicker">${esc(v.status||'VIAGEM')}</span><h3>${esc(v.name||v.destination)}</h3></div>${yes(v.favorite)?'★':''}</div><p>${esc(v.destination||'')}</p><small>${fmtDate(v.startDate)} → ${fmtDate(v.endDate)} ${v.budget?`• R$ ${fmt(v.budget)}`:''}</small><div class="actions"><button class="btn small primary" data-trip-open="${esc(v.id)}">Abrir</button><button class="btn small" data-trip-edit="${esc(v.id)}">Editar</button></div></article>`).join('')||emptyState('Nenhuma viagem','Crie sua primeira viagem.')}</div>`}
  function tripDetail(id){const v=tripRows().find(x=>String(x.id)===String(id));if(!v)return tripList();const route=objRows(FILES.trips,'Roteiro').filter(x=>String(x.tripId)===String(id)).sort((a,b)=>`${a.date||''} ${a.time||''}`.localeCompare(`${b.date||''} ${b.time||''}`));const reservations=objRows(FILES.trips,'Reservas').filter(x=>String(x.tripId)===String(id));const expenses=objRows(FILES.trips,'Despesas').filter(x=>String(x.tripId)===String(id));const checks=objRows(FILES.trips,'Checklist').filter(x=>String(x.tripId)===String(id));const spent=sum(expenses,x=>x.amount);return `<div class="af-trip-hero"><div><button class="btn small" id="tripBack">← Viagens</button><span class="body-kicker">${esc(v.destination||'VIAGEM')}</span><h2>${esc(v.name||v.destination)}</h2><p>${fmtDate(v.startDate)} → ${fmtDate(v.endDate)}</p></div>${pill(v.status||'')}</div><div class="grid smart-kpis">${card('Orçamento',v.budget?`R$ ${fmt(v.budget)}`:'—')}${card('Gasto',`R$ ${fmt(spent)}`,v.budget?`${fmt((spent/num(v.budget))*100)}% do orçamento`:'' )}${card('Reservas',reservations.length)}${card('Checklist',checks.length?`${checks.filter(x=>yes(x.done)).length}/${checks.length}`:'—')}</div><div class="af-trip-columns"><section class="card"><div class="sectiontitle"><h3>Roteiro</h3><button class="btn small" data-trip-add="Roteiro" data-trip-id="${esc(id)}">+ Item</button></div>${route.map(r=>`<div class="af-timeline"><b>${fmtDate(r.date)} ${esc(r.time||'')}</b><div><strong>${esc(r.place||'')}</strong><small>${esc([r.category,r.address].filter(Boolean).join(' • '))}</small></div></div>`).join('')||'<span class="muted">Roteiro vazio.</span>'}</section><section><div class="card"><div class="sectiontitle"><h3>Reservas</h3><button class="btn small" data-trip-add="Reservas" data-trip-id="${esc(id)}">+ Reserva</button></div>${reservations.map(r=>`<div class="overview-line"><strong>${esc(r.type||'Reserva')}</strong><span>${esc(r.provider||'')} ${r.confirmation?`• ${esc(r.confirmation)}`:''}</span></div>`).join('')||'<span class="muted">Sem reservas.</span>'}</div><div class="card"><div class="sectiontitle"><h3>Checklist</h3><button class="btn small" data-trip-add="Checklist" data-trip-id="${esc(id)}">+ Item</button></div>${checks.map(r=>`<div class="overview-line"><strong>${yes(r.done)?'✓':'○'}</strong><span>${esc(r.item||'')}</span></div>`).join('')||'<span class="muted">Checklist vazio.</span>'}</div></section></div>`}
  function tripsSheetTab(sheet){return `<div class="module-toolbar"><div><span class="muted">Gerenciamento completo</span></div><button class="btn primary" id="tripGenericNew" data-trip-sheet="${sheet}">+ Novo</button></div>${genericRowsTable('trips',sheet)}`}
  function renderTrips2(){const tabs=[['dashboard','Visão geral'],['trips','Viagens'],['route','Roteiro'],['reservations','Reservas'],['expenses','Despesas'],['checklist','Checklist']];let c=hero('VIAGENS','Planeje cada viagem do roteiro às reservas, checklist e gastos.')+moduleTabs(tabs,state.trip2Tab,'data-trip2tab');if(state.tripSelected)c+=tripDetail(state.tripSelected);else if(state.trip2Tab==='dashboard')c+=tripDashboard();else if(state.trip2Tab==='trips')c+=tripList();else c+=tripsSheetTab({route:'Roteiro',reservations:'Reservas',expenses:'Despesas',checklist:'Checklist'}[state.trip2Tab]);return shell(c,'Viagens')}

  function renderIntegrations2(){
    const con=objRows(FILES.integrations,'Conexoes');const logs=objRows(FILES.integrations,'Sync_Log');const imports=objRows(FILES.integrations,'Importacoes');const tabs=[['connections','Conexões'],['history','Sincronizações'],['imports','Importações'],['files','Arquivos'],['rules','Regras']];let c=hero('INTEGRAÇÕES','Conectores opcionais: o AF+ continua funcional com seus XLSX locais mesmo sem serviços externos.')+moduleTabs(tabs,state.int2Tab,'data-int2tab');
    if(state.int2Tab==='connections') c+=`<div class="grid smart-kpis">${card('Conexões',con.length)}${card('Conectadas',con.filter(x=>isConnected(x.status)).length)}${card('Importações',imports.length)}${card('Erros recentes',logs.filter(x=>low(x.status).includes('erro')).length)}</div><div class="af-integration-grid">${con.map(x=>`<article class="card af-integration"><div class="af-row-between"><div><span class="body-kicker">${esc(x.module||'AF+')}</span><h3>${esc(x.provider||'Serviço')}</h3></div>${pill(x.status||'Não conectado',isConnected(x.status)?'ok':'')}</div><p class="muted">Leitura: ${esc(x.canRead||'—')} • Gravação: ${esc(x.canWrite||'—')} • Automático: ${esc(x.autoSync||'—')}</p><small>Última sincronização: ${esc(x.lastSyncAt||'Nunca')}</small>${x.lastError?`<div class="af-warning">${esc(x.lastError)}</div>`:''}<div class="actions"><button class="btn small" data-conn-edit="${esc(x.id||'')}">Configurar</button><button class="btn small primary" data-conn-sync="${esc(x.id||'')}">Sincronizar agora</button></div></article>`).join('')}</div>`;
    else if(state.int2Tab==='history') c+=genericRowsTable('integrations','Sync_Log');
    else if(state.int2Tab==='imports') c+=genericRowsTable('integrations','Importacoes');
    else if(state.int2Tab==='files') c+=genericRowsTable('integrations','Arquivos');
    else c+=genericRowsTable('integrations','Regras');
    return shell(c,'Integrações')
  }

  const oldGenericSelectValues=genericSelectValues;
  genericSelectValues=function(page,sheet,h){
    if(h==='archived')return ['Não','Sim'];
    if(h==='favorite')return ['Não','Sim'];
    if(page==='integrations'&&h==='status')return ['Não conectado','Conectado','Erro','Pausado'];
    if(page==='integrations'&&['canRead','canWrite','autoSync','active'].includes(h))return ['Sim','Não'];
    if(page==='trips'&&h==='status')return ['Planejando','Confirmada','Em andamento','Concluída','Cancelada'];
    return oldGenericSelectValues(page,sheet,h);
  };

  // Treinos: ação direta para executar um treino planejado.
  trainingCard=function(x){const done=trainStatus(x)==='executado';const mod=trainModality(x);const id=x.id||'';const blocks=trainingBlocks(id).length;return `<article class="train-entry ${done?'done':''}"><button class="train-entry-main" data-train-edit="${esc(id)}"><span class="train-entry-top"><strong>${esc(x.workoutName||mod)}</strong><span class="pill ${done?'done':''}">${done?'Executado':'Planejado'}</span></span><span class="train-entry-meta">${done?durationText(x.executedDurationMin):durationText(x.plannedDurationMin)}${trainDistance(x)?` • ${fmt(trainDistance(x))} km`:''}${blocks?` • ${blocks} etapas`:''}</span><small>${esc([mod,x.source].filter(Boolean).join(' • '))}</small></button>${!done?`<button class="btn small primary train-exec-btn" data-train-execute="${esc(id)}">Executar treino</button>`:''}</article>`};

  // Override generic modules with purpose-built 2.0 experiences.
  const oldGeneric=generic;
  generic=function(page){if(page==='media')return renderMedia2();if(page==='trips')return renderTrips2();if(page==='integrations')return renderIntegrations2();return oldGeneric(page)};

  // Analytics/refinement panels for mature modules.
  function injectEnd(html,extra){const marker='</div></section></div>';const i=html.lastIndexOf(marker);return i>=0?html.slice(0,i)+extra+html.slice(i):html+extra}
  function bodyInsights(){const w=objRows(FILES.body,'Peso').slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));const last=w.at(-1);const last7=w.slice(-7);const prev7=w.slice(-14,-7);const mm7=avg(last7,x=>x.weightKg);const p7=avg(prev7,x=>x.weightKg);const measures=objRows(FILES.body,'Medidas');const bio=objRows(FILES.body,'Bioimpedancia');const ad=objRows(FILES.body,'Adipometria');return `<section class="af-analytics"><div class="sectiontitle"><div><span class="body-kicker">CORPO 2.0</span><h3>Tendência e avaliações</h3></div></div><div class="grid smart-kpis">${card('Média móvel 7D',last7.length?`${fmt(mm7)} kg`:'—',last7.length<7?`parcial • ${last7.length} registro(s)`:'7 registros')}${card('Tendência 7D',prev7.length?`${p7-mm7>0?'−':'+'}${fmt(Math.abs(mm7-p7))} kg`:'—','contra janela anterior')}${card('Medidas',measures.length,'avaliações')}${card('Bioimpedância',bio.length,'avaliações')}${card('Adipometria',ad.length,'avaliações')}</div><div class="card af-note">As metodologias de bioimpedância e adipometria permanecem separadas; o AF+ não trata equipamentos diferentes como medições diretamente equivalentes.</div></section>`}
  function trainingInsights(){const tr=trainingRows();const cutoff=daysAgo(28);const recent=tr.filter(x=>dateMs(x.date)>=cutoff);const done=recent.filter(x=>trainStatus(x)==='executado');const dist=sum(done,x=>x.executedDistanceKm);const dur=sum(done,x=>x.executedDurationMin);const weeks=Math.max(1,4);return `<section class="af-analytics"><div class="sectiontitle"><div><span class="body-kicker">TREINOS 2.0</span><h3>Volume das últimas 4 semanas</h3></div></div><div class="grid smart-kpis">${card('Executados',done.length,'últimos 28 dias')}${card('Duração',`${fmt(dur)} min`,`média ${fmt(dur/weeks)} min/sem`)}${card('Distância',`${fmt(dist)} km`,`média ${fmt(dist/weeks)} km/sem`)}${card('Planejado × executado',recent.length?`${Math.round(done.length/recent.length*100)}%`:'—','aderência aos registros')}</div></section>`}
  function readingInsights(){const s=objRows(FILES.reading,'Sessoes');const recent=s.filter(x=>dateMs(x.date)>=daysAgo(7));const mins=sum(recent,x=>x.durationMin);const books=objRows(FILES.reading,'Biblioteca');const ongoing=books.filter(x=>['em andamento','lendo','ouvindo'].includes(low(x.status)));return `<section class="af-analytics"><div class="sectiontitle"><div><span class="body-kicker">LEITURA 2.0</span><h3>Ritmo de leitura</h3></div></div><div class="grid smart-kpis">${card('Em andamento',ongoing.length,'títulos')}${card('Sessões 7D',recent.length)}${card('Minutos 7D',mins?fmt(mins):'—')}${card('Média diária',mins?`${fmt(mins/7)} min`:'—','últimos 7 dias')}</div></section>`}
  function nutritionInsights(){const c=consumptionRows();const recent=c.filter(x=>dateMs(x.date)>=daysAgo(7));const dates=[...new Set(recent.map(x=>String(x.date)))];const kcal=sum(recent,x=>x.kcal);const water=waterRows().filter(x=>dateMs(x.date)>=daysAgo(7));const waterTotal=sum(water,x=>x.amountMl||x.ml||x.amount);const pending=optionRows().filter(x=>String(x.calc_status||'').toUpperCase()!=='OK').length;return `<section class="af-analytics"><div class="sectiontitle"><div><span class="body-kicker">NUTRIÇÃO 2.0</span><h3>Resumo dos últimos 7 dias</h3></div></div><div class="grid smart-kpis">${card('Média kcal',dates.length?`${fmt(kcal/dates.length)} kcal`:'—',`${dates.length} dia(s) com consumo`)}${card('Média água',water.length?`${fmt(waterTotal/Math.max(1,new Set(water.map(x=>String(x.date))).size))} ml`:'—')}${card('Opções pendentes',pending,'sem inventar valores')}${card('Consumos',recent.length,'registros em 7 dias')}</div></section>`}
  const oldBody=body, oldTraining=training, oldNutrition=nutrition;
  body=function(){return injectEnd(oldBody(),bodyInsights())};
  training=function(){return injectEnd(oldTraining(),trainingInsights())};
  nutrition=function(){return injectEnd(oldNutrition(),nutritionInsights())};
  if(typeof reading==='function'){const oldReading=reading;reading=function(){return injectEnd(oldReading(),readingInsights())}}

  // Foods manager 2.0 with archive/restore and safe delete.
  foodsTab=function(){
    const all=foodRows();const showing=all.filter(f=>state.showArchivedFoods?yes(f.archived):!yes(f.archived));const cats=[...new Set(showing.map(f=>f.category).filter(Boolean))].sort();const q=state.foodSearch.trim().toLowerCase();const list=showing.filter(f=>(state.foodCategory==='all'||String(f.category)===state.foodCategory)&&(!q||`${foodName(f)} ${f.brand||''} ${f.category||''}`.toLowerCase().includes(q)));
    return `<div class="foodtoolbar"><div><h3>Alimentos</h3><span class="muted">${list.length} de ${showing.length} alimentos ${state.showArchivedFoods?'arquivados':'ativos'}</span></div><div class="foodfilters"><input id="foodSearch" placeholder="Buscar alimento" value="${esc(state.foodSearch)}"><select id="foodCategory"><option value="all">Todas as categorias</option>${cats.map(c=>`<option ${state.foodCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select><button class="btn" id="toggleArchivedFoods">${state.showArchivedFoods?'Mostrar ativos':'Mostrar arquivados'}</button><button class="btn primary" id="addFoodMaster">+ Adicionar alimento</button></div></div><div class="foodcards">${list.map(f=>`<article class="foodcard ${yes(f.archived)?'archived':''}"><div class="foodcardtop"><div><h3>${esc(foodName(f))}</h3><span class="muted">${esc([f.brand,f.category].filter(Boolean).join(' • '))}</span></div><div class="row-actions"><button class="btn small" data-edit-food="${esc(foodId(f))}">Editar</button>${yes(f.archived)?`<button class="btn small" data-food-restore="${esc(foodId(f))}">Restaurar</button>`:`<button class="btn small" data-food-archive="${esc(foodId(f))}">Arquivar</button><button class="btn small danger" data-food-delete="${esc(foodId(f))}">Excluir</button>`}</div></div><div class="foodportion">Porção base: <strong>${fmt(f.portion)} ${esc(f.unit||'')}</strong></div><div class="foodnutri"><span><strong>${fmt(f.kcal)}</strong> kcal</span><span><strong>${fmt(f.proteinG)}</strong> g proteína</span><span><strong>${fmt(f.carbsG)}</strong> g carbo</span><span><strong>${fmt(f.fatG)}</strong> g gordura</span><span><strong>${fmt(f.fiberG)}</strong> g fibra</span><span><strong>${fmt(f.sugarG)}</strong> g açúcar</span></div></article>`).join('')||'<div class="card empty">Nenhum alimento encontrado.</div>'}</div>`;
  };
  async function setFoodArchived(id,val){const raw=rows(FILES.nutrition,'Alimentos'),headers=(raw[0]||[]).map(String),objs=objRows(FILES.nutrition,'Alimentos');const f=objs.find(x=>String(x.id)===String(id));if(!f)return;f.archived=val?'Sim':'Não';await saveSheet(FILES.nutrition,'Alimentos',toRows(objs,headers));render()}
  function foodLinks(id){return {options:optionRows().filter(x=>String(x.foodId||'')===String(id)).length,plans:planItemRows().filter(x=>String(x.foodId||'')===String(id)).length,cons:consumptionItemRows().filter(x=>String(x.foodId||'')===String(id)).length}}
  async function safeDeleteFood(id){const refs=foodLinks(id);const total=refs.options+refs.plans+refs.cons;if(total){alert(`Este alimento está em uso (${refs.options} opção(ões), ${refs.plans} planejamento(s), ${refs.cons} consumo(s)). Para preservar o histórico, arquive em vez de excluir.`);return setFoodArchived(id,true)}if(!confirm('Excluir definitivamente este alimento? Esta ação não pode ser desfeita.'))return;const raw=rows(FILES.nutrition,'Alimentos'),headers=(raw[0]||[]).map(String),objs=objRows(FILES.nutrition,'Alimentos').filter(x=>String(x.id)!==String(id));await saveSheet(FILES.nutrition,'Alimentos',toRows(objs,headers));render()}

  const oldBind=bind;
  bind=function(){
    oldBind();
    document.querySelectorAll('[data-m2tab]').forEach(b=>b.onclick=()=>{state.media2Tab=b.dataset.m2tab;render()});
    document.getElementById('mediaSearch2')?.addEventListener('input',e=>{state.mediaSearch=e.target.value;render()});
    document.getElementById('newMedia2')?.addEventListener('click',()=>genericModal('media','Midia','',{type:state.media2Tab==='serie'?'Série':state.media2Tab==='novela'?'Novela':'Filme',status:'Quero ver',archived:'Não'}));
    document.querySelectorAll('[data-media-edit]').forEach(b=>b.onclick=()=>genericModal('media','Midia',b.dataset.mediaEdit));
    document.querySelectorAll('[data-media-session]').forEach(b=>b.onclick=()=>genericModal('media','Sessoes','',{mediaId:b.dataset.mediaSession,date:today()}));
    document.getElementById('newMediaSession2')?.addEventListener('click',()=>genericModal('media','Sessoes','',{date:today()}));

    document.querySelectorAll('[data-trip2tab]').forEach(b=>b.onclick=()=>{state.trip2Tab=b.dataset.trip2tab;state.tripSelected='';render()});
    document.querySelectorAll('[data-trip-open]').forEach(b=>b.onclick=()=>{state.tripSelected=b.dataset.tripOpen;render()});
    document.querySelectorAll('[data-trip-edit]').forEach(b=>b.onclick=()=>genericModal('trips','Viagens',b.dataset.tripEdit));
    document.getElementById('newTrip2')?.addEventListener('click',()=>genericModal('trips','Viagens','',{status:'Planejando',archived:'Não'}));
    document.getElementById('tripBack')?.addEventListener('click',()=>{state.tripSelected='';render()});
    document.querySelectorAll('[data-trip-add]').forEach(b=>b.onclick=()=>genericModal('trips',b.dataset.tripAdd,'',{tripId:b.dataset.tripId,date:today()}));
    document.getElementById('tripGenericNew')?.addEventListener('click',e=>genericModal('trips',e.currentTarget.dataset.tripSheet));

    document.querySelectorAll('[data-int2tab]').forEach(b=>b.onclick=()=>{state.int2Tab=b.dataset.int2tab;render()});
    document.querySelectorAll('[data-conn-edit]').forEach(b=>b.onclick=()=>genericModal('integrations','Conexoes',b.dataset.connEdit));
    document.querySelectorAll('[data-conn-sync]').forEach(b=>b.onclick=()=>{const x=objRows(FILES.integrations,'Conexoes').find(c=>String(c.id)===String(b.dataset.connSync));if(!x||!isConnected(x.status))alert('Este serviço ainda não está conectado. Configure a conexão primeiro. O AF+ não simula uma sincronização inexistente.');else alert('Conector configurado. A sincronização real depende da autorização/API do serviço.')});

    document.getElementById('toggleArchivedFoods')?.addEventListener('click',()=>{state.showArchivedFoods=!state.showArchivedFoods;state.foodCategory='all';render()});
    document.querySelectorAll('[data-food-archive]').forEach(b=>b.onclick=()=>setFoodArchived(b.dataset.foodArchive,true));
    document.querySelectorAll('[data-food-restore]').forEach(b=>b.onclick=()=>setFoodArchived(b.dataset.foodRestore,false));
    document.querySelectorAll('[data-food-delete]').forEach(b=>b.onclick=()=>safeDeleteFood(b.dataset.foodDelete));
    document.querySelectorAll('[data-train-execute]').forEach(b=>b.onclick=()=>{trainingModal(b.dataset.trainExecute);setTimeout(()=>{const st=document.getElementById('trStatus');if(st){st.value='executado';st.dispatchEvent(new Event('change',{bubbles:true}))}},30)});
  };
})();
