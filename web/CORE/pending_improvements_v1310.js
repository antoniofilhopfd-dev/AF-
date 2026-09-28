// AF+ 13.1.0 — pendências consolidadas: Nutrição, Corpo, Treinos e segurança.
(function(){
  const V='13.1.0';
  const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

  // NUTRIÇÃO — busca estável + favoritos/recentes.
  const baseFoodsTab=window.foodsTab;
  if(typeof baseFoodsTab==='function') window.foodsTab=function(){
    const all=foodRows(); const cats=[...new Set(all.map(f=>f.category).filter(Boolean))].sort();
    const q=norm(state.foodSearch).trim();
    const list=all.filter(f=>(state.foodCategory==='all'||String(f.category)===state.foodCategory)&&(!q||norm(`${foodName(f)} ${f.brand||''} ${f.category||''}`).includes(q)));
    const fav=all.filter(f=>String(f.favorite).toLowerCase()==='true'||String(f.favorite).toLowerCase()==='sim'||f.favorite===1).slice(0,8);
    const recent=all.filter(f=>f.lastUsedAt).sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt))).slice(0,8);
    const chips=(arr,kind)=>arr.length?`<div class="af-food-quick"><strong>${kind}</strong>${arr.map(f=>`<button class="btn af-food-chip" data-food-pick="${esc(foodId(f))}">${esc(foodName(f))}</button>`).join('')}</div>`:'';
    return `<div class="foodtoolbar"><div><h3>Alimentos</h3><span class="muted">${list.length} de ${all.length} alimentos</span></div><div class="foodfilters"><input id="foodSearch" autocomplete="off" placeholder="Buscar alimento" value="${esc(state.foodSearch)}"><select id="foodCategory"><option value="all">Todas as categorias</option>${cats.map(c=>`<option ${state.foodCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select><button class="btn primary" id="addFoodMaster">+ Adicionar alimento</button></div></div>${chips(fav,'Favoritos')}${chips(recent,'Recentes')}<div class="foodcards">${list.map(f=>`<article class="foodcard"><div class="foodcardtop"><div><h3>${esc(foodName(f))}</h3><span class="muted">${esc([f.brand,f.category].filter(Boolean).join(' • '))}</span></div><div class="actions"><button class="btn" data-food-fav="${esc(foodId(f))}">${(String(f.favorite).toLowerCase()==='true'||String(f.favorite).toLowerCase()==='sim'||f.favorite===1)?'★ Favorito':'☆ Favoritar'}</button><button class="btn" data-edit-food="${esc(foodId(f))}">Editar</button></div></div><div class="foodportion">Porção base: <strong>${fmt(f.portion)} ${esc(f.unit||'')}</strong></div><div class="foodnutri"><span><strong>${fmt(f.kcal)}</strong> kcal</span><span><strong>${fmt(f.proteinG)}</strong> g proteína</span><span><strong>${fmt(f.carbsG)}</strong> g carbo</span><span><strong>${fmt(f.fatG)}</strong> g gordura</span><span><strong>${fmt(f.fiberG)}</strong> g fibra</span><span><strong>${fmt(f.sugarG)}</strong> g açúcar</span></div></article>`).join('')||'<div class="card empty">Nenhum alimento encontrado.</div>'}</div>`;
  };

  // CORPO — 7/30/90 + período anterior + média móvel de 7 dias.
  const baseBodyWeight=window.bodyWeightView;
  if(typeof baseBodyWeight==='function') window.bodyWeightView=function(){
    const all=bodyWeightRowsSorted(); if(!all.length)return '<div class="card empty">Nenhum peso registrado.</div>';
    const period=state.bodyWeightPeriod||'30',f=all.filter(x=>inPeriod(x.date,period)); const last=all.at(-1),prev=all.at(-2),vals=f.map(weightVal);
    const days=period==='all'?0:Number(period||30), cutoff=days?Date.now()-days*86400000:0, prevCut=days?cutoff-days*86400000:0;
    const prevPeriod=days?all.filter(x=>{const t=new Date(x.date+'T00:00:00').getTime();return t>=prevCut&&t<cutoff}):[];
    const avg7=all.slice(-7); const avg7v=avg7.length?avg7.reduce((s,x)=>s+weightVal(x),0)/avg7.length:0;
    const curAvg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0, prevAvg=prevPeriod.length?prevPeriod.reduce((s,x)=>s+weightVal(x),0)/prevPeriod.length:0;
    return `<div class="train-toolbar"><div><h3>Peso</h3><span class="muted">Histórico, tendência e comparação</span></div><select id="bodyWeightPeriod"><option value="7" ${period==='7'?'selected':''}>7 dias</option><option value="30" ${period==='30'?'selected':''}>30 dias</option><option value="90" ${period==='90'?'selected':''}>90 dias</option><option value="all" ${period==='all'?'selected':''}>Tudo</option></select></div><div class="grid">${card('Atual',fmt(weightVal(last))+' kg',prettyDate(last.date))}${card('Variação',prev?`${weightVal(last)-weightVal(prev)>0?'+':''}${fmt(weightVal(last)-weightVal(prev))} kg`:'—','em relação ao registro anterior')}${card('Média móvel 7 reg.',avg7v?fmt(avg7v)+' kg':'—')}${card('Período × anterior',days&&prevAvg?`${curAvg-prevAvg>0?'+':''}${fmt(curAvg-prevAvg)} kg`:'—','média do período')}</div><div class="card chart-card">${simpleLineChart(f.map(x=>({date:x.date,value:weightVal(x)})),' kg')}</div><div class="body-timeline">${f.slice().reverse().map(x=>`<article class="body-record"><div class="body-record-date">${prettyDate(x.date)}</div><div class="body-record-main"><strong>${fmt(weightVal(x))} kg</strong><span class="body-mini">${esc(x.source||'Manual')}</span></div></article>`).join('')}</div>`;
  };
  const baseBodyEvo=window.bodyEvo;
  if(typeof baseBodyEvo==='function') window.bodyEvo=function(){
    const html=baseBodyEvo();
    return html.replace('<option value="30"','<option value="7" '+(state.bodyEvoPeriod==='7'?'selected':'')+'>7 dias</option><option value="30"');
  };

  // TREINOS — painel de pendências nas importações.
  const baseTrainImports=window.trainImports;
  if(typeof baseTrainImports==='function') window.trainImports=function(){
    const pending=trainingImportInboxRows().filter(x=>String(x.reviewStatus||'pendente').toLowerCase()==='pendente');
    const garmin=pending.filter(x=>norm(x.source).includes('garmin')).length, zepp=pending.filter(x=>norm(x.source).includes('zepp')).length, strava=pending.filter(x=>norm(x.source).includes('strava')).length;
    return `<section class="card af-import-pending"><div class="sectiontitle"><div><span class="body-kicker">ATIVIDADES PENDENTES</span><h3>Importadas e ainda não vinculadas</h3></div><span class="pill">${pending.length} pendente(s)</span></div><div class="grid">${card('Garmin',garmin)}${card('Zepp',zepp)}${card('Strava',strava)}${card('Total',pending.length,'vincule ao treino planejado ou crie um novo')}</div></section>`+baseTrainImports();
  };

  // SEGURANÇA — histórico local + desfazer última gravação da sessão.
  const HISTORY_KEY='afplus_change_history_v1310'; const undo=[];
  const previousSave=window.saveSheet;
  if(typeof previousSave==='function') window.saveSheet=async function(file,sheet,newRows){
    let before=null; try{before=JSON.parse(JSON.stringify((state.books[file]&&state.books[file][sheet])||[]))}catch(_){before=null}
    const result=await previousSave(file,sheet,newRows);
    if(before){undo.push({file,sheet,rows:before,at:new Date().toISOString()}); if(undo.length>20)undo.shift()}
    try{const h=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');h.push({file,sheet,at:new Date().toISOString(),rows:Array.isArray(newRows)?Math.max(0,newRows.length-1):0});localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(-100)))}catch(_){ }
    return result;
  };
  window.afUndoLast=async function(){const x=undo.pop();if(!x){toast('Nada para desfazer nesta sessão');return}await previousSave(x.file,x.sheet,x.rows);toast(`Alteração desfeita: ${x.sheet}`);render()};

  const prevBind=window.bind;
  if(typeof prevBind==='function') window.bind=function(){
    prevBind();
    // Busca de alimentos sem rerender: mantém o mesmo input/cursor.
    const fs=document.getElementById('foodSearch'); if(fs){fs.oninput=e=>{state.foodSearch=e.target.value;const q=norm(state.foodSearch);document.querySelectorAll('.foodcards .foodcard').forEach(c=>{c.style.display=!q||norm(c.textContent).includes(q)?'':'none'})}}
    document.querySelectorAll('[data-food-fav]').forEach(b=>b.onclick=async()=>{const all=foodRows(),f=all.find(x=>String(foodId(x))===String(b.dataset.foodFav));if(!f)return;f.favorite=!(String(f.favorite).toLowerCase()==='true'||String(f.favorite).toLowerCase()==='sim'||f.favorite===1);const headers=rows(FILES.nutrition,'Alimentos')[0]?.map(String)||[];await saveSheet(FILES.nutrition,'Alimentos',toRows(all,headers));render()});
    document.querySelectorAll('[data-food-pick]').forEach(b=>b.onclick=()=>{const f=foodRows().find(x=>String(foodId(x))===String(b.dataset.foodPick));if(f){state.foodSearch=foodName(f);render()}});
  };

  // botão global Desfazer no badge cloud.
  setTimeout(()=>{const badge=document.getElementById('afCloudBadge');if(badge&&!document.getElementById('afUndoBtn')){const b=document.createElement('button');b.id='afUndoBtn';b.textContent='Desfazer';b.className='btn';b.style.cssText='margin-left:8px;padding:4px 8px;font-size:11px';b.onclick=window.afUndoLast;badge.appendChild(b)}},1200);

  const st=document.createElement('style');st.textContent='.af-food-quick{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:10px 0}.af-food-chip{padding:6px 9px}.af-import-pending{margin-bottom:14px}';document.head.appendChild(st);
  document.title='AF+ 13.1 — Netlify + Google Sheets';
  console.info('[AF+ 13.1.0] Melhorias pendentes carregadas');
})();
