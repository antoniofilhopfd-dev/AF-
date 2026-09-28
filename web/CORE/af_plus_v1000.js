/* AF+ 11.2.1 — Evolução Geral
   Camada transversal e incremental sobre a v9.1.0.
   Mantém XLSX como fonte oficial e adiciona Central, lixeira, histórico, busca global,
   preferências persistentes, relatórios, diagnóstico, acessibilidade e refinamentos
   por módulo. Integrações externas continuam opcionais e nunca são simuladas. */
(() => {
  const V='11.2.1';
  const BUILD='20260927';
  const LS='afplus:v10:';
  FILES.config='AF_PLUS_CONFIG.xlsx';
  if(!MODS.some(m=>m[0]==='central')) MODS.push(['central','⚙','Central']);
  Object.assign(state,{centralTab:'pending',v10Search:'',v10DataSearch:'',v10HistorySearch:'',v10ReportPeriod:'30'});
  try{Object.assign(state,jread('uiState',{}))}catch{}

  const baseRender=render;
  const baseBind=bind;
  const baseShell=shell;
  const baseSaveSheet=saveSheet;
  const baseSaveGeneric=saveGeneric;

  const jread=(k,d)=>{try{return JSON.parse(localStorage.getItem(LS+k)||'null')??d}catch{return d}};
  const jwrite=(k,v)=>{try{localStorage.setItem(LS+k,JSON.stringify(v))}catch{}};
  const sread=(k,d='')=>{try{return localStorage.getItem(LS+k)??d}catch{return d}};
  const swrite=(k,v)=>{try{localStorage.setItem(LS+k,String(v))}catch{}};
  const low=v=>String(v??'').trim().toLowerCase();
  const yes=v=>['sim','true','1','yes'].includes(low(v));
  const iso=v=>{const s=String(v??'');const m=s.match(/^\d{4}-\d{2}-\d{2}/);return m?m[0]:''};
  const moduleByFile={
    [FILES.nutrition]:'nutrition',[FILES.training]:'training',[FILES.body]:'body',[FILES.agenda]:'agenda',
    [FILES.reading]:'reading',[FILES.media]:'media',[FILES.trips]:'trips',[FILES.integrations]:'integrations',[FILES.config]:'central'
  };
  const feature={
    readOnly:sread('readOnly','0')==='1', density:sread('density','comfortable'), reducedMotion:sread('reducedMotion','0')==='1',
    favorites:jread('favorites',[]), recents:jread('recents',[]), dashOrder:jread('dashOrder',[]), readingShowArchived:sread('readingShowArchived','0')==='1'
  };

  // ---------- Shared helpers ----------
  function moduleLabel(page){return MODS.find(m=>m[0]===page)?.[2]||page}
  function htmlEscape(v){return esc(v)}
  function now(){return new Date().toISOString()}
  function downloadText(name,text,type='application/json'){
    const b=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  }
  function csvEscape(v){const s=typeof v==='object'?JSON.stringify(v):String(v??'');return /[";,\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
  function downloadRowsCSV(name,matrix){downloadText(name,matrix.map(r=>r.map(csvEscape).join(';')).join('\n'),'text/csv;charset=utf-8')}
  function fileBook(file){return state.books?.[file]||{}}
  function sheetCount(file){return Object.keys(fileBook(file)).length}
  function recordCount(file){return Object.values(fileBook(file)).reduce((t,r)=>t+Math.max(0,(r?.length||0)-1),0)}
  function configRows(sheet){return objRows(FILES.config,sheet)}
  async function saveConfigObjects(sheet,objs){const raw=rows(FILES.config,sheet);if(!raw?.length)return;await baseSaveSheet(FILES.config,sheet,toRows(objs,raw[0].map(String)))}
  async function appendConfig(sheet,obj){const raw=rows(FILES.config,sheet);if(!raw?.length)return;const h=raw[0].map(String),all=objRows(FILES.config,sheet);all.push(obj);await baseSaveSheet(FILES.config,sheet,toRows(all,h))}
  async function logAction(acao,page,file,sheet,registroId,resumo,status='OK'){
    try{await appendConfig('Historico_Acoes',{id:`hist-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,dateTime:now(),acao,modulo:page,arquivo:file,planilha:sheet,registroId,resumo,status})}catch(e){console.warn('Histórico não salvo:',e)}
  }
  function addRecent(page,registroId='',rotulo=''){
    if(!page||page==='central')return;
    const item={page,registroId,rotulo:rotulo||moduleLabel(page),at:Date.now()};
    feature.recents=[item,...feature.recents.filter(x=>!(x.page===page&&String(x.registroId)===String(registroId)))].slice(0,12);jwrite('recents',feature.recents);
  }
  function toggleFavorite(page){
    feature.favorites=feature.favorites.includes(page)?feature.favorites.filter(x=>x!==page):[...feature.favorites,page];jwrite('favorites',feature.favorites);render();
  }
  function activePageFile(){return FILES[state.page]||''}
  function currentPageExport(){const file=activePageFile();if(!file)return;downloadText(`AF_PLUS_${String(state.page).toUpperCase()}_${today()}.json`,JSON.stringify({version:V,module:state.page,file,data:fileBook(file)},null,2))}
  function applyBodyPreferences(){document.body.classList.toggle('v10-compact',feature.density==='compact');document.body.classList.toggle('v10-reduced-motion',feature.reducedMotion);document.body.classList.toggle('v10-readonly',feature.readOnly)}
  applyBodyPreferences();

  // ---------- Safe save / read-only ----------
  saveSheet=async function(file,sheet,matrix){
    if(feature.readOnly&&file!==FILES.config){toast('Modo somente leitura ativado');throw new Error('AF+ está em modo somente leitura')}
    try{return await baseSaveSheet(file,sheet,matrix)}catch(e){console.error(e);throw e}
  };

  // ---------- Global shell ----------
  shell=function(content,title='AF+'){
    let html=baseShell(content,title);
    html=html.replace('<button class="btn" id="backup">',`<button class="btn" id="v10ExportModule">Exportar</button><button class="btn" id="v10Print">Imprimir</button><button class="btn" id="backup">`);
    html=html.replace(/AF\+ [0-9.]+<br>build [0-9]+/g,`AF+ ${V}<br>build ${BUILD}`);
    return html;
  };

  // ---------- Central ----------
  function pendingItems(){
    const out=[];
    const opt=optionRows().filter(x=>String(x.calc_status||'OK').toUpperCase()!=='OK');
    if(opt.length)out.push({mod:'nutrition',label:'Opções nutricionais pendentes',count:opt.length,detail:'Dados, quantidade ou conversão ainda incompletos.'});
    const pitems=objRows(FILES.nutrition,'Plano_Nutricionista').filter(x=>!String(x.alimentoId||'').trim());
    if(pitems.length)out.push({mod:'nutrition',label:'Itens do plano não vinculados',count:pitems.length,detail:'Vincule ao alimento padronizado quando desejar.'});
    const inbox=objRows(FILES.training,'Importacao_Atividades').filter(x=>['','pendente'].includes(low(x.reviewStatus)));
    if(inbox.length)out.push({mod:'training',label:'Atividades aguardando revisão',count:inbox.length,detail:'Escolha vincular, salvar como novo ou ignorar.'});
    const agenda=objRows(FILES.agenda,'Agenda').filter(x=>!yes(x.archived));
    const conflicts=[];const seen=new Map();agenda.forEach(x=>{const k=`${iso(x.date)}|${x.start||''}`;if(!iso(x.date)||!x.start)return;if(seen.has(k))conflicts.push([seen.get(k),x]);else seen.set(k,x)});
    if(conflicts.length)out.push({mod:'agenda',label:'Possíveis conflitos de agenda',count:conflicts.length,detail:'Há eventos iniciando no mesmo horário.'});
    const books=readingBooks().filter(x=>readingStatusLabel(x.status)==='Em andamento');
    const missing=books.filter(b=>String(b.type)==='Audiolivro'?!num(b.totalParts):readingProgressType(b)==='Posição'?!num(b.totalPosition):!num(b.totalPages));
    if(missing.length)out.push({mod:'reading',label:'Leituras sem total informado',count:missing.length,detail:'O progresso pode ficar parcial até informar o total.'});
    const conns=objRows(FILES.integrations,'Conexoes').filter(x=>!['conectado','connected','ativo'].includes(low(x.status)));
    if(conns.length)out.push({mod:'integrations',label:'Integrações não conectadas',count:conns.length,detail:'Isto é informativo; o AF+ continua funcionando localmente.'});
    return out;
  }
  function centralPending(){const p=pendingItems();return `<div class="grid smart-kpis">${card('Pendências',p.reduce((t,x)=>t+x.count,0),'itens identificados')}${card('Módulos afetados',new Set(p.map(x=>x.mod)).size,'com atenção')}${card('Modo',feature.readOnly?'Somente leitura':'Edição','configuração atual')}</div><div class="v10-pending-list">${p.map(x=>`<article class="card v10-pending"><div><span class="body-kicker">${htmlEscape(moduleLabel(x.mod))}</span><h3>${htmlEscape(x.label)}</h3><p class="muted">${htmlEscape(x.detail)}</p></div><div class="v10-pending-actions"><strong>${x.count}</strong><button class="btn small" data-v10-go="${x.mod}">Abrir</button></div></article>`).join('')||'<div class="card empty">Nenhuma pendência estrutural identificada.</div>'}</div>`}
  function centralData(){const q=low(state.v10DataSearch);const files=Object.entries(FILES).filter(([k])=>k!=='config'||true).map(([page,file])=>({page,file,sheets:sheetCount(file),records:recordCount(file)})).filter(x=>!q||low(`${x.file} ${x.page}`).includes(q));return `<div class="module-toolbar"><input id="v10DataSearch" placeholder="Buscar arquivo" value="${htmlEscape(state.v10DataSearch)}"><div class="actions"><button class="btn" id="v10BackupCentral">Backup agora</button><button class="btn" id="v10OpenData">Abrir DADOS</button><button class="btn" id="v10ExportAll">Exportar diagnóstico JSON</button></div></div><div class="smart-table-wrap"><table class="table smart-table"><thead><tr><th>Arquivo</th><th>Módulo</th><th>Planilhas</th><th>Registros</th><th>Status</th><th>Ação</th></tr></thead><tbody>${files.map(x=>`<tr><td><strong>${htmlEscape(x.file)}</strong></td><td>${htmlEscape(moduleLabel(x.page))}</td><td>${x.sheets}</td><td>${x.records}</td><td><span class="pill done">OK</span></td><td><button class="btn small" data-v10-go="${x.page==='config'?'central':x.page}">Abrir</button></td></tr>`).join('')}</tbody></table></div>`}
  function centralTrash(){const rowsx=configRows('Lixeira').filter(x=>low(x.status)!=='restaurado').slice().reverse();return `<div class="sectiontitle"><div><h3>Lixeira</h3><span class="muted">Exclusões protegidas realizadas pelas telas genéricas da versão 10.</span></div></div><div class="train-history-list">${rowsx.map(x=>`<article class="train-history-card"><div><span class="body-kicker">${htmlEscape(x.modulo||'')} • ${htmlEscape(x.planilha||'')}</span><h3>${htmlEscape(x.rotulo||x.registroId||'Registro')}</h3><div class="muted">${htmlEscape(x.deletedAt||'')}</div></div><button class="btn" data-v10-restore="${htmlEscape(x.id)}">Restaurar</button></article>`).join('')||'<div class="card empty">A lixeira está vazia.</div>'}</div>`}
  function centralHistory(){const q=low(state.v10HistorySearch);let a=configRows('Historico_Acoes').slice().reverse();if(q)a=a.filter(x=>low(`${x.acao} ${x.modulo} ${x.planilha} ${x.resumo}`).includes(q));return `<div class="module-toolbar"><input id="v10HistorySearch" placeholder="Buscar no histórico" value="${htmlEscape(state.v10HistorySearch)}"><button class="btn" id="v10ExportHistory">Exportar CSV</button></div><div class="smart-table-wrap"><table class="table smart-table"><thead><tr><th>Data</th><th>Ação</th><th>Módulo</th><th>Planilha</th><th>Resumo</th><th>Status</th></tr></thead><tbody>${a.slice(0,200).map(x=>`<tr><td>${htmlEscape(x.dateTime||'')}</td><td>${htmlEscape(x.acao||'')}</td><td>${htmlEscape(x.modulo||'')}</td><td>${htmlEscape(x.planilha||'')}</td><td>${htmlEscape(x.resumo||'')}</td><td>${htmlEscape(x.status||'')}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">Nenhum registro.</td></tr>'}</tbody></table></div>`}
  function centralSettings(){return `<div class="v10-settings-grid"><section class="card"><h3>Interface</h3><div class="field"><label>Densidade</label><select id="v10Density"><option value="comfortable" ${feature.density==='comfortable'?'selected':''}>Confortável</option><option value="compact" ${feature.density==='compact'?'selected':''}>Compacta</option></select></div><label class="v10-switch"><input type="checkbox" id="v10ReducedMotion" ${feature.reducedMotion?'checked':''}> Reduzir animações</label></section><section class="card"><h3>Proteção</h3><label class="v10-switch"><input type="checkbox" id="v10ReadOnly" ${feature.readOnly?'checked':''}> Modo somente leitura</label><p class="muted">Bloqueia gravações nos módulos sem alterar os XLSX. Pode ser desligado aqui.</p></section><section class="card"><h3>Atalhos</h3><div class="v10-shortcuts"><span><kbd>Ctrl</kbd> + <kbd>K</kbd> Busca global</span><span><kbd>Ctrl</kbd> + <kbd>B</kbd> Favoritar módulo</span><span><kbd>Esc</kbd> Fechar janela</span><span><kbd>Alt</kbd> + <kbd>1…9</kbd> Abrir módulos</span></div></section><section class="card"><h3>Portabilidade</h3><p class="muted">XLSX continuam sendo a fonte oficial. Preferências críticas também têm estrutura preparada em AF_PLUS_CONFIG.xlsx.</p><button class="btn" id="v10ExportPrefs">Exportar preferências</button></section></div>`}
  function centralReports(){return `<div class="grid smart-kpis">${card('Relatórios','JSON / CSV','sem alterar dados')}${card('Impressão','Tela atual','layout limpo')}${card('Período',`${state.v10ReportPeriod} dias`,'para resumos')}</div><section class="card"><div class="sectiontitle"><div><h3>Exportar módulos</h3><span class="muted">Escolha um módulo para exportar os dados atualmente carregados.</span></div><select id="v10ReportPeriod"><option value="7" ${state.v10ReportPeriod==='7'?'selected':''}>7 dias</option><option value="30" ${state.v10ReportPeriod==='30'?'selected':''}>30 dias</option><option value="90" ${state.v10ReportPeriod==='90'?'selected':''}>90 dias</option></select></div><div class="v10-report-grid">${MODS.filter(x=>!['overview','central'].includes(x[0])).map(m=>`<button class="btn" data-v10-export-page="${m[0]}">Exportar ${htmlEscape(m[2])}</button>`).join('')}</div></section>`}
  function centralDiagnostics(){const allFiles=[...new Set(Object.values(FILES))];const totalSheets=allFiles.reduce((t,f)=>t+sheetCount(f),0),totalRecords=allFiles.reduce((t,f)=>t+recordCount(f),0);return `<div class="grid smart-kpis">${card('Versão',V,`build ${BUILD}`)}${card('XLSX',allFiles.length,'arquivos carregados')}${card('Planilhas',totalSheets,'estruturas')}${card('Registros',totalRecords,'linhas carregadas')}</div><section class="card"><h3>Diagnóstico da sessão</h3><div class="v10-diagnostic-list"><div><span>Navegador</span><strong>${htmlEscape(navigator.userAgent)}</strong></div><div><span>Modo</span><strong>${feature.readOnly?'Somente leitura':'Edição'}</strong></div><div><span>Online</span><strong>${navigator.onLine?'Sim':'Não'}</strong></div><div><span>Armazenamento</span><strong>XLSX local</strong></div><div><span>Integrações</span><strong>Opcionais / não simuladas</strong></div></div><div class="actions"><button class="btn" id="v10RunHealth">Executar checagem</button><button class="btn" id="v10DownloadDiagnostic">Baixar diagnóstico</button></div></section>`}
  function central(){const tabs=[['pending','Pendências'],['data','Dados'],['trash','Lixeira'],['history','Histórico'],['settings','Configurações'],['reports','Relatórios'],['diagnostic','Diagnóstico']];let body='';if(state.centralTab==='pending')body=centralPending();if(state.centralTab==='data')body=centralData();if(state.centralTab==='trash')body=centralTrash();if(state.centralTab==='history')body=centralHistory();if(state.centralTab==='settings')body=centralSettings();if(state.centralTab==='reports')body=centralReports();if(state.centralTab==='diagnostic')body=centralDiagnostics();return shell(hero('CENTRAL AF+','Dados, pendências, segurança, relatórios e preferências em um só lugar.')+tabsHTML(tabs,state.centralTab)+body,'Central')}
  function tabsHTML(defs,active){return `<div class="tabs v10-central-tabs">${defs.map(([id,l])=>`<button class="tab ${active===id?'active':''}" data-v10-central="${id}">${l}</button>`).join('')}</div>`}

  // ---------- Global search ----------
  function searchIndex(q){const nq=low(q);if(!nq)return[];const results=[];Object.entries(state.books||{}).forEach(([file,book])=>{const page=moduleByFile[file]||'central';Object.entries(book||{}).forEach(([sheet,matrix])=>{if(!Array.isArray(matrix)||matrix.length<2)return;const h=(matrix[0]||[]).map(String);matrix.slice(1).forEach((r,i)=>{if(!r||!r.some(v=>v!==null&&v!==''&&v!==undefined))return;const text=r.map(v=>typeof v==='object'?JSON.stringify(v):String(v??'')).join(' ');if(low(text).includes(nq)){const obj=Object.fromEntries(h.map((k,j)=>[k,r[j]]));const label=obj.title||obj.name||obj.opcaoNome||obj.opcao_nome||obj.description||obj.item||obj.place||obj.date||obj.id||`Linha ${i+2}`;results.push({page,file,sheet,row:i+2,id:obj.id||'',label:String(label),preview:text.slice(0,180)})}})})});return results.slice(0,100)}
  function globalSearchModal(q=''){state.v10Search=q;const rs=searchIndex(q);state.modal=`<div class="modalhead"><div><h3>Busca global</h3><div class="muted">Pesquise em todos os módulos e XLSX carregados.</div></div><button class="x" data-close>×</button></div><input class="v10-search-input" id="v10SearchInput" autofocus placeholder="Digite para buscar…" value="${htmlEscape(q)}"><div class="v10-search-results">${q?(rs.map(r=>`<button class="v10-search-result" data-v10-search-go="${htmlEscape(r.page)}"><span class="body-kicker">${htmlEscape(moduleLabel(r.page))} • ${htmlEscape(r.sheet)}</span><strong>${htmlEscape(r.label)}</strong><small>${htmlEscape(r.preview)}</small></button>`).join('')||'<div class="card empty">Nenhum resultado.</div>'):'<div class="card empty">Comece digitando um nome, data, categoria ou observação.</div>'}</div>`;render();setTimeout(()=>document.getElementById('v10SearchInput')?.focus(),0)}

  // ---------- Delete / trash / history ----------
  deleteGeneric=async function(page,sheet,id){
    if(feature.readOnly){toast('Modo somente leitura ativado');return}
    const file=FILES[page],raw=rows(file,sheet),headers=(raw[0]||[]).map(String),all=objRows(file,sheet),item=all.find(x=>String(x.id||'')===String(id));if(!item)return;
    if(!confirm('Mover este registro para a lixeira? Você poderá restaurá-lo pela Central.'))return;
    const trash={id:`trash-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,modulo:page,arquivo:file,planilha:sheet,registroId:id,rotulo:genericRowTitle?.(page,sheet,item)||item.title||item.name||id,payloadJson:JSON.stringify(item),deletedAt:now(),restoredAt:'',status:'Excluído'};
    try{await appendConfig('Lixeira',trash)}catch(e){console.warn(e)}
    await saveSheet(file,sheet,toRows(all.filter(x=>String(x.id||'')!==String(id)),headers));
    await logAction('Excluir',page,file,sheet,id,`Movido para a lixeira: ${trash.rotulo}`);render();
  };
  saveGeneric=async function(page,sheet,id=''){
    await baseSaveGeneric(page,sheet,id);
    await logAction(id?'Editar':'Criar',page,FILES[page],sheet,id||'',`${id?'Registro atualizado':'Novo registro criado'} em ${sheet}`);
  };
  async function restoreTrash(trashId){
    const all=configRows('Lixeira'),t=all.find(x=>String(x.id)===String(trashId));if(!t)return;const file=t.arquivo,sheet=t.planilha;let obj;try{obj=JSON.parse(t.payloadJson)}catch{return toast('Não foi possível ler este item da lixeira')}
    const raw=rows(file,sheet);if(!raw?.length)return toast('Planilha de origem não encontrada');const h=raw[0].map(String),objs=objRows(file,sheet);if(objs.some(x=>String(x.id||'')===String(obj.id||'')))return toast('Já existe um registro com o mesmo ID');
    objs.push(obj);await saveSheet(file,sheet,toRows(objs,h));t.status='Restaurado';t.restoredAt=now();await saveConfigObjects('Lixeira',all);await logAction('Restaurar',t.modulo,file,sheet,t.registroId,`Restaurado: ${t.rotulo}`);toast('Registro restaurado');render();
  }

  // ---------- Dashboard and module intelligence ----------
  function countTodayNutrition(){const t=today(),cons=consumptionRows().filter(x=>iso(x.date)===t),meals=mealNames();const registered=new Set(cons.map(x=>String(x.meal||'')));return{cons,registered:[...registered],missing:meals.filter(m=>!registered.has(m)).length}}
  function remainingTodayHTML(){const n=countTodayNutrition();const tr=trainingRows().filter(x=>iso(x.date)===today()&&low(x.status)!=='executado');const ag=objRows(FILES.agenda,'Agenda').filter(x=>iso(x.date)===today()&&!yes(x.archived)&&!low(x.status).includes('cancel'));const rp=readingPlanForDate?.(today())||[];const total=n.missing+tr.length+ag.length+rp.length;return `<section class="card v10-today-focus"><div class="sectiontitle"><div><span class="body-kicker">HOJE</span><h3>O que ainda está no radar</h3></div><strong>${total}</strong></div><div class="v10-today-grid"><button data-v10-go="nutrition"><strong>${n.missing}</strong><span>refeições sem registro</span></button><button data-v10-go="training"><strong>${tr.length}</strong><span>treinos planejados</span></button><button data-v10-go="agenda"><strong>${ag.length}</strong><span>eventos de hoje</span></button><button data-v10-go="reading"><strong>${rp.length}</strong><span>leituras planejadas</span></button></div></section>`}
  if(typeof overview==='function'){
    const oldOverview=overview;overview=function(){let h=oldOverview();return h.replace('</div></section></div>',`${remainingTodayHTML()}</div></section></div>`)};
  }
  function weightSparkline(){const w=objRows(FILES.body,'Peso').slice(-30).map(x=>({d:iso(x.date),v:num(x.weightKg)})).filter(x=>x.d&&x.v);if(w.length<2)return'';const vals=w.map(x=>x.v),min=Math.min(...vals),max=Math.max(...vals),span=max-min||1;const pts=w.map((x,i)=>`${(i/(w.length-1))*100},${36-((x.v-min)/span)*30}`).join(' ');return `<svg class="v10-spark" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="${pts}" fill="none" vector-effect="non-scaling-stroke"></polyline></svg>`}
  function bodyEnhancement(){const w=objRows(FILES.body,'Peso').slice().sort((a,b)=>String(a.date).localeCompare(String(b.date)));const sources=[...new Set(w.map(x=>x.source||'Não informado'))];let alerts=0;for(let i=1;i<w.length;i++){if(Math.abs(num(w[i].weightKg)-num(w[i-1].weightKg))>=5)alerts++}return `<section class="card v10-module-insight"><div class="sectiontitle"><div><span class="body-kicker">QUALIDADE DOS DADOS</span><h3>Peso e origens</h3></div><span class="pill">${w.length} registros</span></div>${weightSparkline()}<div class="v10-chiprow">${sources.map(s=>`<span>${htmlEscape(s)}</span>`).join('')}</div>${alerts?`<p class="muted">${alerts} valor(es) ficaram muito diferentes do registro anterior. Vale apenas confirmar se foram digitados corretamente.</p>`:''}</section>`}
  function nutritionEnhancement(){const t=today(),cons=consumptionRows().filter(x=>iso(x.date)===t),registered=new Set(cons.map(x=>String(x.meal||''))),planItems=objRows(FILES.nutrition,'Plano_Nutricionista'),unlinked=planItems.filter(x=>!String(x.alimentoId||'').trim()).length,total=cons.reduce((s,x)=>s+num(x.kcal),0);return `<section class="card v10-module-insight"><div class="sectiontitle"><div><span class="body-kicker">CONSUMO REAL</span><h3>Resumo de hoje</h3></div></div><div class="grid smart-kpis">${card('Refeições registradas',registered.size,'de '+mealNames().length)}${card('Registros',cons.length,'consumos')}${card('Total',fmt(total)+' kcal','registradas')}${card('Plano pendente',unlinked,'itens sem vínculo')}</div></section>`}
  function trainingEnhancement(){const inbox=objRows(FILES.training,'Importacao_Atividades').filter(x=>['','pendente'].includes(low(x.reviewStatus))),plans=trainingRows().filter(x=>iso(x.date)===today()&&low(x.status)==='planejado'),done=trainingRows().filter(x=>iso(x.date)===today()&&low(x.status)==='executado');return `<section class="card v10-module-insight"><div class="sectiontitle"><div><span class="body-kicker">FLUXO</span><h3>Treinos de hoje</h3></div></div><div class="grid smart-kpis">${card('Planejados',plans.length)}${card('Executados',done.length)}${card('Revisão',inbox.length,'atividades importadas')}${card('Arquivados',trainingRows().filter(x=>yes(x.archived)).length)}</div></section>`}
  function readingEnhancement(){const books=readingBooks().filter(x=>!yes(x.archived)),ss=readingSessions(),active=books.filter(x=>readingStatusLabel(x.status)==='Em andamento');return `<section class="card v10-module-insight"><div class="sectiontitle"><div><span class="body-kicker">CONTINUIDADE</span><h3>Último concluído × próximo início</h3></div></div><div class="v10-reading-cont">${active.slice(0,6).map(b=>{const x=readingBookSessions(b.id).at(-1);let last='—',next=readingBookMarker(b);if(x){if(String(b.type)==='Audiolivro')last=x.endPart||x.part||'—';else if(readingProgressType(b)==='Posição')last=x.endPosition||x.position||'—';else last=x.endPage||x.page||'—'}return `<div><strong>${htmlEscape(b.title)}</strong><span>Último concluído: ${htmlEscape(last)}</span><span>${next}</span></div>`}).join('')||'<span class="muted">Nenhum título em andamento.</span>'}</div></section>`}
  function agendaEnhancement(){const a=objRows(FILES.agenda,'Agenda').filter(x=>!yes(x.archived));const map=new Map(),conf=[];a.forEach(x=>{const k=`${iso(x.date)}|${x.start||''}`;if(iso(x.date)&&x.start){if(map.has(k))conf.push(x);else map.set(k,x)}});const next=a.filter(x=>iso(x.date)>=today()).sort((x,y)=>`${x.date}${x.start||''}`.localeCompare(`${y.date}${y.start||''}`))[0];return `<section class="card v10-module-insight"><div class="grid smart-kpis">${card('Conflitos possíveis',conf.length,'mesmo início')}${card('Próximo',next?brDate(next.date):'—',next?.title||'sem compromisso futuro')}${card('Fixados',a.filter(x=>yes(x.pinned)).length)}${card('Arquivados',objRows(FILES.agenda,'Agenda').filter(x=>yes(x.archived)).length)}</div></section>`}
  function mediaEnhancement(){const a=objRows(FILES.media,'Midia').filter(x=>!yes(x.archived));return `<section class="card v10-module-insight"><div class="grid smart-kpis">${card('Continuar',a.filter(x=>['assistindo','em andamento'].includes(low(x.status))).length)}${card('Quero ver',a.filter(x=>low(x.status)==='quero ver').length)}${card('Favoritos',a.filter(x=>yes(x.favorite)).length)}${card('Concluídos',a.filter(x=>low(x.status).includes('concl')).length)}</div></section>`}
  function tripEnhancement(){const a=objRows(FILES.trips,'Viagens').filter(x=>!yes(x.archived));const next=a.filter(x=>iso(x.startDate)>=today()).sort((x,y)=>String(x.startDate).localeCompare(String(y.startDate)))[0];return `<section class="card v10-module-insight"><div class="grid smart-kpis">${card('Viagens',a.length)}${card('Próxima',next?brDate(next.startDate):'—',next?.destination||'')}${card('Reservas',objRows(FILES.trips,'Reservas').length)}${card('Checklist',objRows(FILES.trips,'Checklist').filter(x=>!yes(x.done)).length,'pendentes')}</div></section>`}
  function integrationEnhancement(){const c=objRows(FILES.integrations,'Conexoes');return `<section class="card v10-module-insight"><div class="grid smart-kpis">${card('Conectados',c.filter(x=>['conectado','connected','ativo'].includes(low(x.status))).length)}${card('Não conectados',c.filter(x=>!['conectado','connected','ativo'].includes(low(x.status))).length)}${card('Imports',objRows(FILES.integrations,'Importacoes').length)}${card('Erros recentes',c.filter(x=>String(x.lastError||'').trim()).length)}</div><p class="muted">O AF+ nunca simula sincronização: serviços não autorizados continuam apenas como “não conectados”.</p></section>`}
  function addInsight(html){const content=document.querySelector('.content');if(!content||document.querySelector('.v10-module-insight'))return;const box=document.createElement('div');box.innerHTML=html;content.appendChild(box.firstElementChild)}

  // ---------- Plan comparison ----------
  function planCompareModal(){const vers=objRows(FILES.nutrition,'Planos_Versoes'),items=objRows(FILES.nutrition,'Plano_Nutricionista');if(vers.length<2){toast('É preciso ter pelo menos duas versões do plano para comparar');return}const a=vers.at(-2),b=vers.at(-1);const key=x=>`${x.refeicao}|${x.opcaoNome}|${x.itemOrdem}`;const am=new Map(items.filter(x=>String(x.versaoPlano)===String(a.id)).map(x=>[key(x),x]));const bm=new Map(items.filter(x=>String(x.versaoPlano)===String(b.id)).map(x=>[key(x),x]));const keys=[...new Set([...am.keys(),...bm.keys()])];const changes=keys.map(k=>({a:am.get(k),b:bm.get(k)})).filter(x=>JSON.stringify(x.a||{})!==JSON.stringify(x.b||{}));state.modal=`<div class="modalhead"><div><h3>Comparar planos</h3><div class="muted">${htmlEscape(a.nome||a.id)} × ${htmlEscape(b.nome||b.id)}</div></div><button class="x" data-close>×</button></div><div class="v10-compare-list">${changes.slice(0,100).map(x=>`<div class="card"><strong>${htmlEscape(x.b?.refeicao||x.a?.refeicao||'')}</strong><span>${htmlEscape(x.a?.textoOriginal||'—')} → ${htmlEscape(x.b?.textoOriginal||'—')}</span><small>${htmlEscape(`${x.a?.quantidade??'—'} ${x.a?.unidade||''} → ${x.b?.quantidade??'—'} ${x.b?.unidade||''}`)}</small></div>`).join('')||'<div class="card empty">Nenhuma diferença encontrada.</div>'}</div>`;render()}

  // ---------- Rendering / post render ----------
  function persistUiState(){const keys=['page','nutTab','trainTab','bodyTab','readingTab','media2Tab','trip2Tab','int2Tab','foodSearch','foodCategory','optionSearch','optionMealFilter','trainHistoryFilter','trainHistorySource','trainEvoPeriod','readingSearch','readingStatus','readingType','readingSort','centralTab'];const snap={};keys.forEach(k=>{if(state[k]!==undefined)snap[k]=state[k]});jwrite('uiState',snap)}
  render=function(){
    persistUiState();
    if(state.page==='central'){app.innerHTML=central();bind();return}
    baseRender();
  };
  function applyDashboardOrder(){const grid=document.querySelector('.af9-dashboard');if(!grid)return;const cards=[...grid.children];cards.forEach((c,i)=>{const key=low(c.querySelector('h3')?.textContent||'').replace(/[^a-z0-9]+/g,'-');c.dataset.v10Card=key;c.draggable=true;c.addEventListener('dragstart',()=>c.classList.add('dragging'));c.addEventListener('dragend',()=>{c.classList.remove('dragging');feature.dashOrder=[...grid.children].map(x=>x.dataset.v10Card);jwrite('dashOrder',feature.dashOrder)});c.addEventListener('dragover',e=>{e.preventDefault();const d=grid.querySelector('.dragging');if(d&&d!==c){const r=c.getBoundingClientRect();grid.insertBefore(d,e.clientY<r.top+r.height/2?c:c.nextSibling)}})});if(feature.dashOrder.length){const map=new Map(cards.map(c=>[c.dataset.v10Card,c]));feature.dashOrder.forEach(k=>{const c=map.get(k);if(c)grid.appendChild(c)})}}
  function mobileNav(){document.querySelector('.v10-bottom-nav')?.remove();if(innerWidth>760)return;const n=document.createElement('nav');n.className='v10-bottom-nav';[['overview','⌂'],['nutrition','◉'],['training','◈'],['agenda','□'],['central','⚙']].forEach(([p,i])=>{const b=document.createElement('button');b.dataset.v10Go=p;b.className=state.page===p?'active':'';b.innerHTML=`<span>${i}</span><small>${moduleLabel(p)}</small>`;n.appendChild(b)});document.body.appendChild(n)}
  function a11y(){document.querySelectorAll('button:not([aria-label])').forEach(b=>{const t=b.textContent.trim();if(t)b.setAttribute('aria-label',t)});document.querySelectorAll('input,select,textarea').forEach(el=>{if(!el.getAttribute('aria-label')){const lab=el.closest('.field')?.querySelector('label')?.textContent?.trim();if(lab)el.setAttribute('aria-label',lab)}})}
  function enhanceTables(){
    document.querySelectorAll('.smart-table').forEach((table,ti)=>{
      if(table.dataset.v10Enhanced)return;table.dataset.v10Enhanced='1';
      const wrap=table.closest('.smart-table-wrap')||table.parentElement;
      const key=`${state.page}:${ti}`;const saved=sread(`tableSearch:${key}`,'');
      const bar=document.createElement('div');bar.className='v10-table-tools';bar.innerHTML=`<input data-v10-table-search="${ti}" placeholder="Filtrar tabela" value="${htmlEscape(saved)}"><button class="btn small" data-v10-table-csv="${ti}">CSV</button><button class="btn small" data-v10-table-cols="${ti}">Colunas</button>`;wrap.parentElement?.insertBefore(bar,wrap);
      const filter=q=>{swrite(`tableSearch:${key}`,q);[...table.tBodies[0]?.rows||[]].forEach(r=>r.style.display=low(r.innerText).includes(low(q))?'':'none')};filter(saved);
      bar.querySelector('[data-v10-table-search]')?.addEventListener('input',e=>filter(e.target.value));
      bar.querySelector('[data-v10-table-csv]')?.addEventListener('click',()=>{const matrix=[[...table.tHead.rows[0].cells].map(c=>c.innerText),...[...table.tBodies[0].rows].filter(r=>r.style.display!=='none').map(r=>[...r.cells].map(c=>c.innerText))];downloadRowsCSV(`AF_PLUS_${state.page}_${today()}.csv`,matrix)});
      bar.querySelector('[data-v10-table-cols]')?.addEventListener('click',()=>columnChooser(table,key));
      const hidden=jread(`hiddenCols:${key}`,[]);applyHiddenColumns(table,hidden);
      [...table.tHead.rows[0].cells].forEach((th,idx)=>{th.classList.add('v10-sortable');th.addEventListener('click',e=>{if(e.target.closest('button'))return;const rowsx=[...table.tBodies[0].rows],asc=th.dataset.sortDir!=='asc';[...table.tHead.rows[0].cells].forEach(x=>delete x.dataset.sortDir);th.dataset.sortDir=asc?'asc':'desc';rowsx.sort((a,b)=>{const av=a.cells[idx]?.innerText||'',bv=b.cells[idx]?.innerText||'';const an=Number(av.replace(',','.')),bn=Number(bv.replace(',','.'));const cmp=Number.isFinite(an)&&Number.isFinite(bn)?an-bn:av.localeCompare(bv,'pt-BR',{numeric:true});return asc?cmp:-cmp}).forEach(r=>table.tBodies[0].appendChild(r))})});
    });
  }
  function applyHiddenColumns(table,hidden){[...table.rows].forEach(r=>[...r.cells].forEach((c,i)=>c.style.display=hidden.includes(i)?'none':''))}
  function columnChooser(table,key){const heads=[...table.tHead.rows[0].cells].map(x=>x.innerText),hidden=jread(`hiddenCols:${key}`,[]);state.modal=`<div class="modalhead"><div><h3>Colunas visíveis</h3><div class="muted">A preferência fica salva neste dispositivo.</div></div><button class="x" data-close>×</button></div><div class="af9-checks">${heads.map((h,i)=>`<label><input type="checkbox" data-v10-col="${i}" ${hidden.includes(i)?'':'checked'}> ${htmlEscape(h)}</label>`).join('')}</div><div class="modalactions"><button class="btn primary" id="v10SaveCols">Salvar</button></div>`;render();setTimeout(()=>document.getElementById('v10SaveCols')?.addEventListener('click',()=>{const off=[...document.querySelectorAll('[data-v10-col]')].filter(x=>!x.checked).map(x=>Number(x.dataset.v10Col));jwrite(`hiddenCols:${key}`,off);state.modal=null;render()}),0)}
  function enhanceNutritionPlanFilter(){
    if(state.page!=='nutrition'||state.nutTab!=='plan')return;const groups=document.querySelector('.np-groups');if(!groups||document.getElementById('v10PlanFilter'))return;
    const meals=[...new Set(objRows(FILES.nutrition,'Plano_Nutricionista').map(x=>x.refeicao).filter(Boolean))];const bar=document.createElement('div');bar.id='v10PlanFilter';bar.className='v10-plan-filter';bar.innerHTML=`<input id="v10PlanSearch" placeholder="Buscar no plano" value="${htmlEscape(sread('planSearch',''))}"><select id="v10PlanMeal"><option value="">Todas as refeições</option>${meals.map(m=>`<option value="${htmlEscape(m)}">${htmlEscape(m)}</option>`).join('')}</select><button class="btn" id="v10FoodDuplicates">Possíveis alimentos duplicados</button>`;groups.parentElement.insertBefore(bar,groups);
    const apply=()=>{const q=low(document.getElementById('v10PlanSearch')?.value),meal=low(document.getElementById('v10PlanMeal')?.value);swrite('planSearch',q);[...groups.querySelectorAll('.np-option')].forEach(c=>{const text=low(c.innerText);c.style.display=(!q||text.includes(q))&&(!meal||text.includes(meal))?'':'none'})};document.getElementById('v10PlanSearch').oninput=apply;document.getElementById('v10PlanMeal').onchange=apply;document.getElementById('v10FoodDuplicates').onclick=foodDuplicateModal;apply();
  }
  function foodDuplicateGroups(){const foods=foodRows();const norm=n=>low(n).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();const groups=new Map();foods.forEach(f=>{const k=norm(foodName(f));if(!k)return;const arr=groups.get(k)||[];arr.push(f);groups.set(k,arr)});return [...groups.values()].filter(x=>x.length>1)}
  function foodDuplicateModal(){const groups=foodDuplicateGroups();state.modal=`<div class="modalhead"><div><h3>Possíveis alimentos duplicados</h3><div class="muted">Apenas nomes normalizados iguais são sinalizados. Nada é mesclado automaticamente.</div></div><button class="x" data-close>×</button></div><div class="v10-compare-list">${groups.map(g=>`<div class="card"><strong>${htmlEscape(foodName(g[0]))}</strong>${g.map(f=>`<span>${htmlEscape(f.id)} • ${htmlEscape(f.brand||'sem marca')} • ${htmlEscape(f.portion||'')} ${htmlEscape(f.unit||'')}</span>`).join('')}</div>`).join('')||'<div class="card empty">Nenhum duplicado exato encontrado.</div>'}</div>`;render()}
  function enhanceReadingArchive(){if(state.page!=='reading'||state.readingTab!=='library')return;const head=[...document.querySelectorAll('.sectiontitle')].find(x=>x.textContent.includes('Biblioteca'));if(head&&!document.getElementById('v10ReadingArchived')){const b=document.createElement('button');b.className='btn';b.id='v10ReadingArchived';b.textContent=feature.readingShowArchived?'Ocultar arquivados':'Mostrar arquivados';head.appendChild(b);b.onclick=()=>{feature.readingShowArchived=!feature.readingShowArchived;swrite('readingShowArchived',feature.readingShowArchived?'1':'0');render()}}document.querySelectorAll('.read-book-row').forEach(row=>{const id=row.querySelector('[data-read-detail]')?.dataset.readDetail;const book=id?readingBook(id):null;if(book&&yes(book.archived)&&!feature.readingShowArchived)row.style.display='none'})}
  function postRender(){applyBodyPreferences();applyDashboardOrder();mobileNav();a11y();enhanceTables();enhanceNutritionPlanFilter();enhanceReadingArchive();if(state.page==='body')addInsight(bodyEnhancement());if(state.page==='nutrition'){addInsight(nutritionEnhancement());if(state.nutTab==='plan'){const toolbar=document.querySelector('.np-version-toolbar');if(toolbar&&!document.getElementById('v10PlanCompare')){const b=document.createElement('button');b.className='btn';b.id='v10PlanCompare';b.textContent='Comparar versões';toolbar.appendChild(b);b.onclick=planCompareModal}}}if(state.page==='training'){addInsight(trainingEnhancement());enhanceTrainingImport()}if(state.page==='reading')addInsight(readingEnhancement());if(state.page==='agenda')addInsight(agendaEnhancement());if(state.page==='media')addInsight(mediaEnhancement());if(state.page==='trips')addInsight(tripEnhancement());if(state.page==='integrations')addInsight(integrationEnhancement())}
  function enhanceTrainingImport(){const panel=document.querySelector('.import-panel');if(panel&&!panel.dataset.v10Drop){panel.dataset.v10Drop='1';panel.classList.add('v10-dropzone');['dragenter','dragover'].forEach(ev=>panel.addEventListener(ev,e=>{e.preventDefault();panel.classList.add('dragover')}));['dragleave','drop'].forEach(ev=>panel.addEventListener(ev,e=>{e.preventDefault();panel.classList.remove('dragover')}));panel.addEventListener('drop',e=>{const inp=document.getElementById('trainImportFile');if(inp&&e.dataTransfer?.files?.length){try{inp.files=e.dataTransfer.files;inp.dispatchEvent(new Event('change',{bubbles:true}))}catch{toast('Use o seletor de arquivos para este navegador')}}})}
    const title=[...document.querySelectorAll('.sectiontitle')].find(x=>x.textContent.includes('Caixa de revisão'));if(title&&!document.getElementById('v10ReviewBulk')){const bulk=document.createElement('div');bulk.id='v10ReviewBulk';bulk.className='actions';bulk.innerHTML='<button class="btn small" id="v10AllNew">Todos como novo</button><button class="btn small" id="v10AllIgnore">Ignorar todos</button>';title.appendChild(bulk);document.getElementById('v10AllNew').onclick=()=>document.querySelectorAll('[data-review-choice="new"]').forEach(b=>b.click());document.getElementById('v10AllIgnore').onclick=()=>{if(confirm('Marcar todas as pendências como ignoradas?'))document.querySelectorAll('[data-review-choice="ignore"]').forEach(b=>b.click())}}
  }

  // ---------- Diagnostics ----------
  function diagnosticObject(){const files=Object.values(FILES).filter((v,i,a)=>a.indexOf(v)===i).map(file=>({file,sheets:sheetCount(file),records:recordCount(file),loaded:!!state.books?.[file]}));return{version:V,build:BUILD,dateTime:now(),online:navigator.onLine,userAgent:navigator.userAgent,readOnly:feature.readOnly,pending:pendingItems(),files}}
  async function runHealth(){const d=diagnosticObject();const ok=d.files.every(x=>x.loaded);try{await appendConfig('Diagnosticos',{id:`diag-${Date.now()}`,dateTime:now(),tipo:'health-check',status:ok?'OK':'AVISO',resumo:ok?'Todos os XLSX esperados estão carregados':'Há arquivo esperado não carregado',detalhesJson:JSON.stringify(d)})}catch{}toast(ok?'Checagem concluída: estrutura carregada':'Checagem concluída com avisos');render()}

  // ---------- Bind ----------
  bind=function(){
    baseBind();
    addRecent(state.page);
    const oldGlobalSearch=document.getElementById('globalSearch');
    if(oldGlobalSearch){const g=oldGlobalSearch.cloneNode(true);oldGlobalSearch.replaceWith(g);g.addEventListener('click',()=>globalSearchModal(''))}
    document.querySelectorAll('[data-v10-go]').forEach(b=>b.onclick=()=>{state.page=b.dataset.v10Go;state.modal=null;render()});
    document.getElementById('v10ExportModule')?.addEventListener('click',currentPageExport);
    document.getElementById('v10Print')?.addEventListener('click',()=>window.print());
    document.querySelectorAll('[data-v10-central]').forEach(b=>b.onclick=()=>{state.centralTab=b.dataset.v10Central;render()});
    document.getElementById('v10DataSearch')?.addEventListener('input',e=>{state.v10DataSearch=e.target.value;render()});
    document.getElementById('v10HistorySearch')?.addEventListener('input',e=>{state.v10HistorySearch=e.target.value;render()});
    document.getElementById('v10BackupCentral')?.addEventListener('click',()=>document.getElementById('backup')?.click());
    document.getElementById('v10OpenData')?.addEventListener('click',()=>fetch('/api/open-data'));
    document.getElementById('v10ExportAll')?.addEventListener('click',()=>downloadText(`AF_PLUS_DIAGNOSTICO_${today()}.json`,JSON.stringify(diagnosticObject(),null,2)));
    document.querySelectorAll('[data-v10-restore]').forEach(b=>b.onclick=()=>restoreTrash(b.dataset.v10Restore));
    document.getElementById('v10ExportHistory')?.addEventListener('click',()=>{const raw=rows(FILES.config,'Historico_Acoes');downloadRowsCSV(`AF_PLUS_HISTORICO_${today()}.csv`,raw)});
    document.getElementById('v10Density')?.addEventListener('change',e=>{feature.density=e.target.value;swrite('density',feature.density);applyBodyPreferences();render()});
    document.getElementById('v10ReducedMotion')?.addEventListener('change',e=>{feature.reducedMotion=e.target.checked;swrite('reducedMotion',feature.reducedMotion?'1':'0');applyBodyPreferences()});
    document.getElementById('v10ReadOnly')?.addEventListener('change',e=>{feature.readOnly=e.target.checked;swrite('readOnly',feature.readOnly?'1':'0');applyBodyPreferences();toast(feature.readOnly?'Modo somente leitura ativado':'Edição reativada');render()});
    document.getElementById('v10ExportPrefs')?.addEventListener('click',()=>downloadText(`AF_PLUS_PREFERENCIAS_${today()}.json`,JSON.stringify(feature,null,2)));
    document.getElementById('v10ReportPeriod')?.addEventListener('change',e=>{state.v10ReportPeriod=e.target.value;render()});
    document.querySelectorAll('[data-v10-export-page]').forEach(b=>b.onclick=()=>{const file=FILES[b.dataset.v10ExportPage];downloadText(`AF_PLUS_${b.dataset.v10ExportPage.toUpperCase()}_${today()}.json`,JSON.stringify(fileBook(file),null,2))});
    document.getElementById('v10RunHealth')?.addEventListener('click',runHealth);
    document.getElementById('v10DownloadDiagnostic')?.addEventListener('click',()=>downloadText(`AF_PLUS_DIAGNOSTICO_${today()}.json`,JSON.stringify(diagnosticObject(),null,2)));
    const sin=document.getElementById('v10SearchInput');if(sin)sin.oninput=e=>globalSearchModal(e.target.value);
    document.querySelectorAll('[data-v10-search-go]').forEach(b=>b.onclick=()=>{state.page=b.dataset.v10SearchGo;state.modal=null;render()});
    document.getElementById('v10PlanCompare')?.addEventListener('click',planCompareModal);
    postRender();
  };

  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();e.stopImmediatePropagation();globalSearchModal('');return}
    if(e.key==='Escape'&&state.modal){e.stopImmediatePropagation();state.modal=null;render();return}
    if(e.altKey&&/^[1-9]$/.test(e.key)){const mods=MODS.filter(x=>x[0]!=='central');const m=mods[Number(e.key)-1];if(m){e.preventDefault();e.stopImmediatePropagation();state.page=m[0];state.modal=null;render()}}
  },true);
  window.addEventListener('resize',()=>mobileNav());

  // ---------- Extra metadata in Treinos / Leitura ----------
  if(typeof trainingModal==='function'&&typeof saveTraining==='function'){
    const trainingModalBaseV10=trainingModal, saveTrainingBaseV10=saveTraining;
    trainingModal=function(id='',preset={}){trainingModalBaseV10(id,preset);setTimeout(()=>{const x=trainingRows().find(r=>String(r.id||'')===String(id))||preset||{};const grid=document.querySelector('#modalback .formgrid');if(grid&&!document.getElementById('trTagsV10')){const box=document.createElement('div');box.className='v10-extra-fields';box.innerHTML=`<div class="field"><label>Favorito</label><select id="trFavoriteV10"><option value="Não" ${yes(x.favorite)?'':'selected'}>Não</option><option value="Sim" ${yes(x.favorite)?'selected':''}>Sim</option></select></div><div class="field"><label>Arquivado</label><select id="trArchivedV10"><option value="Não" ${yes(x.archived)?'':'selected'}>Não</option><option value="Sim" ${yes(x.archived)?'selected':''}>Sim</option></select></div><div class="field full"><label>Tags</label><input id="trTagsV10" value="${htmlEscape(x.tags||'')}" placeholder="Ex.: corrida, prova, esteira"></div>`;grid.appendChild(box)}} ,0)};
    saveTraining=async function(id=''){
      const meta={favorite:document.getElementById('trFavoriteV10')?.value||'Não',archived:document.getElementById('trArchivedV10')?.value||'Não',tags:document.getElementById('trTagsV10')?.value.trim()||''};
      const before=new Set(trainingRows().map(x=>String(x.id||'')));await saveTrainingBaseV10(id);const all=trainingRows();let target=id?all.find(x=>String(x.id)===String(id)):all.find(x=>!before.has(String(x.id||'')))||all.at(-1);if(!target)return;Object.assign(target,meta,{updatedAt:now()});const h=rows(FILES.training,'Treinos')[0].map(String);await saveSheet(FILES.training,'Treinos',toRows(all,h));render();
    };
  }
  if(typeof readingBookModal==='function'&&typeof saveReadingBook==='function'){
    const readingModalBaseV10=readingBookModal, saveReadingBaseV10=saveReadingBook;
    readingBookModal=function(id=''){readingModalBaseV10(id);setTimeout(()=>{const b=id?readingBook(id):{};const grid=document.querySelector('#modalback .formgrid');if(grid&&!document.getElementById('rbTagsV10')){const box=document.createElement('div');box.className='v10-extra-fields';box.innerHTML=`<div class="field full"><label>URL da capa</label><input id="rbCoverV10" value="${htmlEscape(b?.coverUrl||'')}" placeholder="https://..."></div><div class="field"><label>ISBN</label><input id="rbIsbnV10" value="${htmlEscape(b?.isbn||'')}"></div><div class="field"><label>Editora</label><input id="rbPublisherV10" value="${htmlEscape(b?.publisher||'')}"></div><div class="field full"><label>Tags</label><input id="rbTagsV10" value="${htmlEscape(b?.tags||'')}" placeholder="Ex.: romance, trabalho, clássico"></div><div class="field"><label>Arquivado</label><select id="rbArchivedV10"><option value="Não" ${yes(b?.archived)?'':'selected'}>Não</option><option value="Sim" ${yes(b?.archived)?'selected':''}>Sim</option></select></div>`;grid.appendChild(box)}} ,0)};
    saveReadingBook=async function(id=''){
      const meta={coverUrl:document.getElementById('rbCoverV10')?.value.trim()||'',isbn:document.getElementById('rbIsbnV10')?.value.trim()||'',publisher:document.getElementById('rbPublisherV10')?.value.trim()||'',tags:document.getElementById('rbTagsV10')?.value.trim()||'',archived:document.getElementById('rbArchivedV10')?.value||'Não'};
      const before=new Set(readingBooks().map(x=>String(x.id||'')));await saveReadingBaseV10(id);const all=readingBooks();let target=id?all.find(x=>String(x.id)===String(id)):all.find(x=>!before.has(String(x.id||'')))||all.at(-1);if(!target)return;Object.assign(target,meta,{updatedAt:now()});const h=rows(FILES.reading,'Biblioteca')[0].map(String);await saveSheet(FILES.reading,'Biblioteca',toRows(all,h));render();
    };
  }

  window.AFPLUS_V1000={version:V,build:BUILD,diagnosticObject,globalSearchModal,restoreTrash,runHealth};
})();
