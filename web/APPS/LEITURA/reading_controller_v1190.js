/* AF+ 11.8.0 — Leitura Etapa 1/4: auditoria estrutural somente leitura. */
(function(){
  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function s(v){ return String(v??'').trim(); }
  function pctFrom(end,total){ return total>0 ? Math.round((end/total)*1000)/10 : null; }
  function markerInfo(book){
    const sessions=readingBookSessions(book.id);
    const last=sessions.length?sessions.at(-1):null;
    const audio=s(book.type)==='Audiolivro';
    const ptype=readingProgressType(book);
    if(!last) return {ok:true,label:'Sem histórico ainda',detail:'Nenhuma sessão registrada.'};
    let end=0,current=0,total=0,kind='';
    if(audio){ end=n(last.endPart||last.part); current=n(book.currentPart); total=n(book.totalParts); kind='parte'; }
    else if(ptype==='Posição'){ end=n(last.endPosition||last.position); current=n(book.currentPosition||book.position); total=n(book.totalPosition); kind='posição'; }
    else { end=n(last.endPage||last.page); current=n(book.currentPage); total=n(book.totalPages); kind='página'; }
    const expected=end ? ((total&&end>=total)?end:end+1) : current;
    const progExpected=(end&&total)?pctFrom(end,total):null;
    const progStored=n(book.progressPct);
    const markerOk=!end || !current || current===expected;
    const progressOk=progExpected===null || Math.abs(progStored-progExpected)<=0.2;
    return {
      ok:markerOk&&progressOk,
      label:`Última ${kind} concluída: ${end||'—'} • Próxima: ${current||'—'}`,
      detail:`Esperado: próxima ${kind} ${expected||'—'}${progExpected!==null?` • Progresso ${progExpected}%`:''}`,
      markerOk,progressOk
    };
  }
  function audit(){
    const books=readingBooks(), sessions=readingSessions();
    const issues=[], checks=[];
    const bookIds=new Set();
    const sessionIds=new Set();
    for(const b of books){
      const id=s(b.id);
      if(!id){ issues.push('Título sem ID.'); continue; }
      if(bookIds.has(id)) issues.push(`ID de título duplicado: ${id}`); else bookIds.add(id);
      const p=n(b.progressPct); if(p<0||p>100) issues.push(`${b.title||id}: progresso fora de 0–100%.`);
      const mi=markerInfo(b); checks.push({book:b,mi});
      if(!mi.markerOk) issues.push(`${b.title||id}: marcador de continuidade não corresponde à última sessão.`);
      if(!mi.progressOk) issues.push(`${b.title||id}: percentual não corresponde ao último marcador concluído.`);
    }
    for(const x of sessions){
      const id=s(x.id); if(id){ if(sessionIds.has(id)) issues.push(`ID de sessão duplicado: ${id}`); else sessionIds.add(id); }
      if(!bookIds.has(s(x.bookId))) issues.push(`Sessão órfã sem título: ${id||'(sem id)'}`);
      const b=readingBook(x.bookId); if(!b) continue;
      const audio=s(b.type)==='Audiolivro', pt=readingProgressType(b);
      let a=0,z=0;
      if(audio){a=n(x.startPart);z=n(x.endPart||x.part)}
      else if(pt==='Posição'){a=n(x.startPosition);z=n(x.endPosition||x.position)}
      else {a=n(x.startPage);z=n(x.endPage||x.page)}
      if(a&&z&&z<a) issues.push(`${b.title}: sessão com final menor que início.`);
    }
    const required=['Biblioteca','Sessoes','Partes','Plano_Diario'];
    for(const sh of required){ if(!rows(FILES.reading,sh)?.length) issues.push(`Aba obrigatória indisponível: ${sh}`); }
    return {books,sessions,issues,checks};
  }
  function panel(){
    const a=audit();
    const ok=a.issues.length===0;
    return `<div class="sectiontitle"><div><h3>Auditoria da leitura</h3><span class="muted">Etapa 1/4 • continuidade, progresso e integridade do histórico</span></div></div>
      <div class="card">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          <span class="statuspill ${ok?'done':''}">${ok?'Sem inconsistências':'Revisar '+a.issues.length}</span>
          <span class="statuspill">${a.books.length} títulos</span><span class="statuspill">${a.sessions.length} sessões</span>
        </div>
        ${a.issues.length?`<div class="read-month-list">${a.issues.map(x=>`<div class="read-month"><span>⚠ ${esc(x)}</span></div>`).join('')}</div>`:'<div class="muted">IDs, sessões, continuidade e progresso estão consistentes.</div>'}
      </div>
      <div class="read-month-list">${a.checks.map(({book,mi})=>`<div class="read-month"><span><strong>${esc(book.title||'Sem título')}</strong><br><small>${esc(mi.label)}</small></span><strong>${mi.ok?'OK':'Revisar'}</strong></div>`).join('')}</div>`;
  }
  window.AF_READING_AUDIT_1180={run:audit,panel};
})();


