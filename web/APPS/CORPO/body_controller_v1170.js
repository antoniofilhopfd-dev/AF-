/* AF+ 11.7.0 — CORPO ESTÁVEL · Etapas 2/4, 3/4 e 4/4 */
(function(){
  'use strict';
  const MOD='AF+ Corpo 11.7.0';
  const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:null};
  const txt=v=>String(v??'').trim();
  const finite=v=>Number.isFinite(Number(v));
  const now=()=>new Date().toISOString();
  const methodLabel=x=>[x?.source,x?.equipment,x?.appSource].filter(Boolean).join(' • ')||'Sem origem informada';
  function foldArray(x){try{const a=typeof x==='string'?JSON.parse(x):x;return Array.isArray(a)?a:[]}catch{return []}}
  function bodyRows(sheet){try{return objRows(FILES.body,sheet)||[]}catch{return []}}
  function header(sheet){try{return (rows(FILES.body,sheet)?.[0]||[]).map(String)}catch{return []}}
  function duplicateGroups(sheet){
    const map=new Map();
    for(const x of bodyRows(sheet)){
      const key=[txt(x.date),txt(x.source)].join('|'); if(!txt(x.date))continue;
      if(!map.has(key))map.set(key,[]); map.get(key).push(x);
    }
    return [...map.values()].filter(g=>g.length>1);
  }
  function invalidCounts(){
    const out={weight:0,measures:0,bio:0,skin:0,skinProtocol:0};
    bodyRows('Peso').forEach(x=>{const v=n(x.weightKg);if(v===null||v<=0)out.weight++});
    bodyRows('Medidas').forEach(x=>{const ks=['pescoco','torax','ombro','cintura','quadril','abdomen','bracoEsqRelaxado','bracoDirRelaxado','coxaEsq','coxaDir','panturrilhaEsq','panturrilhaDir'];if(ks.some(k=>txt(x[k])&&((n(x[k])??0)<=0)))out.measures++});
    bodyRows('Bioimpedancia').forEach(x=>{if(txt(x.weightKg)&&((n(x.weightKg)??0)<=0))out.bio++});
    bodyRows('Adipometria').forEach(x=>{const f=foldArray(x.measurements);if(f.some(z=>(n(z.mm)??0)<0))out.skin++;if(f.length&&f.length!==3)out.skinProtocol++});
    return out;
  }
  function latestDate(sheet){return bodyRows(sheet).map(x=>txt(x.date)).filter(Boolean).sort().at(-1)||''}
  function audit(){
    const dup={peso:duplicateGroups('Peso').length,medidas:duplicateGroups('Medidas').length,bio:duplicateGroups('Bioimpedancia').length,adipo:duplicateGroups('Adipometria').length};
    const invalid=invalidCounts();
    const orphanAdipo=bodyRows('Adipometria').filter(x=>foldArray(x.measurements).length!==3).length;
    const issues=Object.values(dup).reduce((a,b)=>a+b,0)+Object.values(invalid).reduce((a,b)=>a+b,0)+orphanAdipo;
    return {dup,invalid,orphanAdipo,issues,counts:{peso:bodyRows('Peso').length,medidas:bodyRows('Medidas').length,bio:bodyRows('Bioimpedancia').length,adipo:bodyRows('Adipometria').length}};
  }
  function auditPanel(){
    const a=audit();
    const item=(l,v,s,ok=true)=>`<div class="body-audit-item ${ok?'ok':'warn'}"><span>${l}</span><strong>${v}</strong><small>${s}</small></div>`;
    return `<section class="card body-audit-v1170"><div class="sectiontitle"><div><span class="body-kicker">AUDITORIA AUTOMÁTICA</span><h3>Integridade do módulo Corpo</h3></div><span class="pill ${a.issues?'warn':''}">${a.issues?`${a.issues} ponto(s) para revisar`:'OK'}</span></div><div class="body-audit-grid">${item('Peso',a.counts.peso,latestDate('Peso')?`último ${brDate(latestDate('Peso'))}`:'sem registros',!a.dup.peso&&!a.invalid.weight)}${item('Medidas',a.counts.medidas,latestDate('Medidas')?`último ${brDate(latestDate('Medidas'))}`:'sem registros',!a.dup.medidas&&!a.invalid.measures)}${item('Bioimpedância',a.counts.bio,latestDate('Bioimpedancia')?`última ${brDate(latestDate('Bioimpedancia'))}`:'sem registros',!a.dup.bio&&!a.invalid.bio)}${item('Adipometria',a.counts.adipo,latestDate('Adipometria')?`última ${brDate(latestDate('Adipometria'))}`:'sem registros',!a.dup.adipo&&!a.invalid.skin&&!a.orphanAdipo)}</div><div class="af-insight">Os métodos permanecem separados. O AF+ não transforma automaticamente uma medição de bioimpedância em adipometria nem compara percentuais como se fossem o mesmo método.</div></section>`;
  }

  /* ETAPA 2/4 — gravação modular e validação */
  const coreSave=window.bodySaveObject;
  window.bodySaveObject=async function(sheet,obj,editId=''){
    if(!FILES?.body) throw new Error('Arquivo do módulo Corpo não carregado.');
    const h=header(sheet); if(!h.length) throw new Error(`Estrutura não encontrada: ${sheet}`);
    const all=bodyRows(sheet).slice();
    let record={...obj};
    if(!record.id)record.id=`${String(sheet).toLowerCase()}-${Date.now()}`;
    if(!record.date)throw new Error('Data obrigatória.');

    if(sheet==='Adipometria'){
      const folds=foldArray(record.measurements);
      if(folds.length)record.sumFoldsMm=folds.reduce((s,f)=>s+(n(f.mm)||0),0);
      const w=n(record.weightKg),pct=n(record.bodyFatPct);
      if(w!==null&&pct!==null){
        const fat=w*pct/100;
        if(!txt(record.fatMassKg))record.fatMassKg=Number(fat.toFixed(2));
        if(!txt(record.leanMassKg))record.leanMassKg=Number((w-fat).toFixed(2));
      }
      record.protocol=record.protocol||'3 dobras — Tricipital + Abdominal + Suprailíaca';
    }
    if(sheet==='Bioimpedancia'){
      const w=n(record.weightKg),pct=n(record.bodyFatPct??record.fatMassPct);
      if(w!==null&&pct!==null){
        const fat=w*pct/100;
        if(!txt(record.fatMassKg))record.fatMassKg=Number(fat.toFixed(2));
        if(!txt(record.fatFreeMassKg))record.fatFreeMassKg=Number((w-fat).toFixed(2));
      }
    }
    let idx=editId?all.findIndex(x=>String(x.id)===String(editId)):-1;
    if(idx>=0)all[idx]={...all[idx],...record,updatedAt:now()};
    else all.push({...record,createdAt:record.createdAt||now()});
    await saveSheet(FILES.body,sheet,toRows(all,h));
    state.modal=null; render();
  };

  window.bodyDeleteRecord=async function(sheet,id){
    if(!confirm('Excluir este registro do Corpo?'))return;
    const h=header(sheet),all=bodyRows(sheet).filter(x=>String(x.id)!==String(id));
    await saveSheet(FILES.body,sheet,toRows(all,h)); render();
  };

  /* ETAPA 3/4 — cálculos derivados e comparação sem misturar métodos */
  window.bodyComparePanel=function(){
    const dates=[...new Set(['Peso','Medidas','Bioimpedancia','Adipometria'].flatMap(sh=>bodyRows(sh).map(x=>txt(x.date))).filter(Boolean))].sort();
    if(!dates.length)return '';
    const a=state.bodyCompareA||dates.at(-2)||dates.at(-1),b=state.bodyCompareB||dates.at(-1);state.bodyCompareA=a;state.bodyCompareB=b;
    const rec=(sh,d)=>bodyRows(sh).filter(x=>txt(x.date)===d).at(-1)||null;
    const A={w:rec('Peso',a),m:rec('Medidas',a),bio:rec('Bioimpedancia',a),skin:rec('Adipometria',a)};
    const B={w:rec('Peso',b),m:rec('Medidas',b),bio:rec('Bioimpedancia',b),skin:rec('Adipometria',b)};
    const val=(x,k)=>x&&finite(x[k])?Number(x[k]):null, delta=(x,y,u='')=>x===null||y===null?'—':`${y-x>0?'+':''}${fmt(y-x)}${u}`;
    const metric=(label,av,bv,u='')=>`<div><span>${label}</span><strong>${bv===null?'—':fmt(bv)+u}</strong><small>${delta(av,bv,u)}</small></div>`;
    return `<div class="compare-toolbar"><div><h3>Comparar avaliações</h3><span class="muted">Mudanças descritivas entre duas datas; métodos de composição corporal são mostrados separadamente.</span></div><div><select id="bodyCompareA">${dates.map(d=>`<option value="${d}" ${d===a?'selected':''}>${brDate(d)}</option>`).join('')}</select><span>→</span><select id="bodyCompareB">${dates.map(d=>`<option value="${d}" ${d===b?'selected':''}>${brDate(d)}</option>`).join('')}</select></div></div><div class="measure-compare">${metric('Peso',A.w?Number(weightVal(A.w)):null,B.w?Number(weightVal(B.w)):null,' kg')}${metric('Cintura',val(A.m,'cintura'),val(B.m,'cintura'),' cm')}${metric('Abdômen',val(A.m,'abdomen'),val(B.m,'abdomen'),' cm')}${metric('Gordura — adipometria',val(A.skin,'bodyFatPct'),val(B.skin,'bodyFatPct'),'%')}${metric('Gordura — bioimpedância',val(A.bio,'bodyFatPct')??val(A.bio,'fatMassPct'),val(B.bio,'bodyFatPct')??val(B.bio,'fatMassPct'),'%')}${metric('Soma das 3 dobras',val(A.skin,'sumFoldsMm'),val(B.skin,'sumFoldsMm'),' mm')}</div>`;
  };

  const coreSkinModal=window.bodySkinModal;
  if(typeof coreSkinModal==='function')window.bodySkinModal=function(id=''){
    coreSkinModal(id);
    setTimeout(()=>{
      const update=()=>{
        const w=n(document.getElementById('bsWeight')?.value),pct=n(document.getElementById('bsFatPct')?.value);
        const fat=document.getElementById('bsFatKg'),lean=document.getElementById('bsLeanKg');
        if(w!==null&&pct!==null){
          const f=w*pct/100;
          if(fat&&!fat.value)fat.placeholder=`Calculado: ${f.toFixed(2)} kg`;
          if(lean&&!lean.value)lean.placeholder=`Calculado: ${(w-f).toFixed(2)} kg`;
        }
      };
      ['bsWeight','bsFatPct'].forEach(k=>document.getElementById(k)?.addEventListener('input',update)); update();
    },30);
  };

  /* ETAPA 4/4 — auditoria final integrada */
  const coreBodyEvaluations=window.bodyEvaluations;
  if(typeof coreBodyEvaluations==='function')window.bodyEvaluations=function(){
    const base=coreBodyEvaluations();
    return `${auditPanel()}${base}`;
  };

  const prevBind=window.bind;
  if(typeof prevBind==='function')window.bind=function(){
    prevBind();
    document.getElementById('bodyCompareA')?.addEventListener('change',e=>{state.bodyCompareA=e.target.value;render()});
    document.getElementById('bodyCompareB')?.addEventListener('change',e=>{state.bodyCompareB=e.target.value;render()});
  };

  const style=document.createElement('style');
  style.textContent=`.body-audit-v1170{margin-bottom:14px}.body-audit-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.body-audit-item{background:var(--surf2);border:1px solid var(--border);border-radius:12px;padding:11px}.body-audit-item span,.body-audit-item small{display:block}.body-audit-item span{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--muted)}.body-audit-item strong{display:block;font-size:18px;margin:3px 0}.body-audit-item small{font-size:9px;color:var(--muted)}.body-audit-item.warn{border-color:rgba(180,120,0,.35)}@media(max-width:720px){.body-audit-grid{grid-template-columns:1fr 1fr}}`;
  document.head.appendChild(style);
  window.AF_BODY_AUDIT=audit;
  console.info(`${MOD} carregado`);
})();
