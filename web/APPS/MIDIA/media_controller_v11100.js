/* AF+ 11.10.0 — Mídia estável 4/4
   Controlador independente de Filmes, Séries e Novelas.
   Mantém DADOS persistentes e não cria conteúdo fictício. */
(function(){
  if(window.AF_MEDIA_11100_LOADED) return;
  window.AF_MEDIA_11100_LOADED=true;
  const FILE=FILES.media;
  const low=v=>String(v??'').trim().toLowerCase();
  const yes=v=>['sim','true','1','yes'].includes(low(v));
  const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,Number(v)||0));
  const todayISO=()=>new Date().toISOString().slice(0,10);
  const nowISO=()=>new Date().toISOString();
  const normType=v=>{const s=low(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'');return s==='serie'?'Série':s==='novela'?'Novela':'Filme'};
  state.mediaTab=state.mediaTab||'dashboard';
  state.mediaSearch=state.mediaSearch||'';
  state.mediaStatus=state.mediaStatus||'all';
  state.mediaShowArchived=state.mediaShowArchived||false;

  function mediaHeaders(){return (rows(FILE,'Midia')[0]||[]).map(String)}
  function sessionHeaders(){return (rows(FILE,'Sessoes')[0]||[]).map(String)}
  function mediaRows(){return objRows(FILE,'Midia')}
  function sessionRows(){return objRows(FILE,'Sessoes')}
  function activeMedia(){return mediaRows().filter(x=>state.mediaShowArchived||!yes(x.archived))}
  function mediaById(id){return mediaRows().find(x=>String(x.id)===String(id))}
  function sessionsFor(id){return sessionRows().filter(x=>String(x.mediaId)===String(id)).sort((a,b)=>`${a.date||''}|${a.id||''}`.localeCompare(`${b.date||''}|${b.id||''}`))}
  function pct(v){return `${Math.round(clamp(v))}%`}
  function statusTone(s){s=low(s);return s.includes('concl')?'good':s.includes('abandon')?'bad':s.includes('paus')?'warn':'info'}
  function progressBar(v){return `<div class="af-progress"><i style="width:${clamp(v)}%"></i></div>`}
  function pill(s){return `<span class="af-status ${statusTone(s)}">${esc(s||'Sem status')}</span>`}
  function mediaTypeIcon(t){return normType(t)==='Filme'?'🎬':normType(t)==='Série'?'📺':'🎭'}
  function lastSession(id){return sessionsFor(id).at(-1)||null}
  function mediaResume(x){
    const type=normType(x.type),s=Number(x.season)||0,e=Number(x.episode)||0;
    if(type==='Filme') return x.progress?`${pct(x.progress)} concluído`:'Ainda não iniciado';
    if(s||e) return `${s?`T${s}`:''}${e?`${s?' • ':''}E${e}`:''} • ${pct(x.progress)}`;
    return `${pct(x.progress)} concluído`;
  }
  function filtered(type=''){
    let list=activeMedia();
    if(type) list=list.filter(x=>normType(x.type)===type);
    const q=low(state.mediaSearch);
    if(q) list=list.filter(x=>`${x.title||''} ${x.genre||''} ${x.platform||''} ${x.status||''} ${x.tags||''}`.toLowerCase().includes(q));
    if(state.mediaStatus!=='all') list=list.filter(x=>low(x.status)===low(state.mediaStatus));
    return list.sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||'')));
  }
  function mediaCard(x){
    const last=lastSession(x.id),cover=x.coverUrl?`<img src="${esc(x.coverUrl)}" alt="">`:`<span>${mediaTypeIcon(x.type)}</span>`;
    return `<article class="af-media-card">
      <div class="af-cover">${cover}</div>
      <div class="af-media-content">
        <div class="af-row-between"><span class="af-pill soft">${esc(normType(x.type))}</span>${pill(x.status)}</div>
        <h3>${esc(x.title||'Sem título')} ${yes(x.favorite)?'<span title="Favorito">★</span>':''}</h3>
        <div class="muted">${esc([x.genre,x.releaseYear,x.platform].filter(Boolean).join(' • ')||'Sem detalhes')}</div>
        ${progressBar(x.progress)}
        <div class="af-row-between"><small>${esc(mediaResume(x))}</small><small>${x.rating?`★ ${esc(x.rating)}/5`:''}</small></div>
        ${last?`<small class="muted">Última sessão: ${esc(brDate(String(last.date).slice(0,10)))}</small>`:''}
        <div class="actions"><button class="btn small" data-m-edit="${esc(x.id)}">Editar</button><button class="btn small primary" data-m-session="${esc(x.id)}">Registrar sessão</button><button class="btn small" data-m-archive="${esc(x.id)}">${yes(x.archived)?'Restaurar':'Arquivar'}</button></div>
      </div></article>`;
  }
  function toolbar(type){return `<div class="module-toolbar"><div class="foodfilters"><input id="mediaSearchStable" value="${esc(state.mediaSearch)}" placeholder="Buscar título, gênero ou plataforma"><select id="mediaStatusStable"><option value="all">Todos os status</option>${['Quero ver','Assistindo','Pausado','Concluído','Abandonado'].map(s=>`<option ${low(state.mediaStatus)===low(s)?'selected':''}>${s}</option>`).join('')}</select></div><div class="actions"><button class="btn ${state.mediaShowArchived?'primary':''}" id="mediaArchivedStable">Arquivados</button><button class="btn primary" id="mediaNewStable">+ Novo ${type||'título'}</button></div></div>`}
  function dashboard(){
    const all=activeMedia(),watch=all.filter(x=>low(x.status)==='assistindo'),done=all.filter(x=>low(x.status).includes('concl')),want=all.filter(x=>low(x.status)==='quero ver');
    const recent=sessionRows().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,8);
    return `<div class="grid smart-kpis">${card('Catálogo',all.length,'títulos')}${card('Assistindo',watch.length,'em andamento')}${card('Quero ver',want.length,'fila')}${card('Concluídos',done.length,'histórico')}${card('Sessões',sessionRows().length,'registradas')}</div>
      <div class="sectiontitle"><div><span class="body-kicker">CONTINUAR</span><h3>Continuar assistindo</h3></div><button class="btn primary" id="mediaNewStable">+ Novo título</button></div>
      <div class="af-card-grid">${watch.map(mediaCard).join('')||`<div class="card empty">Nenhum título marcado como Assistindo.</div>`}</div>
      <div class="af-two-col"><section class="card"><div class="sectiontitle"><h3>Sessões recentes</h3></div>${recent.map(s=>{const m=mediaById(s.mediaId);return `<div class="overview-line"><strong>${esc(s.date?brDate(String(s.date).slice(0,10)):'—')}</strong><span>${esc(m?.title||'Título removido')} ${s.season?`• T${esc(s.season)}`:''}${s.episode?` E${esc(s.episode)}`:''}</span><small>${esc(s.progressBefore||0)}% → ${esc(s.progressAfter||0)}%</small></div>`}).join('')||'<span class="muted">Nenhuma sessão registrada.</span>'}</section>
      <section class="card"><div class="sectiontitle"><h3>Resumo por tipo</h3></div>${['Filme','Série','Novela'].map(t=>`<div class="overview-line"><strong>${t}</strong><span>${all.filter(x=>normType(x.type)===t).length} título(s)</span></div>`).join('')}</section></div>`;
  }
  function library(type){const list=filtered(type);return `${toolbar(type)}<div class="sectiontitle"><div><span class="body-kicker">${esc(type.toUpperCase())}</span><h3>${list.length} título(s)</h3></div></div><div class="af-card-grid">${list.map(mediaCard).join('')||'<div class="card empty">Nenhum título encontrado.</div>'}</div>`}
  function sessionsView(){
    const list=sessionRows().slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    return `<div class="module-toolbar"><div><span class="muted">${list.length} sessão(ões)</span></div><button class="btn primary" id="mediaSessionNewStable">+ Registrar sessão</button></div><div class="smart-table-wrap"><table class="table smart-table"><thead><tr><th>Data</th><th>Título</th><th>Temporada</th><th>Episódio</th><th>Progresso</th><th>Observações</th><th>Ações</th></tr></thead><tbody>${list.map(s=>{const m=mediaById(s.mediaId);return `<tr><td>${esc(s.date?brDate(String(s.date).slice(0,10)):'—')}</td><td>${esc(m?.title||'Título removido')}</td><td>${esc(s.season||'—')}</td><td>${esc(s.episode||'—')}</td><td>${esc(s.progressBefore||0)}% → ${esc(s.progressAfter||0)}%</td><td>${esc(s.notes||'—')}</td><td><div class="row-actions"><button class="btn small" data-ms-edit="${esc(s.id)}">Editar</button><button class="btn small danger" data-ms-delete="${esc(s.id)}">Excluir</button></div></td></tr>`}).join('')||'<tr><td colspan="7" class="muted">Nenhuma sessão registrada.</td></tr>'}</tbody></table></div>`;
  }
  function audit(){
    const medias=mediaRows(),sessions=sessionRows(),issues=[],seenM=new Set(),seenS=new Set();
    medias.forEach(m=>{const id=String(m.id||'');if(!id)issues.push(['erro','Título sem ID']);else if(seenM.has(id))issues.push(['erro',`ID de título duplicado: ${id}`]);seenM.add(id);if(!String(m.title||'').trim())issues.push(['erro',`Título sem nome (${id||'sem ID'})`]);if(!['Filme','Série','Novela'].includes(normType(m.type)))issues.push(['atenção',`Tipo não reconhecido: ${m.type}`]);const p=Number(m.progress);if(Number.isFinite(p)&&(p<0||p>100))issues.push(['erro',`${m.title||id}: progresso fora de 0–100`]);});
    sessions.forEach(s=>{const id=String(s.id||'');if(!id)issues.push(['erro','Sessão sem ID']);else if(seenS.has(id))issues.push(['erro',`ID de sessão duplicado: ${id}`]);seenS.add(id);if(!mediaById(s.mediaId))issues.push(['erro',`Sessão órfã: ${id||'sem ID'}`]);const a=Number(s.progressBefore),b=Number(s.progressAfter);if((Number.isFinite(a)&&(a<0||a>100))||(Number.isFinite(b)&&(b<0||b>100)))issues.push(['erro',`Sessão ${id}: progresso fora de 0–100`]);if(Number.isFinite(a)&&Number.isFinite(b)&&b<a)issues.push(['atenção',`Sessão ${id}: progresso final menor que inicial`]);});
    return {issues,mediaCount:medias.length,sessionCount:sessions.length,orphanCount:issues.filter(x=>x[1].includes('órfã')).length};
  }
  function auditView(){const a=audit();return `<div class="grid smart-kpis">${card('Títulos',a.mediaCount)}${card('Sessões',a.sessionCount)}${card('Pendências',a.issues.length,a.issues.length?'revisar':'sem inconsistências')}${card('Órfãs',a.orphanCount,'sessões')}</div><section class="card"><div class="sectiontitle"><div><span class="body-kicker">AUDITORIA</span><h3>Integridade do módulo</h3></div></div>${a.issues.length?a.issues.map(i=>`<div class="overview-line"><strong>${esc(i[0].toUpperCase())}</strong><span>${esc(i[1])}</span></div>`).join(''):'<div class="af-empty"><strong>Sem inconsistências</strong><span>IDs, vínculos e progressos estão coerentes.</span></div>'}</section>`}
  function renderMediaStable(){const tabs=[['dashboard','Hoje'],['Filme','Filmes'],['Série','Séries'],['Novela','Novelas'],['sessions','Sessões'],['audit','Auditoria']];let c=hero('MÍDIA','Filmes, séries e novelas com progresso, sessões e histórico.')+`<div class="tabs af-tabs">${tabs.map(([id,l])=>`<button class="tab ${state.mediaTab===id?'active':''}" data-media-tab="${esc(id)}">${l}</button>`).join('')}</div>`;if(state.mediaTab==='dashboard')c+=dashboard();else if(state.mediaTab==='sessions')c+=sessionsView();else if(state.mediaTab==='audit')c+=auditView();else c+=library(state.mediaTab);return shell(c,'Mídia')}

  function mediaModal(id='',typeDefault='Filme'){
    const base=id?mediaById(id):null,o=base||{type:typeDefault,status:'Quero ver',progress:0,rating:'',favorite:'Não',archived:'Não'};
    state.modal=`<div class="modaltitle"><div><span class="body-kicker">MÍDIA</span><h3>${id?'Editar título':'Novo título'}</h3></div><button class="x" data-close>×</button></div><div class="formgrid smart-form">
      <div class="field full"><label>Título *</label><input id="mTitle" value="${esc(o.title||'')}"></div>
      <div class="field"><label>Tipo</label><select id="mType">${['Filme','Série','Novela'].map(v=>`<option ${normType(o.type)===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Status</label><select id="mStatus">${['Quero ver','Assistindo','Pausado','Concluído','Abandonado'].map(v=>`<option ${low(o.status)===low(v)?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Progresso (%)</label><input id="mProgress" type="number" min="0" max="100" step="1" value="${esc(o.progress||0)}"></div>
      <div class="field"><label>Avaliação</label><select id="mRating"><option value="">—</option>${[1,2,3,4,5].map(v=>`<option ${Number(o.rating)===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Temporada atual</label><input id="mSeason" type="number" min="0" value="${esc(o.season||'')}"></div>
      <div class="field"><label>Episódio atual</label><input id="mEpisode" type="number" min="0" value="${esc(o.episode||'')}"></div>
      <div class="field"><label>Total temporadas</label><input id="mTotalSeasons" type="number" min="0" value="${esc(o.totalSeasons||'')}"></div>
      <div class="field"><label>Total episódios</label><input id="mTotalEpisodes" type="number" min="0" value="${esc(o.totalEpisodes||'')}"></div>
      <div class="field"><label>Plataforma</label><input id="mPlatform" value="${esc(o.platform||'')}"></div>
      <div class="field"><label>Gênero</label><input id="mGenre" value="${esc(o.genre||'')}"></div>
      <div class="field"><label>Ano</label><input id="mYear" type="number" value="${esc(o.releaseYear||'')}"></div>
      <div class="field"><label>Favorito</label><select id="mFavorite"><option ${yes(o.favorite)?'selected':''}>Sim</option><option ${!yes(o.favorite)?'selected':''}>Não</option></select></div>
      <div class="field full"><label>Onde assistir</label><input id="mWhere" value="${esc(o.whereToWatch||'')}"></div>
      <div class="field full"><label>URL da capa</label><input id="mCover" value="${esc(o.coverUrl||'')}"></div>
      <div class="field full"><label>Observações</label><textarea id="mNotes" rows="3">${esc(o.notes||'')}</textarea></div>
    </div><div class="actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="mediaSaveStable">Salvar</button></div>`;
    render();document.getElementById('mediaSaveStable').onclick=()=>saveMedia(id);
  }
  async function saveMedia(id=''){
    const title=document.getElementById('mTitle').value.trim();if(!title){toast('Informe o título');return}
    const headers=mediaHeaders(),objs=mediaRows(),now=nowISO();let o=objs.find(x=>String(x.id)===String(id));if(!o){o={id:`media-${Date.now()}`,userId:'local',createdAt:now};objs.push(o)}
    const type=normType(document.getElementById('mType').value),status=document.getElementById('mStatus').value,progress=clamp(document.getElementById('mProgress').value);
    Object.assign(o,{type,title,status,progress,rating:document.getElementById('mRating').value,platform:document.getElementById('mPlatform').value.trim(),genre:document.getElementById('mGenre').value.trim(),releaseYear:document.getElementById('mYear').value,season:type==='Filme'?'':document.getElementById('mSeason').value,episode:type==='Filme'?'':document.getElementById('mEpisode').value,totalSeasons:type==='Filme'?'':document.getElementById('mTotalSeasons').value,totalEpisodes:type==='Filme'?'':document.getElementById('mTotalEpisodes').value,favorite:document.getElementById('mFavorite').value,whereToWatch:document.getElementById('mWhere').value.trim(),coverUrl:document.getElementById('mCover').value.trim(),notes:document.getElementById('mNotes').value.trim(),archived:o.archived||'Não',updatedAt:now});
    if(status==='Assistindo'&&!o.startedAt)o.startedAt=todayISO();if((status==='Concluído'||progress>=100)&&!o.finishedAt)o.finishedAt=todayISO();
    await saveSheet(FILE,'Midia',toRows(objs,headers));state.modal=null;toast('Título salvo');render();
  }
  async function toggleArchive(id){const headers=mediaHeaders(),objs=mediaRows(),o=objs.find(x=>String(x.id)===String(id));if(!o)return;o.archived=yes(o.archived)?'Não':'Sim';o.updatedAt=nowISO();await saveSheet(FILE,'Midia',toRows(objs,headers));toast(yes(o.archived)?'Título arquivado':'Título restaurado');render()}

  function sessionModal(mediaId='',sessionId=''){
    const s=sessionId?sessionRows().find(x=>String(x.id)===String(sessionId)):null;const list=activeMedia();const selected=mediaId||s?.mediaId||list[0]?.id||'';const m=mediaById(selected);const before=s?.progressBefore??m?.progress??0;const after=s?.progressAfter??m?.progress??0;
    state.modal=`<div class="modaltitle"><div><span class="body-kicker">SESSÃO</span><h3>${sessionId?'Editar':'Registrar'} sessão</h3></div><button class="x" data-close>×</button></div><div class="formgrid smart-form">
      <div class="field full"><label>Título *</label><select id="msMedia">${list.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${esc(x.title)} — ${esc(normType(x.type))}</option>`).join('')}</select></div>
      <div class="field"><label>Data</label><input id="msDate" type="date" value="${esc(s?.date||todayISO())}"></div>
      <div class="field"><label>Progresso antes (%)</label><input id="msBefore" type="number" min="0" max="100" value="${esc(before)}"></div>
      <div class="field"><label>Progresso depois (%)</label><input id="msAfter" type="number" min="0" max="100" value="${esc(after)}"></div>
      <div class="field"><label>Temporada</label><input id="msSeason" type="number" min="0" value="${esc(s?.season??m?.season??'')}"></div>
      <div class="field"><label>Episódio</label><input id="msEpisode" type="number" min="0" value="${esc(s?.episode??m?.episode??'')}"></div>
      <div class="field full"><label>Observações</label><textarea id="msNotes" rows="3">${esc(s?.notes||'')}</textarea></div>
    </div><div class="actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="mediaSessionSaveStable">Salvar sessão</button></div>`;
    render();document.getElementById('mediaSessionSaveStable').onclick=()=>saveSession(sessionId);
  }
  async function saveSession(id=''){
    const mediaId=document.getElementById('msMedia').value,m=mediaById(mediaId);if(!m){toast('Selecione um título');return}
    const before=clamp(document.getElementById('msBefore').value),after=clamp(document.getElementById('msAfter').value);if(after<before){toast('O progresso final não pode ser menor que o inicial');return}
    const headers=sessionHeaders(),objs=sessionRows();let s=objs.find(x=>String(x.id)===String(id));if(!s){s={id:`media-session-${Date.now()}`,userId:'local'};objs.push(s)}
    Object.assign(s,{date:document.getElementById('msDate').value||todayISO(),mediaId,season:document.getElementById('msSeason').value,episode:document.getElementById('msEpisode').value,progressBefore:before,progressAfter:after,notes:document.getElementById('msNotes').value.trim()});
    await saveSheet(FILE,'Sessoes',toRows(objs,headers));await recomputeMedia(mediaId);state.modal=null;toast('Sessão salva');render();
  }
  async function recomputeMedia(mediaId){
    const headers=mediaHeaders(),objs=mediaRows(),m=objs.find(x=>String(x.id)===String(mediaId));if(!m)return;const ss=sessionRows().filter(x=>String(x.mediaId)===String(mediaId)).sort((a,b)=>`${a.date||''}|${a.id||''}`.localeCompare(`${b.date||''}|${b.id||''}`));const last=ss.at(-1);if(last){m.progress=clamp(last.progressAfter);if(normType(m.type)!=='Filme'){m.season=last.season||m.season;m.episode=last.episode||m.episode}if(Number(m.progress)>=100){m.status='Concluído';m.finishedAt=m.finishedAt||last.date||todayISO()}else if(!['Pausado','Abandonado'].includes(m.status))m.status='Assistindo';m.startedAt=m.startedAt||ss[0]?.date||todayISO()}else{m.progress=0;if(m.status==='Concluído')m.status='Quero ver';m.finishedAt=''}m.updatedAt=nowISO();await saveSheet(FILE,'Midia',toRows(objs,headers));
  }
  async function deleteSession(id){if(!confirm('Excluir esta sessão? O progresso do título será recalculado.'))return;const headers=sessionHeaders(),all=sessionRows(),s=all.find(x=>String(x.id)===String(id));if(!s)return;await saveSheet(FILE,'Sessoes',toRows(all.filter(x=>String(x.id)!==String(id)),headers));await recomputeMedia(s.mediaId);toast('Sessão excluída');render()}

  const oldGeneric=generic,oldBind=bind;
  generic=function(page){return page==='media'?renderMediaStable():oldGeneric(page)};
  bind=function(){oldBind();if(state.page!=='media')return;
    document.querySelectorAll('[data-media-tab]').forEach(b=>b.onclick=()=>{state.mediaTab=b.dataset.mediaTab;render()});
    document.getElementById('mediaSearchStable')?.addEventListener('input',e=>{state.mediaSearch=e.target.value;render();setTimeout(()=>document.getElementById('mediaSearchStable')?.focus(),0)});
    document.getElementById('mediaStatusStable')?.addEventListener('change',e=>{state.mediaStatus=e.target.value;render()});
    document.getElementById('mediaArchivedStable')?.addEventListener('click',()=>{state.mediaShowArchived=!state.mediaShowArchived;render()});
    document.getElementById('mediaNewStable')?.addEventListener('click',()=>mediaModal('',state.mediaTab==='Filme'||state.mediaTab==='Série'||state.mediaTab==='Novela'?state.mediaTab:'Filme'));
    document.getElementById('mediaSessionNewStable')?.addEventListener('click',()=>sessionModal());
    document.querySelectorAll('[data-m-edit]').forEach(b=>b.onclick=()=>mediaModal(b.dataset.mEdit));
    document.querySelectorAll('[data-m-session]').forEach(b=>b.onclick=()=>sessionModal(b.dataset.mSession));
    document.querySelectorAll('[data-m-archive]').forEach(b=>b.onclick=()=>toggleArchive(b.dataset.mArchive));
    document.querySelectorAll('[data-ms-edit]').forEach(b=>b.onclick=()=>sessionModal('',b.dataset.msEdit));
    document.querySelectorAll('[data-ms-delete]').forEach(b=>b.onclick=()=>deleteSession(b.dataset.msDelete));
  };
  window.AF_MEDIA_AUDIT_11100=audit;
})();