/* ===== AF+ 11.8.1 integrado: sessões e continuidade ===== */
/* AF+ 11.8.1 — Leitura Etapa 2/4: sessões e continuidade robustas. */
(function(){
  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function s(v){ return String(v??'').trim(); }
  function clampPct(v){ return Math.max(0,Math.min(100,Number(v)||0)); }
  function pct(end,total){ return total>0 ? Math.round((end/total)*1000)/10 : null; }
  function sortSessions(list){
    return list.slice().sort((a,b)=>{
      const ka=`${s(a.date)}|${s(a.createdAt)}|${s(a.id)}`;
      const kb=`${s(b.date)}|${s(b.createdAt)}|${s(b.id)}`;
      return ka.localeCompare(kb);
    });
  }
  function mode(book){
    if(s(book?.type)==='Audiolivro') return {kind:'part',label:'parte',start:'startPart',end:'endPart',legacy:'part',current:'currentPart',total:'totalParts'};
    if(typeof readingProgressType==='function' && readingProgressType(book)==='Posição') return {kind:'position',label:'posição',start:'startPosition',end:'endPosition',legacy:'position',current:'currentPosition',total:'totalPosition'};
    return {kind:'page',label:'página',start:'startPage',end:'endPage',legacy:'page',current:'currentPage',total:'totalPages'};
  }
  function endMarker(row,m){ return n(row?.[m.end] || row?.[m.legacy]); }
  function startMarker(row,m){ return n(row?.[m.start]); }
  function nextMarker(end,total){ if(!end) return ''; return total&&end>=total?total:end+1; }
  function getHeaders(sheet){ return (rows(FILES.reading,sheet)[0]||[]).map(String); }

  async function recalcBook(bookId, fallback){
    const books=readingBooks(), book=books.find(x=>s(x.id)===s(bookId));
    if(!book) return;
    const all=readingSessions();
    const mine=sortSessions(all.filter(x=>s(x.bookId)===s(bookId)));
    const m=mode(book), total=n(book[m.total]);
    let prev=0;

    if(mine.length){
      for(const sess of mine){
        const end=endMarker(sess,m);
        const computed=end&&total?pct(end,total):null;
        sess.progressBeforePct=prev;
        sess.progressAfterPct=computed!==null?computed:clampPct(sess.progressAfterPct||prev);
        prev=clampPct(sess.progressAfterPct);
        if(end){ sess[m.legacy]=end; sess[m.end]=end; }
      }
      const last=mine[mine.length-1], end=endMarker(last,m);
      book.progressPct=prev;
      book[m.current]=nextMarker(end,total);
      if(m.kind==='position') book.position=book.currentPosition||'';
      book.lastSessionDate=last.date||book.lastSessionDate||'';
      if(!book.startedAt) book.startedAt=mine[0].date||mine[0].createdAt||'';
      if(prev>=100){
        book.status='Concluído';
        if(!book.completedAt) book.completedAt=last.date||last.updatedAt||new Date().toISOString();
      }else{
        if(readingStatusLabel(book.status)==='Concluído') book.status='Em andamento';
        else if(readingStatusLabel(book.status)==='Quero ler') book.status='Em andamento';
        book.completedAt='';
      }
    }else if(fallback){
      book.progressPct=clampPct(fallback.progressBeforePct||0);
      const start=n(fallback[m.start]);
      book[m.current]=start||((total&&book.progressPct===0)?1:(book[m.current]||''));
      if(m.kind==='position') book.position=book.currentPosition||'';
      book.lastSessionDate='';
      if(book.progressPct<100 && readingStatusLabel(book.status)==='Concluído') book.status='Em andamento';
      book.completedAt='';
    }

    book.updatedAt=new Date().toISOString();
    const sh=getHeaders('Sessoes'), bh=getHeaders('Biblioteca');
    await saveSheet(FILES.reading,'Sessoes',toRows(all,sh));
    await saveSheet(FILES.reading,'Biblioteca',toRows(books,bh));
  }

  function validateMarker(book,start,end){
    const m=mode(book), total=n(book[m.total]);
    if(!end) return `Informe a ${m.label} final`;
    if(m.kind!=='position' && end<1) return `A ${m.label} final deve ser maior que zero`;
    if(start && end<start) return `A ${m.label} final não pode ser menor que a inicial`;
    if(total && end>total) return `A ${m.label} final não pode ultrapassar ${total}`;
    return '';
  }

  window.recalcReadingBook=async function(bookId){ return recalcBook(bookId); };

  window.saveReadingSession=async function(sessionId=''){
    const bookId=document.getElementById('rsBook')?.value, book=readingBook(bookId);
    if(!bookId||!book){ toast('Selecione um título'); return; }
    const all=readingSessions(), now=new Date().toISOString();
    const existing=sessionId?all.find(x=>s(x.id)===s(sessionId)):null;
    const oldBookId=existing?.bookId||'';
    const oldSnapshot=existing?{...existing}:null;
    const m=mode(book);
    let start='',end='';
    if(m.kind==='part'){ start=n(document.getElementById('rsStartPart')?.value)||''; end=n(document.getElementById('rsEndPart')?.value)||''; }
    else if(m.kind==='position'){ start=n(document.getElementById('rsStartPosition')?.value)||''; end=n(document.getElementById('rsEndPosition')?.value)||''; }
    else { start=n(document.getElementById('rsStartPage')?.value)||''; end=n(document.getElementById('rsEndPage')?.value)||''; }
    const error=validateMarker(book,start,end); if(error){toast(error);return;}

    const data={
      id:existing?.id||('session-'+Date.now()), userId:'local', bookId,
      date:existing?.date||today(), durationMin:existing?.durationMin||'',
      progressBeforePct:existing?.progressBeforePct||0, progressAfterPct:existing?.progressAfterPct||0,
      part:m.kind==='part'?end:'', sessionType:s(book.type)==='Audiolivro'?'Áudio':'Leitura',
      speed:existing?.speed||'', source:s(book.type)==='Audiolivro'?'Peech':'Manual',
      notes:document.getElementById('rsNotes')?.value.trim()||'', createdAt:existing?.createdAt||now, updatedAt:now,
      page:m.kind==='page'?end:'', position:m.kind==='position'?end:'',
      startPage:m.kind==='page'?start:'', endPage:m.kind==='page'?end:'',
      startPosition:m.kind==='position'?start:'', endPosition:m.kind==='position'?end:'',
      startPart:m.kind==='part'?start:'', endPart:m.kind==='part'?end:''
    };
    if(existing) Object.assign(existing,data); else all.push(data);
    await saveSheet(FILES.reading,'Sessoes',toRows(all,getHeaders('Sessoes')));
    if(oldBookId && s(oldBookId)!==s(bookId)) await recalcBook(oldBookId,oldSnapshot);
    await recalcBook(bookId);
    state.modal=null; render();
  };

  window.readingDeleteSession=async function(id){
    if(!confirm('Excluir esta sessão? O progresso e a próxima página/parte serão recalculados.')) return;
    const all=readingSessions(), removed=all.find(x=>s(x.id)===s(id));
    if(!removed) return;
    const filtered=all.filter(x=>s(x.id)!==s(id));
    await saveSheet(FILES.reading,'Sessoes',toRows(filtered,getHeaders('Sessoes')));
    await recalcBook(removed.bookId,removed);
    render();
  };

  // Reprocessa percentuais/continuidade sem alterar os marcadores históricos.
  window.AF_READING_SESSIONS_1181={recalcBook,mode,validateMarker};
})();

