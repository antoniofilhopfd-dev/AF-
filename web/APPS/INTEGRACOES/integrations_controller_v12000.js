/* AF+ 12.0.0 — Integrações estável 4/4
   Central local para conexões, importações, arquivos, regras e auditoria.
   Não simula sincronizações externas: conexões reais dependem de API/autorização do provedor. */
(() => {
  const FILE=FILES.integrations;
  const oldGeneric=generic, oldBind=bind;
  Object.assign(state,{intStableTab:state.intStableTab||'connections'});
  const low=v=>String(v||'').trim().toLowerCase();
  const connected=v=>['conectado','connected','ativo'].includes(low(v));
  const yes=v=>['sim','true','1','yes'].includes(low(v));
  const iRows=s=>objRows(FILE,s);
  const fmtDt=v=>String(v||'').replace('T',' ').slice(0,16)||'Nunca';

  function auditIntegrations(){
    const issues=[];
    const sheets=['Conexoes','Importacoes','Arquivos','Regras','Sync_Log'];
    sheets.forEach(sheet=>{
      const seen=new Set();
      iRows(sheet).forEach((x,idx)=>{
        const id=String(x.id||'').trim();
        if(!id) issues.push(`${sheet}: linha ${idx+2} sem ID`);
        else if(seen.has(id)) issues.push(`${sheet}: ID duplicado ${id}`);
        else seen.add(id);
      });
    });
    iRows('Conexoes').forEach(x=>{
      if(!String(x.provider||'').trim())issues.push(`Conexão ${x.id||'(sem ID)'} sem provedor`);
      if(!String(x.module||'').trim())issues.push(`Conexão ${x.provider||x.id||''} sem módulo`);
      if(connected(x.status)&&!yes(x.canRead)&&!yes(x.canWrite))issues.push(`${x.provider}: marcado como conectado, mas sem permissão de leitura ou gravação`);
      if(low(x.status)==='erro'&&!String(x.lastError||'').trim())issues.push(`${x.provider}: status Erro sem mensagem registrada`);
    });
    iRows('Importacoes').forEach(x=>{
      const read=Number(x.recordsRead||0), imported=Number(x.recordsImported||0), dup=Number(x.duplicates||0), err=Number(x.errors||0);
      if([read,imported,dup,err].some(n=>n<0))issues.push(`Importação ${x.id}: contagem negativa`);
      if(read && imported+dup+err>read)issues.push(`Importação ${x.id}: resultados excedem registros lidos`);
    });
    return issues;
  }

  function tabs(){return `<div class="module-tabs">${[['connections','Conexões'],['history','Sincronizações'],['imports','Importações'],['files','Arquivos'],['rules','Regras'],['audit','Auditoria']].map(([k,l])=>`<button class="tab ${state.intStableTab===k?'active':''}" data-int-stable-tab="${k}">${l}</button>`).join('')}</div>`}
  function connectionCard(x){return `<article class="card af-integration"><div class="af-row-between"><div><span class="body-kicker">${esc(x.module||'AF+')}</span><h3>${esc(x.provider||'Serviço')}</h3></div><span class="af-status ${connected(x.status)?'ok':''}">${esc(x.status||'Não conectado')}</span></div><p class="muted">Leitura: ${esc(x.canRead||'—')} • Gravação: ${esc(x.canWrite||'—')} • Automático: ${esc(x.autoSync||'—')}</p><small>Última sincronização: ${esc(fmtDt(x.lastSyncAt))}</small>${x.lastError?`<div class="af-warning">${esc(x.lastError)}</div>`:''}<div class="actions"><button class="btn small" data-int-edit="${esc(x.id||'')}">Configurar</button><button class="btn small primary" data-int-sync="${esc(x.id||'')}">Sincronizar agora</button></div></article>`}
  function connectionView(){const con=iRows('Conexoes'),imports=iRows('Importacoes'),logs=iRows('Sync_Log');return `<div class="grid smart-kpis">${card('Conexões',con.length)}${card('Conectadas',con.filter(x=>connected(x.status)).length)}${card('Importações',imports.length)}${card('Erros',logs.filter(x=>low(x.status).includes('erro')).length)}</div><div class="module-toolbar"><div><span class="muted">O AF+ continua funcionando localmente sem serviços externos.</span></div><button class="btn primary" id="intNewConnection">+ Conexão</button></div><div class="af-integration-grid">${con.map(connectionCard).join('')||'<div class="card empty">Nenhuma conexão cadastrada.</div>'}</div>`}
  function auditView(){const issues=auditIntegrations(),con=iRows('Conexoes');return `<section class="card"><div class="sectiontitle"><div><span class="body-kicker">AUDITORIA</span><h3>${issues.length?'Verificações pendentes':'Integrações íntegras'}</h3></div><button class="btn" id="intAuditRefresh">Rever</button></div>${issues.length?`<div class="af-warning">${issues.map(x=>`<div>• ${esc(x)}</div>`).join('')}</div>`:'<p class="muted">Nenhum ID duplicado, vínculo básico inválido ou contagem inconsistente foi encontrado.</p>'}<div class="grid smart-kpis">${card('Provedores',con.length)}${card('Conectados',con.filter(x=>connected(x.status)).length)}${card('Somente leitura',con.filter(x=>yes(x.canRead)&&!yes(x.canWrite)).length)}${card('Auto sync',con.filter(x=>yes(x.autoSync)).length)}</div><div class="af-note">A auditoria não afirma que uma API externa está funcionando. Ela valida apenas a configuração local registrada no AF+.</div></section>`}
  function renderStableIntegrations(){let body='';if(state.intStableTab==='connections')body=connectionView();else if(state.intStableTab==='history')body=genericRowsTable('integrations','Sync_Log');else if(state.intStableTab==='imports')body=`<div class="module-toolbar"><button class="btn primary" id="intNewImport">+ Registro de importação</button></div>${genericRowsTable('integrations','Importacoes')}`;else if(state.intStableTab==='files')body=`<div class="module-toolbar"><button class="btn primary" id="intNewFile">+ Arquivo</button></div>${genericRowsTable('integrations','Arquivos')}`;else if(state.intStableTab==='rules')body=`<div class="module-toolbar"><button class="btn primary" id="intNewRule">+ Regra</button></div>${genericRowsTable('integrations','Regras')}`;else body=auditView();return shell(hero('INTEGRAÇÕES','Central de conexões, arquivos, importações e regras locais. Serviços externos só sincronizam quando realmente autorizados.')+tabs()+body,'Integrações')}

  generic=function(page){return page==='integrations'?renderStableIntegrations():oldGeneric(page)};
  bind=function(){oldBind();if(state.page!=='integrations')return;
    document.querySelectorAll('[data-int-stable-tab]').forEach(b=>b.onclick=()=>{state.intStableTab=b.dataset.intStableTab;render()});
    document.querySelectorAll('[data-int-edit]').forEach(b=>b.onclick=()=>genericModal('integrations','Conexoes',b.dataset.intEdit));
    document.getElementById('intNewConnection')?.addEventListener('click',()=>genericModal('integrations','Conexoes','',{status:'Não conectado',canRead:'Sim',canWrite:'Não',autoSync:'Não'}));
    document.getElementById('intNewImport')?.addEventListener('click',()=>genericModal('integrations','Importacoes','',{date:today(),status:'Pendente'}));
    document.getElementById('intNewFile')?.addEventListener('click',()=>genericModal('integrations','Arquivos','',{date:today(),status:'Disponível'}));
    document.getElementById('intNewRule')?.addEventListener('click',()=>genericModal('integrations','Regras','',{active:'Sim'}));
    document.getElementById('intAuditRefresh')?.addEventListener('click',()=>render());
    document.querySelectorAll('[data-int-sync]').forEach(b=>b.onclick=()=>{const x=iRows('Conexoes').find(c=>String(c.id)===String(b.dataset.intSync));if(!x||!connected(x.status)){alert('Este serviço não está conectado. Configure e autorize a conexão antes de sincronizar.');return}alert('A configuração local está marcada como conectada. A sincronização real só pode ocorrer quando o adaptador/API desse provedor estiver autorizado; o AF+ não simula uma sincronização.');});
  };
  window.afIntegrationsAudit=auditIntegrations;
})();