/* ===== AF+ 11.9.0 — Leitura Etapa 3/4 + 4/4: UX, evolução e auditoria final ===== */
(function(){
  function s(v){ return String(v??'').trim(); }
  function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
  function fmtDate(v){
    const x=s(v); if(!x) return '—';
    const m=x.match(/^(\d{4})-(\d{2})-(\d{2})/); return m?`${m[3]}/${m[2]}/${m[1]}`:x;
  }
  function progressMode(book){
    if(s(book?.type)==='Audiolivro') return {label:'parte',current:'currentPart',total:'totalParts'};
    if(typeof readingProgressType==='function' && readingProgressType(book)==='Posição') return {label:'posição',current:'currentPosition',total:'totalPosition'};
    return {label:'página',current:'currentPage',total:'totalPages'};
  }
  function resumeText(book){
    const m=progressMode(book), cur=n(book?.[m.current]), total=n(book?.[m.total]);
    if(!cur) return `Próxima ${m.label}: não definida`;
    return `Próxima ${m.label}: ${cur}${total?` de ${total}`:''}`;
  }
  function lastCompleted(book){
    const ss=readingBookSessions(book.id); if(!ss.length) return 'Sem sessão registrada';
    const last=ss[ss.length-1], m=progressMode(book);
    let end=0;
    if(m.label==='parte') end=n(last.endPart||last.part);
    else if(m.label==='posição') end=n(last.endPosition||last.position);
    else end=n(last.endPage||last.page);
    return end?`Última ${m.label} concluída: ${end}`:'Último marcador não informado';
  }
  function activeResumePanel(){
    const books=readingBooks().filter(b=>['Em andamento','Quero ler'].includes(readingStatusLabel(b.status)))
      .sort((a,b)=>n(b.progressPct)-n(a.progressPct));
    if(!books.length) return '';
    return `<div class="sectiontitle"><div><h3>Continuar leitura</h3><span class="muted">Retome exatamente do próximo marcador salvo.</span></div></div>
      <div class="read-resume-grid">${books.map(b=>`<div class="card read-resume-card">
        <div class="read-title-row"><div><strong>${esc(b.title||'Sem título')}</strong><div class="muted">${esc(b.author||b.type||'')}</div></div><span class="statuspill">${fmt(b.progressPct)}%</span></div>
        ${readingProgress(b.progressPct)}
        <div class="read-resume-meta"><span>${esc(lastCompleted(b))}</span><strong>${esc(resumeText(b))}</strong></div>
        <div class="muted">Último registro: ${fmtDate(b.lastSessionDate)}</div>
        <div class="actions" style="margin-top:10px"><button class="btn primary" data-read-session="${esc(b.id)}">Registrar</button><button class="btn" data-read-detail="${esc(b.id)}">Detalhes</button></div>
      </div>`).join('')}</div>`;
  }
  function recentPanel(){
    const ss=readingSessions().slice().sort((a,b)=>`${s(b.date)}|${s(b.createdAt)}`.localeCompare(`${s(a.date)}|${s(a.createdAt)}`)).slice(0,6);
    if(!ss.length) return '';
    return `<div class="sectiontitle"><div><h3>Últimas sessões</h3><span class="muted">Histórico recente com progresso antes e depois.</span></div></div>
      <div class="read-session-list">${ss.map(x=>{const b=readingBook(x.bookId);return `<div class="read-session-row"><div><strong>${esc(b?.title||'Título removido')}</strong><div class="muted">${fmtDate(x.date)} • ${esc(lastMarkerLabel(x,b))}</div></div><div class="read-session-metrics"><span>${fmt(x.progressBeforePct)}% → <strong>${fmt(x.progressAfterPct)}%</strong></span></div></div>`}).join('')}</div>`;
  }
  function lastMarkerLabel(sess,book){
    if(!book) return 'Sessão';
    if(s(book.type)==='Audiolivro') return `Parte ${esc(sess.endPart||sess.part||'—')}`;
    if(readingProgressType(book)==='Posição') return `Posição ${esc(sess.endPosition||sess.position||'—')}`;
    return `Página ${esc(sess.endPage||sess.page||'—')}`;
  }
  const baseAuditRun=window.AF_READING_AUDIT_1180?.run;
  function finalAudit(){
    const base=(typeof baseAuditRun==='function'?baseAuditRun():null)||{books:readingBooks(),sessions:readingSessions(),issues:[],checks:[]};
    const issues=[...(base.issues||[])];
    for(const b of base.books||[]){
      const m=progressMode(b), cur=n(b[m.current]), total=n(b[m.total]);
      if(total>0 && cur>total) issues.push(`${b.title||b.id}: próxima ${m.label} acima do total.`);
      if(readingStatusLabel(b.status)==='Concluído' && n(b.progressPct)<99.9) issues.push(`${b.title||b.id}: marcado como concluído com progresso inferior a 100%.`);
      if(n(b.progressPct)>=100 && readingStatusLabel(b.status)!=='Concluído') issues.push(`${b.title||b.id}: progresso 100% sem status concluído.`);
    }
    const byBook=new Map();
    for(const x of base.sessions||[]){
      const arr=byBook.get(s(x.bookId))||[]; arr.push(x); byBook.set(s(x.bookId),arr);
    }
    for(const [bookId,list] of byBook){
      const b=readingBook(bookId); if(!b) continue;
      const sorted=list.slice().sort((a,z)=>`${s(a.date)}|${s(a.createdAt)}`.localeCompare(`${s(z.date)}|${s(z.createdAt)}`));
      let prev=-1;
      for(const x of sorted){ const p=n(x.progressAfterPct); if(prev>=0 && p+0.2<prev) issues.push(`${b.title}: progresso diminui entre sessões; revisar histórico.`); prev=p; }
    }
    return {...base,issues:[...new Set(issues)]};
  }

  const oldEvolution=window.readingEvolution;
  if(typeof oldEvolution==='function') window.readingEvolution=function(){
    return activeResumePanel()+oldEvolution()+recentPanel()+(window.AF_READING_AUDIT_1180?.panel?.()||'');
  };

  const oldList=window.readingSessionList;
  if(typeof oldList==='function') window.readingSessionList=function(ss,actions=true){
    if(!ss?.length) return oldList(ss,actions);
    return `<div class="read-session-list">${ss.map(x=>{const b=readingBook(x.bookId);return `<div class="read-session-row"><div><strong>${esc(b?.title||'Título removido')}</strong><div class="muted">${fmtDate(x.date)} • ${lastMarkerLabel(x,b)}</div></div><div class="read-session-metrics"><span>${fmt(x.progressBeforePct)}% → <strong>${fmt(x.progressAfterPct)}%</strong></span><small class="muted">${esc(b?resumeText(b):'')}</small></div>${actions?`<div class="read-row-actions"><button class="btn" data-read-session-edit="${esc(x.id)}">Editar</button><button class="btn danger" data-read-session-delete="${esc(x.id)}">Excluir</button></div>`:''}</div>`}).join('')}</div>`;
  };

  if(window.AF_READING_AUDIT_1180){
    window.AF_READING_AUDIT_1180.run=finalAudit;
    window.AF_READING_AUDIT_1180.panel=function(){
      const a=finalAudit(), ok=a.issues.length===0;
      return `<div class="sectiontitle"><div><h3>Auditoria final da leitura</h3><span class="muted">Etapa 4/4 • continuidade, histórico e integridade</span></div></div><div class="card"><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><span class="statuspill ${ok?'done':''}">${ok?'Sem inconsistências':'Revisar '+a.issues.length}</span><span class="statuspill">${a.books.length} títulos</span><span class="statuspill">${a.sessions.length} sessões</span></div>${a.issues.length?`<div class="read-month-list">${a.issues.map(x=>`<div class="read-month"><span>⚠ ${esc(x)}</span></div>`).join('')}</div>`:'<div class="muted">Continuidade, progresso, status, limites e vínculos estão consistentes.</div>'}</div>`;
    };
  }

  if(!document.getElementById('af-reading-v1190-style')){
    const st=document.createElement('style'); st.id='af-reading-v1190-style'; st.textContent=`
      .read-resume-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.read-resume-card{display:flex;flex-direction:column;gap:10px}.read-resume-meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.92rem}.read-session-metrics{display:flex;flex-direction:column;align-items:flex-end;gap:3px}@media(max-width:760px){.read-session-metrics{align-items:flex-start}.read-resume-meta{flex-direction:column;gap:4px}}
    `; document.head.appendChild(st);
  }
  window.AF_READING_CONTROLLER_1190={finalAudit,resumeText,lastCompleted};
})();
