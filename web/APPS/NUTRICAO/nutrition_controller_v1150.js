/* AF+ Nutrição v11.5.0 — controlador único homologado por fases. */
(function(){
  const src=(document.currentScript&&document.currentScript.src)||"";
  const phase=new URL(src,location.href).searchParams.get("af_phase")||"after_af_plus";
  window.AFPLUS_NUTRITION_CONTROLLER_1150=window.AFPLUS_NUTRITION_CONTROLLER_1150||{version:"11.5.0",phases:[],components:[],loadedAt:new Date().toISOString()};
  const ctl=window.AFPLUS_NUTRITION_CONTROLLER_1150;
  if(!ctl.phases.includes(phase)) ctl.phases.push(phase);

  if(phase==="after_finalization"){
/* AF+ 8.0.3 — preenchimento de água simplificado */
(function(){
  const baseDashboard = nutritionDashboard;
  let waterActionBusy = false;

  function waterGoal(){ return num(goalValue('waterMl')); }
  function waterRemain(){ return Math.max(0, waterGoal() - todayWater()); }
  function waterPct(){ const g=waterGoal(); return g ? Math.min(100, Math.round((todayWater()/g)*100)) : 0; }
  function waterStatusText(){
    const total=todayWater(), goal=waterGoal();
    if(!goal) return 'Defina sua meta diária para acompanhar o progresso.';
    if(total>=goal) return `Meta atingida • ${fmt(total-goal)} ml acima da meta`;
    return `Faltam ${fmt(goal-total)} ml para a meta`;
  }
  function waterEasyPanel(){
    const total=todayWater(), goal=waterGoal();
    return `<section class="water-easy-card">
      <div class="water-easy-head">
        <div><span class="water-kicker">Hidratação hoje</span><strong>${fmt(total)} ml</strong><small>${esc(waterStatusText())}</small></div>
        <div class="water-goal-badge">${goal?`${fmt(waterPct())}% da meta`:'Sem meta'}</div>
      </div>
      <div class="water-big-progress"><span style="width:${waterPct()}%"></span></div>
      <div class="water-quick-grid">
        <button class="water-add primary" data-water-easy-add="250"><b>+250</b><span>ml</span></button>
        <button class="water-add" data-water-easy-add="350"><b>+350</b><span>ml</span></button>
        <button class="water-add" data-water-easy-add="500"><b>+500</b><span>ml</span></button>
        <button class="water-add orange" data-water-easy-add="1000"><b>+1</b><span>litro</span></button>
      </div>
      <div class="water-manual-row">
        <label><span>Adicionar outro valor</span><div><input id="waterCustomMl" type="number" min="1" step="50" inputmode="numeric" placeholder="Ex.: 600"><button class="btn primary" id="waterCustomAdd">Adicionar</button></div></label>
        <label><span>Definir total de hoje</span><div><input id="waterSetTotal" type="number" min="0" step="50" inputmode="numeric" value="${Math.round(total)}"><button class="btn" id="waterSetTotalBtn">Definir</button></div></label>
      </div>
      <div class="water-tools-row">
        <button class="btn" id="waterUndo">↶ Desfazer último</button>
        <button class="btn danger" id="waterClearToday">Zerar água de hoje</button>
        <span class="muted">Cada alteração é salva no AF_PLUS_NUTRICAO.xlsx.</span>
      </div>
    </section>`;
  }

  nutritionDashboard=function(){
    const html=baseDashboard();
    // Oculta o bloco antigo de Água rápida e acrescenta o preenchimento simplificado.
    return html.replace(/<div class="waterquick">[\s\S]*?<\/div><div class="energyclose">/, waterEasyPanel()+'<div class="energyclose">');
  };

  async function saveWaterObjects(objs){
    const headers=rows(FILES.nutrition,'Agua')[0]?.map(String)||['id','date','time','ml','createdAt'];
    await saveSheet(FILES.nutrition,'Agua',toRows(objs,headers));
  }
  function nowWaterObject(ml,prefix='water'){
    return {id:`${prefix}-${Date.now()}`,date:today(),time:new Date().toTimeString().slice(0,5),ml:num(ml),createdAt:new Date().toISOString()};
  }
  async function runWaterAction(fn){
    if(waterActionBusy){toast('Aguarde o salvamento da água anterior.');return}
    waterActionBusy=true;
    document.querySelectorAll('[data-water-easy-add],#waterCustomAdd,#waterSetTotalBtn,#waterUndo,#waterClearToday').forEach(b=>b.disabled=true);
    try{await fn();render()}catch(e){toast(`Não foi possível salvar a água: ${e?.message||e}`)}finally{waterActionBusy=false}
  }
  async function addWaterEasy(ml){
    ml=num(ml); if(!ml||ml<0){toast('Informe uma quantidade válida de água.');return}
    await runWaterAction(async()=>{const objs=waterRows().slice();objs.push(nowWaterObject(ml));await saveWaterObjects(objs);});
  }
  async function setWaterToday(total){
    total=num(total); if(total<0){toast('Informe um total válido.');return}
    await runWaterAction(async()=>{
      const objs=waterRows().filter(x=>String(x.date||'')!==today());
      if(total>0)objs.push(nowWaterObject(total,'water-total'));
      await saveWaterObjects(objs);
      toast(total?`Água de hoje ajustada para ${fmt(total)} ml`:'Água de hoje zerada');
    });
  }
  async function undoWater(){
    const all=waterRows().slice();
    const candidates=all.map((x,i)=>({x,i})).filter(z=>String(z.x.date||'')===today());
    if(!candidates.length){toast('Não há registro de água para desfazer hoje.');return}
    const last=candidates.sort((a,b)=>String(a.x.createdAt||a.x.time||'').localeCompare(String(b.x.createdAt||b.x.time||''))).at(-1);
    await runWaterAction(async()=>{const removed=all.splice(last.i,1)[0];await saveWaterObjects(all);toast(`Desfeito: ${fmt(removed.ml)} ml`);});
  }

  const oldBind=bind;
  bind=function(){
    oldBind();
    document.querySelectorAll('[data-water-easy-add]').forEach(b=>b.onclick=()=>addWaterEasy(b.dataset.waterEasyAdd));
    document.getElementById('waterCustomAdd')?.addEventListener('click',()=>addWaterEasy(document.getElementById('waterCustomMl')?.value));
    document.getElementById('waterCustomMl')?.addEventListener('keydown',e=>{if(e.key==='Enter')addWaterEasy(e.currentTarget.value)});
    document.getElementById('waterSetTotalBtn')?.addEventListener('click',()=>setWaterToday(document.getElementById('waterSetTotal')?.value));
    document.getElementById('waterSetTotal')?.addEventListener('keydown',e=>{if(e.key==='Enter')setWaterToday(e.currentTarget.value)});
    document.getElementById('waterUndo')?.addEventListener('click',undoWater);
    document.getElementById('waterClearToday')?.addEventListener('click',()=>{if(confirm('Zerar todos os registros de água de hoje? Os outros dias não serão alterados.'))setWaterToday(0)});
  };
})();

    ctl.components.push("water_easy_v803.js");
  }

  if(phase==="after_final_stable"){
/* AF+ v11.4.1 — Plano do Nutricionista + metas oficiais
   Plano oficial editável + ligação com opções reutilizáveis do AF+.
   Preserva Planejamento/Consumos atuais e o editor já existente. */
(function(){
  const oldNutrition = nutrition;
  const oldBind = bind;
  if(!state.nutPlanVersion) state.nutPlanVersion='';
  if(!state.nutTab || state.nutTab==='plan') state.nutTab='today';

  function planRowsV910(){ return objRows(FILES.nutrition,'Plano_Nutricionista'); }
  function versionRowsV910(){ return objRows(FILES.nutrition,'Planos_Versoes'); }
  function activeVersionV910(){
    const vs=versionRowsV910();
    const chosen=state.nutPlanVersion && vs.find(v=>String(v.id)===String(state.nutPlanVersion));
    if(chosen) return chosen;
    const active=vs.find(v=>String(v.ativo||'').toLowerCase()==='sim'||String(v.status||'').toLowerCase()==='ativo')||vs[0]||null;
    if(active) state.nutPlanVersion=active.id;
    return active;
  }
  function mealOrderV910(m){const i=mealNames().indexOf(m);return i<0?99:i}
  function activePlanItemsV910(){
    const v=activeVersionV910(); if(!v)return [];
    return planRowsV910().filter(x=>String(x.versaoPlano)===String(v.id)&&String(x.ativo||'Sim').toLowerCase()!=='não'&&String(x.ativo||'Sim').toLowerCase()!=='nao');
  }
  function groupPlanV910(){
    const map=new Map();
    for(const x of activePlanItemsV910()){
      const key=[x.refeicao,x.opcaoNumero,x.opcaoNome].join('|||');
      if(!map.has(key))map.set(key,[]);
      map.get(key).push(x);
    }
    return [...map.values()].map(items=>items.sort((a,b)=>num(a.itemOrdem)-num(b.itemOrdem))).sort((a,b)=>
      mealOrderV910(a[0]?.refeicao)-mealOrderV910(b[0]?.refeicao)||num(a[0]?.opcaoNumero)-num(b[0]?.opcaoNumero));
  }
  function nutritionPlanTabV910(){
    const versions=versionRowsV910(); const active=activeVersionV910(); const groups=groupPlanV910();
    const meals=[...new Set(groups.map(g=>g[0]?.refeicao).filter(Boolean))];
    return `<div class="nutrition-plan-head card"><div><span class="body-kicker">PLANO OFICIAL</span><h3>Planejamento Alimentar Personalizado</h3><p class="muted">Plano do nutricionista preservado como referência do AF+.</p></div><div class="np-actions"><select id="npVersion">${versions.map(v=>`<option value="${esc(v.id)}" ${active&&String(active.id)===String(v.id)?'selected':''}>${esc(v.nome||v.id)}</option>`).join('')}</select><button class="btn" id="npDuplicateVersion">Duplicar como novo plano</button></div></div>
    <div class="card np-plan-goals"><span class="body-kicker">METAS DO PLANO</span><div class="np-summary">${card('VET','~2.250 kcal','meta diária')}${card('Proteínas','180 g','32%')}${card('Carboidratos','225 g','40%')}${card('Lipídeos','70 g','28%')}${card('Água','2,5–3,0 L','por dia')}</div></div>
    <div class="np-summary">${card('Refeições',meals.length,'no plano ativo')}${card('Opções',groups.length,'combinações do nutricionista')}${card('Itens',activePlanItemsV910().length,'linhas do plano')}</div>
    <div class="np-groups">${groups.map(items=>{
      const x=items[0]||{};
      return `<section class="card np-option"><div class="np-option-head"><div><span class="body-kicker">${esc(x.refeicao||'')}</span><h3>${esc(x.opcaoNome||`Opção ${x.opcaoNumero||''}`)}</h3><span class="muted">${esc(x.horario||'')} • ${items.length} item(ns)</span></div><button class="btn primary" data-np-edit="${esc(x.id)}">Editar plano</button></div><div class="np-plan-table"><div class="np-row np-row-head"><span>Plano do nutricionista</span><span>Alimento padronizado</span><span>Quantidade</span></div>${items.map(i=>`<div class="np-row"><span>${esc(i.textoOriginal||'')}</span><strong>${esc(i.alimentoPadronizado||i.textoOriginal||'')}</strong><span>${i.quantidade!==''&&i.quantidade!=null?`${esc(i.quantidade)} ${esc(i.unidade||'')}`:'À vontade / não informado'}</span></div>`).join('')}</div></section>`
    }).join('')||'<div class="card empty">Nenhum item no plano ativo.</div>'}</div>`;
  }

  nutrition = function(){
    const defs=[['today','Hoje'],['week','Semana'],['options','Opções'],['plan','Plano'],['history','Histórico'],['foods','Alimentos'],['evo','Evolução']];
    let c=hero('NUTRIÇÃO','Plano do nutricionista como referência, com consumo real por dia/semana e opções reutilizáveis.')+tabs(defs,state.nutTab,'data-ntab');
    if(state.nutTab==='plan')c+=nutritionPlanTabV910();
    if(state.nutTab==='today')c+=nutToday();
    if(state.nutTab==='week')c+=nutWeek();
    if(state.nutTab==='options')c+=optionsTab();
    if(state.nutTab==='history')c+=nutHistory();
    if(state.nutTab==='foods')c+=foodsTab();
    if(state.nutTab==='evo')c+=nutEvo();
    return shell(c,'Nutrição');
  };

  function findGroupByIdV910(id){
    const item=planRowsV910().find(x=>String(x.id)===String(id)); if(!item)return [];
    return planRowsV910().filter(x=>String(x.versaoPlano)===String(item.versaoPlano)&&String(x.refeicao)===String(item.refeicao)&&String(x.opcaoNome)===String(item.opcaoNome)&&String(x.opcaoNumero)===String(item.opcaoNumero)).sort((a,b)=>num(a.itemOrdem)-num(b.itemOrdem));
  }
  function planEditModalV910(id){
    const items=findGroupByIdV910(id); if(!items.length)return;
    const first=items[0];
    const foodOptions=foodRows().map(f=>`<option value="${esc(foodName(f))}"></option>`).join('');
    state.modal=`<div class="modalhead"><div><h3>${esc(first.opcaoNome||'Opção do plano')}</h3><div class="muted">${esc(first.refeicao||'')} • o texto original é mantido para conferência.</div></div><button class="x" data-close>×</button></div>
    <div class="np-edit-list">${items.map((it,i)=>`<div class="np-edit-item" data-np-line="${i}"><div class="np-original"><span>Texto do plano</span><strong>${esc(it.textoOriginal||'')}</strong></div><div class="field"><label>Alimento padronizado</label><input list="npFoods" data-np-food="${i}" value="${esc(it.alimentoPadronizado||it.textoOriginal||'')}"></div><div class="field"><label>Quantidade</label><input type="number" step="0.1" data-np-qty="${i}" value="${esc(it.quantidade??'')}"></div><div class="field"><label>Unidade</label><select data-np-unit="${i}">${unitOptions(it.unidade||'g',it.unidade||'g')}</select></div></div>`).join('')}</div><datalist id="npFoods">${foodOptions}</datalist>
    <div class="np-save-help card"><strong>Como salvar</strong><span>Salvar no plano altera somente esta versão do nutricionista. Atualizar opção sincroniza esta composição com uma opção reutilizável. Salvar como nova opção mantém a opção existente intacta.</span></div>
    <div class="modalactions np-modal-actions"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="npSavePlan">Salvar no plano</button><button class="btn" id="npUpdateOption">Atualizar opção atual</button><button class="btn orange" id="npSaveNewOption">Salvar como nova opção</button></div>`;
    render();
    setTimeout(()=>{
      document.getElementById('npSavePlan')?.addEventListener('click',()=>savePlanGroupV910(items,'plan'));
      document.getElementById('npUpdateOption')?.addEventListener('click',()=>savePlanGroupV910(items,'update'));
      document.getElementById('npSaveNewOption')?.addEventListener('click',()=>savePlanGroupV910(items,'new'));
    },0);
  }
  function editorValuesV910(items){
    return items.map((it,i)=>{
      const name=document.querySelector(`[data-np-food="${i}"]`)?.value.trim()||it.alimentoPadronizado||it.textoOriginal||'';
      const f=findFood(name)||{};
      return {...it,alimentoPadronizado:name,alimentoId:foodId(f)||it.alimentoId||'',quantidade:document.querySelector(`[data-np-qty="${i}"]`)?.value??it.quantidade,unidade:document.querySelector(`[data-np-unit="${i}"]`)?.value||it.unidade||f.unit||'g',updatedAt:new Date().toISOString()};
    });
  }
  async function savePlanSheetV910(edited){
    const headers=rows(FILES.nutrition,'Plano_Nutricionista')[0]?.map(String)||[];
    const all=planRowsV910(); const map=new Map(edited.map(x=>[String(x.id),x]));
    const merged=all.map(x=>map.get(String(x.id))||x);
    await saveSheet(FILES.nutrition,'Plano_Nutricionista',toRows(merged,headers));
  }
  async function syncOptionV910(edited,targetName){
    const first=edited[0]; const headers=rows(FILES.nutrition,'Opcoes_Refeicoes')[0]?.map(String)||[];
    if(!headers.length)throw new Error('Aba Opcoes_Refeicoes sem cabeçalho.');
    let all=optionRows();
    const existing=all.filter(x=>optionName(x)===targetName);
    if(existing.length) all=all.filter(x=>optionName(x)!==targetName);
    const optionNumber=num(existing[0]?.opcao)||Math.max(0,...all.map(x=>num(x.opcao)))+1;
    const stamp=Date.now();
    edited.forEach((it,i)=>{
      const f=findFood(it.alimentoPadronizado,it.alimentoId)||{};
      const n=foodNutrition(foodName(f)||it.alimentoPadronizado,it.quantidade,it.unidade,foodId(f)||it.alimentoId);
      let st='OK',note=foodName(f)||it.alimentoPadronizado;
      if(!foodId(f)){st='SEM_DADOS';note=`${it.alimentoPadronizado}: alimento não vinculado`}
      else if(foodMissingNutritionData(f)){st='SEM_DADOS';note=`${foodName(f)}: SEM_DADOS`}
      else if(n.missingConversion){st='SEM_CONVERSAO';note=`${foodName(f)}: sem conversão de unidade`}
      all.push({id:`opt-plan-${stamp}-${i+1}`,refeicao:first.refeicao,horario:first.horario,opcao:optionNumber,item_ordem:i+1,descricao:foodName(f)||it.alimentoPadronizado,quantidade:it.quantidade,unidade:it.unidade,alternativa_grupo:it.alternativaGrupo||'',observacao:it.observacao||'',opcao_nome:targetName,foodId:foodId(f)||it.alimentoId||'',calc_status:st,calc_note:note,base_opcao:first.opcaoNome});
    });
    await saveSheet(FILES.nutrition,'Opcoes_Refeicoes',toRows(all,headers));
    try{await rebuildOptionSummarySheets()}catch(e){console.warn('Resumo de opções não reconstruído:',e)}
  }
  async function savePlanGroupV910(items,mode){
    const edited=editorValuesV910(items);
    await savePlanSheetV910(edited);
    if(mode==='update'){
      await syncOptionV910(edited,edited[0].opcaoNome);
      toast('Plano e opção atualizados');
    } else if(mode==='new'){
      const suggested=`${edited[0].opcaoNome} — personalizada`;
      const name=prompt('Nome da nova opção:',suggested);
      if(name===null){state.modal=null;render();return}
      const target=String(name||'').trim(); if(!target){toast('Informe o nome da nova opção');return}
      if(optionRows().some(x=>String(optionName(x)).trim().toLowerCase()===target.toLowerCase())){toast('Já existe uma opção com esse nome');return}
      await syncOptionV910(edited,target); toast('Plano salvo e nova opção criada');
    } else toast('Alteração salva no plano do nutricionista');
    state.modal=null; render();
  }
  async function duplicateVersionV910(){
    const src=activeVersionV910(); if(!src)return;
    const name=prompt('Nome da nova versão do plano:',`Novo plano — ${new Date().toLocaleDateString('pt-BR')}`); if(name===null)return;
    const clean=String(name||'').trim(); if(!clean){toast('Informe o nome do plano');return}
    const id=`plano-${Date.now()}`; const now=new Date().toISOString();
    const vheaders=rows(FILES.nutrition,'Planos_Versoes')[0]?.map(String)||[];
    const versions=versionRowsV910().map(v=>({...v,ativo:'Não',status:String(v.id)===String(src.id)?'Arquivado':v.status,updatedAt:now}));
    versions.push({id,nome:clean,inicioVigencia:today(),fimVigencia:'',status:'Ativo',origem:`Duplicado de ${src.nome||src.id}`,observacoes:'Edite esta versão com o novo plano do nutricionista.',createdAt:now,updatedAt:now,ativo:'Sim'});
    await saveSheet(FILES.nutrition,'Planos_Versoes',toRows(versions,vheaders));
    const pheaders=rows(FILES.nutrition,'Plano_Nutricionista')[0]?.map(String)||[];
    const all=planRowsV910(); const clone=all.filter(x=>String(x.versaoPlano)===String(src.id)).map((x,i)=>({...x,id:`planitem-${Date.now()}-${i+1}`,versaoPlano:id,createdAt:now,updatedAt:now,ativo:'Sim'}));
    await saveSheet(FILES.nutrition,'Plano_Nutricionista',toRows([...all,...clone],pheaders));
    state.nutPlanVersion=id; toast('Nova versão do plano criada'); render();
  }
  function bindNutritionPlanV910(){
    document.getElementById('npVersion')?.addEventListener('change',e=>{state.nutPlanVersion=e.target.value;render()});
    document.getElementById('npDuplicateVersion')?.addEventListener('click',duplicateVersionV910);
    document.querySelectorAll('[data-np-edit]').forEach(b=>b.onclick=()=>planEditModalV910(b.dataset.npEdit));
  }
  bind = function(){ oldBind(); if(state.page==='nutrition')bindNutritionPlanV910(); };
})();

    ctl.components.push("nutrition_plan_v1141.js");
  }

  if(phase==="after_af_plus"){
/* AF+ 11.4.1 — Migração segura de Nutrição: seletor de alimentos, metas do plano e plano oficial. */
(function(){
const SEED={"foods_header":["id","name","brand","category","portion","unit","kcal","proteinG","carbsG","fatG","fiberG","sugarG","favorite","lastUsedAt","usageCount","archived"],"foods_rows":[["food-maca","Maçã",null,"Fruta",100,"g",52,0.3,13.8,0.2,2.4,0,false,46291.624758645834,1,"Não"],["food-cuscuz","Cuscuz de milho cozido",null,"Cereal",100,"g",112,2.2,25.3,0.7,2.1,0,false,46292.481352083334,1,"Não"],["food-ovos","Ovos mexidos",null,"Proteína",1,"unidade",77.5,6.5,0.55,5.5,0,0,false,46292.481352083334,1,"Não"],["food-queijo-coalho","Queijo coalho",null,"Laticínio",20,"g",58,4.6,0.4,4.2,0,0,false,46291.624758645834,1,"Não"],["food-mussarela","Queijo mussarela",null,"Laticínio",20,"g",60,4.4,0.6,4.6,0,0,false,46292.481352083334,1,"Não"],["food-requeijao-light","Requeijão light",null,"Laticínio",10,"g",19,1.1,0.6,1.35,0,0,false,null,null,"Não"],["food-cafe","Café coado sem açúcar",null,"Bebida",1,"porcao",0,0,0,0,0,0,false,46292.481352083334,2,"Não"],["food-creatina","Creatina",null,"Suplemento",5,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-pao-integral","Pão 100% integral",null,"Cereal",100,"g",253,11,45,2.3,8.2,8.3,false,46291.624758645834,1,"Não"],["food-tapioca","Goma de tapioca",null,"Cereal",60,"g",140.4,0.12,34.2,0,0.12,0,false,null,null,"Não"],["food-yopro","YoPro",null,"Iogurte proteico",250,"ml",0,0,0,0,0,0,false,null,null,"Não"],["food-pense-zero-liquido","Batavo Pense Zero Líquido – Morango","Batavo","Iogurte",200,"g",55,5.6,8.2,0,0,7.2,false,null,null,"Não"],["food-castanha-caju","Castanha de caju",null,"Oleaginosa",20,"g",114,3.7,5.82,8.76,0.74,0,false,null,null,"Não"],["food-amendoim","Amendoim",null,"Oleaginosa",20,"g",113.4,5.16,3.22,9.84,1.7,0,false,46291.62504658565,1,"Não"],["food-pate-frango","Patê caseiro de frango",null,"Preparação",1,"porcao",0,0,0,0,0,0,false,null,null,"Não"],["food-pate-atum","Patê caseiro de atum",null,"Preparação",1,"porcao",0,0,0,0,0,0,false,null,null,"Não"],["food-mandioca-chips","Mandioca Chips","Belive","Snack",50,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-magic-toast","Magic Toast",null,"Torrada",4,"unidade",0,0,0,0,0,0,false,null,null,"Não"],["food-biscoito-lowcucar","Biscoito recheado","Lowçucar","Biscoito",3,"unidade",0,0,0,0,0,0,false,null,null,"Não"],["food-arroz-branco","Arroz branco cozido",null,"Cereal",150,"g",195,4.05,42.3,0.45,2.4,0,false,46291.625878113424,1,"Não"],["food-arroz-integral","Arroz integral cozido",null,"Cereal",150,"g",186,3.9,38.7,1.5,4.05,0,false,null,null,"Não"],["food-feijao","Feijão cozido",null,"Leguminosa",100,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-fava","Fava cozida",null,"Leguminosa",80,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-frango","Peito de frango",null,"Proteína",150,"g",247.5,46.5,0,5.4,0,0,false,46291.625878113424,1,"Não"],["food-patinho","Patinho",null,"Proteína",150,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-coxao-mole","Coxão mole",null,"Proteína",150,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-lombo-suino","Lombo suíno magro",null,"Proteína",150,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-bisteca-suino","Bisteca suína magra",null,"Proteína",150,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-pepino","Pepino",null,"Hortaliça",1,"g",0.1,0.009,0.02,0,0.011,0,false,null,null,"Não"],["food-tomate","Tomate",null,"Hortaliça",1,"g",0.15,0.011,0.031,0.002,0.012,0,false,null,null,"Não"],["food-azeite","Azeite extravirgem",null,"Gordura",8,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-macarrao-integral","Macarrão integral cozido",null,"Cereal",180,"g",223.2,9.54,47.7,0.9,7.02,0,false,null,null,"Não"],["food-carne-moida-patinho","Carne moída de patinho",null,"Proteína",150,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-molho-natural-tomate","Molho natural de tomate",null,"Molho",1,"porcao",0,0,0,0,0,0,false,null,null,"Não"],["food-bolinho-belive","Belive Bolinho Coco com Gotas de Chocolate Zero Açúcar","Belive","Snack",40,"g",128,1.8,17,7.6,2,0,false,null,0,"Não"],["food-timbers-chocolate","Timber’s Wafer Chocolate","Timber’s","Snack",27,"g",119.61,1.512,16.2,7.29,2.268,0,false,null,null,"Não"],["food-canjica-okoshi","Canjica Cacau e Açúcar de Coco","Okoshi","Snack",50,"g",171,2,40,0,2,7,false,null,null,"Não"],["food-barra-proteina","Barra de proteína",null,"Snack",1,"unidade",0,0,0,0,0,0,false,null,null,"Não"],["food-pense-zero-morango","Iogurte Grego Batavo Pense Zero – Morango com Pedaços","Batavo","Iogurte",200,"g",81,8.2,12,0,0,9.8,false,null,null,"Não"],["food-inhame","Inhame cozido",null,"Raiz",150,"g",177,2.25,41.25,0.3,6.15,0,false,null,null,"Não"],["food-macaxeira","Macaxeira (mandioca) cozida",null,"Raiz",150,"g",187.5,0.9,45.15,0.45,2.4,0,false,null,null,"Não"],["food-batata-doce","Batata-doce cozida",null,"Raiz",150,"g",115.5,0.9,27.6,0.15,3.3,0,false,null,null,"Não"],["food-porco-magro","Porco magro",null,"Proteína",150,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-coca-zero","Coca-Cola Zero","Coca-Cola","Bebida",350,"ml",0,0,0,0,0,0,false,null,null,"Não"],["food-guarana-zero","Guaraná Zero",null,"Bebida",350,"ml",0,0,0,0,0,0,false,null,null,"Não"],["food-pizza-mezzani","Disco de Pizza Brotinho","Mezzani","Massa",50,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-frango-desfiado","Frango desfiado",null,"Proteína",100,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-patinho-moido","Patinho moído",null,"Proteína",100,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-molho-tomate","Molho de tomate",null,"Molho",1,"porcao",0,0,0,0,0,0,false,null,null,"Não"],["food-oregano","Orégano",null,"Tempero",1,"g",0,0,0,0,0,0,false,null,null,"Não"],["food-banana-prata","Banana-prata pequena",null,"Fruta",50,"g",49,0.65,13,0.05,1,0,false,null,null,"Não"],["food-timbers-avela","Timber’s Wafer Avelã","Timber’s","Snack",25,"g",109,1.6,14.75,5.5,2.025,0,false,null,null,"Não"],["food-timbers-cookies","Timber’s Wafer Cookies ’n Cream","Timber’s","Snack",27,"g",113.94,1.404,16.47,4.86,2.052,0,false,null,null,"Não"],["alim-0001","Abacaxi",null,"Fruta",100,"g",48,0.9,12.3,0.1,1,0,false,null,0,"Não"],["alim-0005","Atum",null,"Sem categoria",120,"g",204,34.8,0,7.2,0,0,false,null,0,"Não"],["alim-0006","Aveia",null,"Sem categoria",100,"g",389,16.9,66.3,6.9,10.6,0,false,null,0,"Não"],["alim-0007","Banana",null,"Fruta",90,"g",80.1,0.99,20.52,0.27,2.34,0,false,null,0,"Não"],["alim-0009","Batavo Grego Morango 450 g",null,"Sem categoria",200,"g",254,6.4,30,12,0,0,false,null,0,"Não"],["alim-0010","Batavo Original Integral",null,"Sem categoria",160,"g",96,5.76,7.52,4.8,0,0,false,null,0,"Não"],["alim-0011","Bebida láctea proteica",null,"Sem categoria",100,"ml",60,5.5,7,1.2,0,0,false,null,0,"Não"],["alim-0012","Bebida proteica Isis PRO",null,"Sem categoria",200,"ml",168,15,18,4,0,0,false,null,0,"Não"],["alim-0013","Belive Chips de Batata-Doce com Sal Rosa",null,"Sem categoria",50,"g",256,1.6,28,15.5,2.2,0,false,null,0,"Não"],["alim-0014","Biscoito Recheado Fit",null,"Sem categoria",15,"g",64.5,1.05,10.2,2.1,0.75,0,false,null,0,"Não"],["alim-0015","Biscoito Wafer Limão - Lowçucar",null,"Sem categoria",6,"g",30,0.36,4.02,1.38,0.18,0,false,null,0,"Não"],["alim-0016","Bolachinha Magictoast cacau",null,"Sem categoria",3.5,"g",12.495,0.294,2.66,0.077,0.143,0,false,null,0,"Não"],["alim-0017","Caju",null,"Sem categoria",90,"g",39.6,0.81,9.27,0.27,1.53,0,false,null,0,"Não"],["alim-0019","Carne vermelha (moída/bife)",null,"Sem categoria",100,"g",172,26,0,7.5,0,0,false,null,0,"Não"],["alim-0021","Chips de Batata doce Roots",null,"Sem categoria",45,"g",223.2,1.8,26.1,12.6,3.15,0,false,null,0,"Não"],["alim-0022","Chocolate Hershey's Branco",null,"Sem categoria",100,"g",541,7,59,31,0,0,false,null,0,"Não"],["alim-0023","Chocolate Hershey's meio amargo",null,"Sem categoria",100,"g",550,6,52,35,7,0,false,null,0,"Não"],["alim-0024","Chocowheyfer +Mu",null,"Sem categoria",25,"g",126,5,13.5,5.75,1,0,false,null,0,"Não"],["alim-0027","Danete Natural Whey",null,"Sem categoria",100,"g",68,7,8,0.9,0,0,false,null,0,"Não"],["alim-0028","Doce de leite",null,"Sem categoria",100,"g",315,5.5,60,6,0,0,false,null,0,"Não"],["alim-0030","Frutas (média)",null,"Fruta",90,"g",49.5,0.63,12.15,0.18,1.98,0,false,null,0,"Não"],["alim-0031","Goiaba",null,"Fruta",90,"g",48.6,0.99,11.7,0.36,5.58,0,false,46291.625878113424,1,"Não"],["alim-0033","Granola Tia Sônia Tradicional",null,"Sem categoria",40,"g",163.2,3.68,24,5.2,2.76,0,false,46292.0027662037,1,"Não"],["alim-0034","Molho de Tomate com Pedaços e Azeitona",null,"Sem categoria",60,"g",30.6,0.48,5.82,0.6,0.72,0,false,null,0,"Não"],["alim-0035","Chocolate Hershey's Cookies 'n' Creme",null,"Sem categoria",25,"g",132.75,1.15,16.75,6.75,0.15,0,false,null,0,"Não"],["alim-0037","Iogurte natural",null,"Sem categoria",100,"g",71,4,5.5,3.7,0,0,false,null,0,"Não"],["alim-0038","Kiwi",null,"Sem categoria",90,"g",54.9,0.99,13.23,0.45,2.7,0,false,null,0,"Não"],["alim-0039","Laranja",null,"Sem categoria",90,"g",42.3,0.81,10.62,0.09,2.16,0,false,46292.481352083334,1,"Não"],["alim-0040","Legumes refogados (abobrinha/cenoura/chuchu)",null,"Sem categoria",100,"g",30,1.2,5.5,0.5,2,0,false,null,0,"Não"],["alim-0041","Leite",null,"Sem categoria",100,"g",61,3.2,4.7,3.3,0,0,false,null,0,"Não"],["alim-0042","Limão",null,"Sem categoria",90,"g",26.1,0.99,8.37,0.27,2.52,0,false,null,0,"Não"],["alim-0044","Macarrão cozido",null,"Sem categoria",100,"g",157,5.8,30.9,0.9,1.8,0,false,null,0,"Não"],["alim-0046","Mamão",null,"Sem categoria",100,"g",43,0.5,10.8,0.3,1.7,0,false,null,0,"Não"],["alim-0047","Manga",null,"Sem categoria",90,"g",54,0.72,13.5,0.36,1.44,0,false,null,0,"Não"],["alim-0048","Massa de lasanha",null,"Sem categoria",40,"g",64,2.32,12.4,0.48,0.72,0,false,null,0,"Não"],["alim-0049","Massa de Pastel (Massa Leve)",null,"Sem categoria",15,"g",45,1.05,7.2,1.35,0.3,0,false,null,0,"Não"],["alim-0050","Massa de pizza (Mezzani)",null,"Sem categoria",40,"g",111.2,3.56,19.6,2,0.68,0,false,null,0,"Não"],["alim-0051","Mel de abelha",null,"Sem categoria",100,"g",304,0.3,82.4,0,0.2,0,false,null,0,"Não"],["alim-0052","Melancia",null,"Fruta",100,"g",33,0.9,8.1,0,0.1,0,false,null,0,"Não"],["alim-0053","Melão",null,"Fruta",100,"g",29,0.7,7.5,0,0.3,0,false,null,0,"Não"],["alim-0054","Milho de pipoca",null,"Sem categoria",30,"g",112.2,3.6,20.4,1.8,1.29,0,false,null,0,"Não"],["alim-0055","Mix de Castanhas Taeq",null,"Sem categoria",25,"g",125,4.5,7,9.5,1.75,0,false,null,0,"Não"],["alim-0056","Morango",null,"Fruta",100,"g",30,0.9,6.8,0.3,1.7,0,false,46292.0027662037,1,"Não"],["alim-0057","Nutrata Whey Grego Brigadeiro",null,"Sem categoria",40,"g",173,11,15,7.5,1,0,false,null,0,"Não"],["alim-0058","Nutrata Whey Grego Mousse de Maracujá",null,"Sem categoria",40,"g",173,11,15,7.5,1,0,false,null,0,"Não"],["alim-0059","Nutrata Whey Grego Torta de Limão",null,"Sem categoria",40,"g",173,11,15,7.5,1,0,false,null,0,"Não"],["alim-0060","Oreo Original",null,"Sem categoria",12,"g",55.8,0.612,8.16,2.28,0.288,0,false,null,0,"Não"],["alim-0062","Paio ou Calabresa",null,"Sem categoria",50,"g",165,8,1,14.5,0,0,false,null,0,"Não"],["alim-0063","Pão de queijo Forno de Minas",null,"Sem categoria",27,"g",74.52,1.485,10.8,2.835,0.405,0,false,null,0,"Não"],["alim-0064","Pão Plusvita Artesano Integral 30%",null,"Sem categoria",40,"g",105.6,4.8,18.8,1.24,2.04,0,false,null,0,"Não"],["alim-0065","Pêra",null,"Fruta",90,"g",47.7,0.54,12.6,0.09,2.7,0,false,null,0,"Não"],["alim-0066","Piracanjuba Pro Force Chocolate",null,"Sem categoria",250,"g",155,15,20,1.25,3,0,false,null,0,"Não"],["alim-0067","Piracanjuba Pro Force Morango",null,"Sem categoria",250,"g",150,15,20,0.75,2.5,0,false,null,0,"Não"],["alim-0068","Piracanjuba Requeijão Cremoso Tradicional",null,"Sem categoria",30,"g",107.4,3.9,2.7,10.2,0,0,false,46292.481352083334,1,"Não"],["alim-0069","Président Creme de Ricota",null,"Sem categoria",30,"g",43.2,1.92,1.44,3.3,0,0,false,null,0,"Não"],["alim-0072","Rap10 fit",null,"Sem categoria",33,"g",74.91,2.376,14.52,0.825,3.168,0,false,null,0,"Não"],["alim-0074","Salada crua (folhas/legumes)",null,"Sem categoria",100,"g",20,1.2,3.5,0.2,2,0,false,null,0,"Não"],["alim-0075","Suco de Cajá",null,"Sem categoria",100,"ml",25,0.3,6,0.1,0.5,0,false,null,0,"Não"],["alim-0076","Suco de Frutas Vermelhas",null,"Sem categoria",100,"ml",20,0.2,4.8,0.1,0.4,0,false,null,0,"Não"],["alim-0077","Tangerina",null,"Fruta",90,"g",34.2,0.72,8.64,0.09,0.81,0,false,null,0,"Não"],["alim-0081","Uva",null,"Sem categoria",100,"g",69,0.7,18.1,0.2,0.9,0,false,null,0,"Não"],["alim-0082","Vigor Grego Morango",null,"Sem categoria",90,"g",137.997,4.698,15.003,6.696,0,0,false,null,0,"Não"],["alim-0083","Vigor Requeijão Cremoso Tradicional",null,"Sem categoria",30,"g",77.7,2.25,0.99,7.2,0,0,false,null,0,"Não"],["alim-0084","Whey proteína (pó)",null,"Sem categoria",100,"g",380,75,10,4,0,0,false,null,0,"Não"],["alim-0085","Suco de Morango",null,"Sem categoria",100,"ml",32,0.7,7.7,0.3,2,0,false,null,0,"Não"],["alim-0086","Feijão branco cozido",null,"Sem categoria",100,"g",111,7.5,20.3,0.4,6.3,0,false,null,0,"Não"],["alim-0087","Feijão carioca cozido",null,"Sem categoria",100,"g",76,4.8,13.6,0.5,8.5,0,false,null,0,"Não"],["alim-0088","Feijão macassa cozido",null,"Sem categoria",100,"g",78,5.1,13.5,0.6,7.5,0,false,null,0,"Não"],["alim-0089","Feijão preto cozido",null,"Sem categoria",100,"g",77,4.5,14,0.5,8.4,0,false,null,0,"Não"],["alim-0090","Feijão-fava cozido",null,"Sem categoria",100,"g",110,7.6,19.7,0.4,5.4,0,false,46291.625878113424,1,"Não"],["alim-0091","Feijão-verde cozido",null,"Sem categoria",100,"g",76,4.8,13.6,0.5,7.9,0,false,null,0,"Não"],["alim-0092","Geleia de Morango Casa Madeira Tradicional",null,"Sem categoria",100,"g",221,0.7,56,0,1.3,0,false,null,0,"Não"],["alim-0093","Macarrão de Arroz Integral Urbano cozido",null,"Sem categoria",100,"g",169,3.4,37,0.8,1.9,0,false,null,0,"Não"],["alim-0094","Macarrão de grano duro cozido",null,"Sem categoria",100,"g",158,5.8,30.9,0.9,1.8,0,false,null,0,"Não"],["alim-0096","Torrada Vitarrella Integral",null,"Sem categoria",8.57,"g",32.052,1.028,5.828,0.514,0.369,0,false,null,0,"Não"],["alim-0097","Super Café",null,"Sem categoria",10,"g",38,0.9,3.2,2.2,2,0,false,null,0,"Não"],["alim-0098","Barra de Nuts Original Taeq",null,"Sem categoria",25,"g",125,4.5,6,9.25,3.75,0,false,null,0,"Não"],["alim-0099","Bolo fofo caseiro com gotas de chocolate",null,"Sem categoria",60,"g",198,3,28.8,7.8,1.2,0,false,null,0,"Não"],["alim-0100","Canela em pó",null,"Sem categoria",100,"g",247,4,80.6,1.2,53.1,0,false,null,0,"Não"],["alim-0101","Biscoito Oreo Grande",null,"Sem categoria",9,"g",41.85,0.459,6.12,1.71,0.216,0,false,null,0,"Não"],["alim-0102","Pão de hambúrguer artesanal",null,"Sem categoria",80,"g",224,7.2,40,4,2.4,0,false,null,0,"Não"],["alim-0103","Hambúrguer Perdigão Na Brasa",null,"Sem categoria",150,"g",412.95,25.05,0,34.95,0,0,false,null,0,"Não"],["alim-0104","Pão de cachorro-quente",null,"Sem categoria",50,"g",135,4,25,2,1,0,false,null,0,"Não"],["alim-0105","Salsicha",null,"Sem categoria",50,"g",145,6,1.5,12.5,0,0,false,null,0,"Não"],["alim-0106","Carne moída",null,"Sem categoria",100,"g",215,26,0,12,0,0,false,null,0,"Não"],["alim-0107","Batata frita congelada Airfryer",null,"Sem categoria",100,"g",204,3,34,3.4,4.3,0,false,null,0,"Não"],["alim-0108","Sucralose Linea",null,"Sem categoria",0.5,"g",1.8,0,0.45,0,0,0,false,null,0,"Não"],["alim-0109","Polpa de Cajá",null,"Sem categoria",100,"g",35,0.9,6.3,1,0,0,false,null,0,"Não"],["alim-0110","Polpa de Frutas Vermelhas Ideal",null,"Sem categoria",100,"g",78,1,18,0,2.7,0,false,null,0,"Não"],["alim-0111","Monster Energy Tradicional Zero Sugar 473ml",null,"Sem categoria",473,"ml",14.19,0,4.73,0,0,0,false,null,0,"Não"],["alim-0112","Brigadeiro (média)",null,"Sem categoria",20,"g",72,1,11.6,2.4,0.3,0,false,null,0,"Não"],["alim-0113","Beijinho (média)",null,"Sem categoria",20,"g",76,1,11,3.2,0.4,0,false,null,0,"Não"],["alim-0114","Cajuzinho (média)",null,"Sem categoria",20,"g",82,1.6,10,4,0.5,0,false,null,0,"Não"],["alim-0115","Brigadeiro branco (média)",null,"Sem categoria",20,"g",76,1,11.4,3,0,0,false,null,0,"Não"],["alim-0116","H2OH! Limoneto Zero Açúcar",null,"Sem categoria",350,"ml",3.01,0,0.301,0,0,0,false,null,0,"Não"],["alim-0117","Docinho de festa (média)",null,"Sem categoria",20,"g",75,1,11.2,3,0.24,0,false,null,0,"Não"],["alim-0118","Negresco Nestlé",null,"Sem categoria",9,"g",43.2,0.45,6.39,1.71,0.189,0,false,null,0,"Não"],["alim-0119","Chocolate Garoto Ao Leite 80g",null,"Sem categoria",80,"g",428,4.88,44.8,24.8,2.96,0,false,null,0,"Não"],["alim-0120","3 Corações Power Cappuccino Chocolate 250ml",null,"Sem categoria",250,"ml",165,15,19.75,2.75,1.75,0,false,null,0,"Não"],["alim-0121","Iogurte Nestlé Morango 85g",null,"Sem categoria",85,"g",59.5,2.04,11.05,0.765,0,0,false,null,0,"Não"],["alim-0122","Legumes mistos (cenoura/milho/ervilha/cebola)",null,"Sem categoria",100,"g",63,2.7,12.9,0.7,3.1,0,false,null,0,"Não"],["alim-0123","Nutrata Caramel Protein 45g",null,"Sem categoria",45,"g",192.002,9.999,14.998,9.999,1.998,1.998,false,null,0,"Não"],["alim-0124","Chips de Macaxeira Jumps Natural",null,"Sem categoria",25,"g",121,1,6.4,4,1,0,false,null,0,"Não"],["alim-0125","Parmalat Fit Whey Chocolate 250ml",null,"Sem categoria",250,"ml",132.5,15.25,12.5,2.5,0.75,10.25,false,null,0,"Não"],["alim-0126","Biscoito Recheado Limão Lowçucar",null,"Sem categoria",10,"g",37.8,0.64,6.2,1.5,0.54,0.12,false,null,0,"Não"],["food-belive-protein-brownie-double-chocolate","Belive Protein Brownie Double Chocolate","Belive","Snack",40,"g",152,5.3,17,6.9,1,13,false,null,0,"Não"],["food-santa-clara-cappuccino-proteina","Santa Clara Cappuccino + Proteína","Santa Clara","Bebida proteica",260,"ml",166,15,20,2.9,0,16,false,46291.62504658565,1,"Não"],["food-toop-wafer-limao","Toop Wafer Zero Açúcar Limão","Toop","Snack",30,"g",111,0.8,10,7.5,0,0,false,null,0,"Não"],["food-toop-wafer-morango","Toop Wafer Zero Açúcar Morango","Toop","Snack",30,"g",111,0.8,10,7.5,0,0,false,null,0,"Não"],["food-mukebar-cookies-n-cream","MukeBar Cookies ’n Cream","Mais Mu","Barra proteica",60,"g",248,15,18,13,4,5.1,false,null,0,"Não"],["food-3coracoes-cappuccino-classic-power","3 Corações Cappuccino Classic Power 15g Proteínas","3 Corações","Bebida proteica",260,"ml",166,15,20,2.9,0,16,false,null,0,"Não"],["food-cappuccino","Cappuccino sem açúcar",null,"Bebida",1,"porcao",0,0,0,0,0,0,false,null,null,"Não"]],"plan_header":["id","versaoPlano","ativo","refeicao","horario","opcaoNumero","itemOrdem","opcaoNome","textoOriginal","alimentoId","alimentoPadronizado","quantidade","unidade","alternativaGrupo","substituivel","observacao","createdAt","updatedAt"],"plan_rows":[["planitem-opt-001","plano-v1","Sim","Café da manhã","06:30",1,1,"Cuscuz com ovos","Maçã média","food-maca","Maçã",100,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-002","plano-v1","Sim","Café da manhã","06:30",1,2,"Cuscuz com ovos","Cuscuz de milho cozido","food-cuscuz","Cuscuz de milho cozido",100,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-003","plano-v1","Sim","Café da manhã","06:30",1,3,"Cuscuz com ovos","Ovos mexidos","food-ovos","Ovos mexidos",2,"un",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-004","plano-v1","Sim","Café da manhã","06:30",1,4,"Cuscuz com ovos","Queijo coalho ou mussarela","food-queijo-coalho","Queijo coalho",20,"g","queijo","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-005","plano-v1","Sim","Café da manhã","06:30",1,5,"Cuscuz com ovos","Requeijão light","food-requeijao-light","Requeijão light",10,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-006","plano-v1","Sim","Café da manhã","06:30",1,6,"Cuscuz com ovos","Café coado sem açúcar ou cappuccino sem açúcar","food-cafe","Café coado sem açúcar",null,null,"bebida","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-007","plano-v1","Sim","Café da manhã","06:30",1,7,"Cuscuz com ovos","Creatina","food-creatina","Creatina",5,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-008","plano-v1","Sim","Café da manhã","06:30",2,1,"Pão integral com ovos","Maçã média","food-maca","Maçã",100,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-009","plano-v1","Sim","Café da manhã","06:30",2,2,"Pão integral com ovos","Pão 100% integral","food-pao-integral","Pão 100% integral",2,"fatias",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-010","plano-v1","Sim","Café da manhã","06:30",2,3,"Pão integral com ovos","Ovos mexidos","food-ovos","Ovos mexidos",2,"un",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-011","plano-v1","Sim","Café da manhã","06:30",2,4,"Pão integral com ovos","Queijo coalho","food-queijo-coalho","Queijo coalho",20,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-012","plano-v1","Sim","Café da manhã","06:30",2,5,"Pão integral com ovos","Requeijão light","food-requeijao-light","Requeijão light",10,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-013","plano-v1","Sim","Café da manhã","06:30",2,6,"Pão integral com ovos","Café coado sem açúcar ou cappuccino sem açúcar","food-cafe","Café coado sem açúcar",null,null,"bebida","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-014","plano-v1","Sim","Café da manhã","06:30",2,7,"Pão integral com ovos","Creatina","food-creatina","Creatina",5,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-015","plano-v1","Sim","Café da manhã","06:30",3,1,"Tapioca com ovos","Maçã média","food-maca","Maçã",100,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-016","plano-v1","Sim","Café da manhã","06:30",3,2,"Tapioca com ovos","Goma de tapioca","food-tapioca","Goma de tapioca",60,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-017","plano-v1","Sim","Café da manhã","06:30",3,3,"Tapioca com ovos","Ovos mexidos","food-ovos","Ovos mexidos",2,"un",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-018","plano-v1","Sim","Café da manhã","06:30",3,4,"Tapioca com ovos","Queijo coalho","food-queijo-coalho","Queijo coalho",20,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-019","plano-v1","Sim","Café da manhã","06:30",3,5,"Tapioca com ovos","Café coado sem açúcar ou cappuccino sem açúcar","food-cafe","Café coado sem açúcar",null,null,"bebida","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-020","plano-v1","Sim","Café da manhã","06:30",3,6,"Tapioca com ovos","Creatina","food-creatina","Creatina",5,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-021","plano-v1","Sim","Lanche da manhã","09:30",1,1,"Iogurte proteico com castanhas","YoPro","food-yopro","YoPro",250,"ml","iogurte","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-022","plano-v1","Sim","Lanche da manhã","09:30",1,2,"Iogurte proteico com castanhas","Iogurte Batavo Pense Zero Líquido","food-pense-zero-liquido","Iogurte Batavo Pense Zero Líquido",200,"g","iogurte","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-023","plano-v1","Sim","Lanche da manhã","09:30",1,3,"Iogurte proteico com castanhas","Castanha de caju ou amendoim","food-castanha-caju","Castanha de caju",20,"g","oleaginosa","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-024","plano-v1","Sim","Lanche da manhã","09:30",2,1,"Pão com patê","Pão integral","food-pao-integral","Pão 100% integral",2,"fatias",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-025","plano-v1","Sim","Lanche da manhã","09:30",2,2,"Pão com patê","Patê caseiro de frango ou atum com requeijão light","food-pate-frango","Patê caseiro de frango",null,null,"pate","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-026","plano-v1","Sim","Lanche da manhã","09:30",3,1,"Chips com iogurte","Mandioca Chips Belive","food-mandioca-chips","Mandioca Chips",50,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-027","plano-v1","Sim","Lanche da manhã","09:30",3,2,"Chips com iogurte","YoPro ou Iogurte Pense Zero","food-yopro","YoPro",1,"porção","iogurte","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-028","plano-v1","Sim","Lanche da manhã","09:30",4,1,"Magic Toast com patê","Magic Toast","food-magic-toast","Magic Toast",4,"un","base","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-029","plano-v1","Sim","Lanche da manhã","09:30",4,2,"Magic Toast com patê","Biscoitos recheados Lowçucar","alim-0126","Biscoito Recheado Limão Lowçucar",3,"un","base","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-030","plano-v1","Sim","Lanche da manhã","09:30",4,3,"Magic Toast com patê","Patê caseiro de frango ou atum","food-pate-frango","Patê caseiro de frango",null,null,"pate","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-031","plano-v1","Sim","Almoço","11:45",1,1,"Arroz, feijão e proteína","Arroz branco ou integral","food-arroz-branco","Arroz branco cozido",150,"g","arroz","Sim","Segunda a sexta","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-032","plano-v1","Sim","Almoço","11:45",1,2,"Arroz, feijão e proteína","Feijão cozido","food-feijao","Feijão cozido",100,"g","leguminosa","Sim","Segunda a sexta","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-033","plano-v1","Sim","Almoço","11:45",1,3,"Arroz, feijão e proteína","Fava","alim-0090","Feijão-fava cozido",80,"g","leguminosa","Sim","Segunda a sexta","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-034","plano-v1","Sim","Almoço","11:45",1,4,"Arroz, feijão e proteína","Peito de frango ou carne bovina magra ou lombo/bisteca suína magra","food-frango","Peito de frango",150,"g","proteina","Sim","Segunda a sexta","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-035","plano-v1","Sim","Almoço","11:45",1,5,"Arroz, feijão e proteína","Salada de pepino e tomate","food-pepino","À vontade não entra no cálculo",1,"à vontade",null,"Não","Segunda a sexta","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-036","plano-v1","Sim","Almoço","11:45",1,6,"Arroz, feijão e proteína","Azeite extravirgem","food-azeite","Azeite extravirgem",8,"g",null,"Não","Segunda a sexta","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-037","plano-v1","Sim","Almoço","11:45",2,1,"Macarrão integral com proteína","Macarrão integral cozido","food-macarrao-integral","Macarrão integral cozido",180,"g",null,"Não","Sábado e domingo","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-038","plano-v1","Sim","Almoço","11:45",2,2,"Macarrão integral com proteína","Carne moída (patinho) ou peito de frango desfiado","food-carne-moida-patinho","Carne moída de patinho",150,"g","proteina","Sim","Sábado e domingo","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-039","plano-v1","Sim","Almoço","11:45",2,3,"Macarrão integral com proteína","Molho natural de tomate","food-molho-natural-tomate","Molho natural de tomate",1,"porção",null,"Não","Sábado e domingo","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-040","plano-v1","Sim","Almoço","11:45",2,4,"Macarrão integral com proteína","Salada de pepino e tomate","food-pepino","À vontade não entra no cálculo",1,"à vontade",null,"Não","Sábado e domingo","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-041","plano-v1","Sim","Lanche da tarde","16:00",1,1,"Wafer ou bolinho com iogurte","Bolinho Belive Double Chocolate Zero","food-bolinho-belive","Bolinho Double Chocolate Zero",40,"g","doce","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-042-avela","plano-v1","Sim","Lanche da tarde","16:00",1,2,"Wafer ou bolinho com iogurte","Timber’s Wafer Avelã","food-timbers-avela","Timber’s Wafer Avelã",25,"g","doce","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-042-chocolate","plano-v1","Sim","Lanche da tarde","16:00",1,3,"Wafer ou bolinho com iogurte","Timber’s Wafer Chocolate","food-timbers-chocolate","Timber’s Wafer Chocolate",27,"g","doce","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-042-cookies","plano-v1","Sim","Lanche da tarde","16:00",1,4,"Wafer ou bolinho com iogurte","Timber’s Wafer Cookies ’n Cream","food-timbers-cookies","Timber’s Wafer Cookies ’n Cream",27,"g","doce","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-043","plano-v1","Sim","Lanche da tarde","16:00",1,5,"Wafer ou bolinho com iogurte","Iogurte Batavo Pense Zero","food-pense-zero-liquido","Iogurte Batavo Pense Zero Líquido",200,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-044","plano-v1","Sim","Lanche da tarde","16:00",2,1,"Canjica com iogurte","Canjica Okoshi Cacau e Açúcar de Coco","food-canjica-okoshi","Canjica Cacau e Açúcar de Coco",50,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-045","plano-v1","Sim","Lanche da tarde","16:00",2,2,"Canjica com iogurte","YoPro ou Iogurte Pense Zero","food-yopro","YoPro",1,"porção","iogurte","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-046","plano-v1","Sim","Lanche da tarde","16:00",3,1,"Pão com patê e castanhas","Pão integral","food-pao-integral","Pão 100% integral",2,"fatias",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-047","plano-v1","Sim","Lanche da tarde","16:00",3,2,"Pão com patê e castanhas","Patê caseiro de frango","food-pate-frango","Patê caseiro de frango",1,"porção",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-048","plano-v1","Sim","Lanche da tarde","16:00",3,3,"Pão com patê e castanhas","Castanha de caju ou amendoim","food-castanha-caju","Castanha de caju",15,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-049","plano-v1","Sim","Lanche da tarde","16:00",4,1,"Barra proteica com iogurte","Barra de proteína","food-barra-proteina","Barra de proteína",1,"un",null,"Não","15g–20g de proteína conforme o plano","2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-050","plano-v1","Sim","Lanche da tarde","16:00",4,2,"Barra proteica com iogurte","Iogurte Batavo Pense Zero Morango com Pedaços","food-pense-zero-morango","Iogurte Pense Zero Morango com Pedaços",100,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-051","plano-v1","Sim","Jantar","18:30",1,1,"Raiz com proteína","Inhame, macaxeira ou batata-doce cozida","food-inhame","Inhame cozido",150,"g","raiz","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-052","plano-v1","Sim","Jantar","18:30",1,2,"Raiz com proteína","Carne bovina magra, peito de frango ou porco magro","food-frango","Peito de frango",150,"g","proteina","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-053","plano-v1","Sim","Jantar","18:30",1,3,"Raiz com proteína","Salada de pepino e tomate","food-pepino","À vontade não entra no cálculo",1,"à vontade",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-054","plano-v1","Sim","Jantar","18:30",1,4,"Raiz com proteína","Coca-Cola Zero ou Guaraná Zero","food-coca-zero","Coca-Cola Zero",350,"ml","bebida","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-055","plano-v1","Sim","Jantar","18:30",2,1,"Cuscuz com proteína","Cuscuz de milho","food-cuscuz","Cuscuz de milho cozido",120,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-056","plano-v1","Sim","Jantar","18:30",2,2,"Cuscuz com proteína","Ovos mexidos","food-ovos","Ovos mexidos",3,"un","proteina","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-057","plano-v1","Sim","Jantar","18:30",2,3,"Cuscuz com proteína","Frango desfiado ou carne","food-frango","Peito de frango",120,"g","proteina","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-058","plano-v1","Sim","Jantar","18:30",2,4,"Cuscuz com proteína","Queijo coalho","food-queijo-coalho","Queijo coalho",20,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-059","plano-v1","Sim","Jantar","18:30",2,5,"Cuscuz com proteína","Coca-Cola Zero ou Guaraná Zero","food-coca-zero","Coca-Cola Zero",350,"ml","bebida","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-060","plano-v1","Sim","Jantar","18:30",3,1,"Pizza brotinho","Disco de Pizza Brotinho Mezzani","alim-0050","Massa de pizza (Mezzani)",50,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-061","plano-v1","Sim","Jantar","18:30",3,2,"Pizza brotinho","Frango desfiado ou patinho moído","food-frango","Peito de frango",100,"g","proteina","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-062","plano-v1","Sim","Jantar","18:30",3,3,"Pizza brotinho","Queijo mussarela ou coalho","food-mussarela","Queijo mussarela",30,"g","queijo","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-063","plano-v1","Sim","Jantar","18:30",3,4,"Pizza brotinho","Molho de tomate e orégano","food-molho-tomate","Molho de tomate",1,"porção",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-064","plano-v1","Sim","Jantar","18:30",3,5,"Pizza brotinho","Coca-Cola Zero ou Guaraná Zero","food-coca-zero","Coca-Cola Zero",350,"ml","bebida","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-065","plano-v1","Sim","Ceia","21:00",1,1,"Iogurte","Iogurte Batavo Pense Zero Morango com Pedaços","food-pense-zero-morango","Iogurte Pense Zero Morango com Pedaços",150,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-066","plano-v1","Sim","Ceia","21:00",2,1,"Fruta","Maçã fatiada","food-maca","Maçã",1,"un","fruta","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-067","plano-v1","Sim","Ceia","21:00",2,2,"Fruta","Banana-prata pequena","food-banana-prata","Banana-prata pequena",50,"g","fruta","Sim",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"],["planitem-opt-068","plano-v1","Sim","Ceia","21:00",3,1,"Castanhas","Castanha de caju ou amendoim","food-castanha-caju","Castanha de caju",15,"g",null,"Não",null,"2026-09-27T10:45:00","2026-09-27T10:45:00"]],"versions_header":["id","nome","inicioVigencia","fimVigencia","status","origem","observacoes","createdAt","updatedAt","ativo"],"versions_rows":[["plano-v1","Planejamento Alimentar Personalizado","2026-09-27",null,"Ativo","Migrado de Opcoes_Originais","Metas do plano: ~2.250 kcal; 180 g proteína; 225 g carboidratos; 70 g lipídeos; água 2,5–3,0 L/dia.","2026-09-27T10:45:00","2026-09-27T10:45:00","Sim"]],"metas_header":["userId","waterMl","kcalGoal","proteinGGoal","carbsGGoal","fatGGoal","fiberGGoal","sugarGGoal","updatedAt","notes"],"metas_rows":[["default",3000,2250,180,225,70,null,null,"2026-09-27","Metas do plano: VET ~2.250 kcal; proteínas 180 g; carboidratos 225 g; lipídeos 70 g; água 2,5–3,0 L/dia."]]};

function rowObjects(header, rs){return (rs||[]).map(r=>Object.fromEntries(header.map((h,i)=>[String(h||''),r?.[i]??''])));}
function norm(v){return String(v??'').trim();}
function sameGoals(g){return Number(g?.kcalGoal)===2250&&Number(g?.proteinGGoal)===180&&Number(g?.carbsGGoal)===225&&Number(g?.fatGGoal)===70&&Number(g?.waterMl)===3000&&!norm(g?.fiberGGoal)&&!norm(g?.sugarGGoal);}
async function migrate1141(){
  try{
    if(!window.FILES||!FILES.nutrition||!window.state?.books?.[FILES.nutrition]) return;
    let changed=false;

    const fh=(rows(FILES.nutrition,'Alimentos')[0]||SEED.foods_header).map(String);
    const current=typeof foodRows==='function'?foodRows():objRows(FILES.nutrition,'Alimentos');
    const seed=rowObjects(SEED.foods_header,SEED.foods_rows);
    const map=new Map(current.map(x=>[norm(x.id),x]).filter(x=>x[0]));
    for(const sf of seed){
      const id=norm(sf.id); if(!id) continue;
      const old=map.get(id);
      if(!old){map.set(id,sf);changed=true;continue;}
      const keep={favorite:old.favorite,lastUsedAt:old.lastUsedAt,usageCount:old.usageCount,archived:old.archived};
      const merged={...old,...sf};
      Object.keys(keep).forEach(k=>{if(keep[k]!==''&&keep[k]!=null)merged[k]=keep[k]});
      map.set(id,merged);
    }
    if(changed||current.length<SEED.foods_rows.length){
      await saveSheet(FILES.nutrition,'Alimentos',toRows([...map.values()],fh));
      changed=true;
    }

    const g=typeof goalsRows==='function'?(goalsRows()[0]||{}):{};
    if(!sameGoals(g)){
      await saveSheet(FILES.nutrition,'Metas',[SEED.metas_header,...SEED.metas_rows]);
      changed=true;
    }

    const curPlan=objRows(FILES.nutrition,'Plano_Nutricionista');
    if(!curPlan.length&&SEED.plan_rows.length){
      await saveSheet(FILES.nutrition,'Plano_Nutricionista',[SEED.plan_header,...SEED.plan_rows]);
      changed=true;
    }

    const vh=(rows(FILES.nutrition,'Planos_Versoes')[0]||SEED.versions_header).map(String);
    let vs=objRows(FILES.nutrition,'Planos_Versoes');
    if(!vs.length)vs=rowObjects(SEED.versions_header,SEED.versions_rows);
    const active=vs.find(v=>String(v.ativo||'').toLowerCase()==='sim'||String(v.status||'').toLowerCase()==='ativo')||vs[0];
    if(active&&(active.nome!=='Planejamento Alimentar Personalizado'||!String(active.observacoes||'').includes('2.250'))){
      active.nome='Planejamento Alimentar Personalizado';
      active.observacoes='Metas do plano: ~2.250 kcal; 180 g proteína; 225 g carboidratos; 70 g lipídeos; água 2,5–3,0 L/dia.';
      await saveSheet(FILES.nutrition,'Planos_Versoes',toRows(vs,vh));
      changed=true;
    }
    if(changed){try{render()}catch(e){}}
  }catch(e){console.error('Migração Nutrição 11.4.1:',e)}
}
window.AF_NUTRICAO_MIGRATE_1141=migrate1141;
setTimeout(migrate1141,900);
})();

    ctl.components.push("nutrition_data_migration_v1141.js");
/* AF+ v10.1.3 — Nutrição sem planejamento diário
   O plano do nutricionista permanece como referência oficial.
   Hoje/Semana trabalham somente com consumos registrados. */
(function(){
  if(typeof state==='undefined') return;
  if(state.nutTab==='week' && typeof state.nutWeekOffset==='undefined') state.nutWeekOffset=0;

  function mealConsumptionsV1013(date, meal){
    return consumptionRows().filter(x=>String(x.date||'')===String(date||'') && String(x.meal||'')===String(meal||''));
  }
  function mealTotalV1013(rows){
    return rows.reduce((a,x)=>{a.kcal+=num(x.kcal);a.protein+=num(x.proteinG);a.carbs+=num(x.carbsG);a.fat+=num(x.fatG);return a},{kcal:0,protein:0,carbs:0,fat:0});
  }
  function consumptionDetailV1013(c){
    const items=consumptionItemRows().filter(x=>String(x.consumptionId)===String(c.id));
    const detail=items.map(i=>`${esc(i.foodName||'Item')} ${fmt(i.quantity)} ${esc(i.unit||'')}`).join(' • ');
    return `<div class="consumed-item"><div><strong>${esc(c.name||c.referenceId||'Consumo')}</strong><small>${detail||esc(c.type||'Registrado')}</small></div><div><strong>${fmt(c.kcal)} kcal</strong><small>${fmt(c.proteinG)} g proteína</small></div></div>`;
  }

  nutToday=function(){
    const date=today();
    const cs=consumptionsForDate(date);
    let html=nutritionDashboard();
    html+=`<div class="sectiontitle"><div><h3>Consumido hoje</h3><span class="muted">${brDate(date)} • sem planejamento diário</span></div><button class="btn orange" id="directConsume">+ Registrar consumo</button></div>`;
    html+=`<div class="card dayplan todayplan">${mealNames().map(meal=>{
      const rows=cs.filter(x=>String(x.meal||'')===meal);
      const tot=mealTotalV1013(rows);
      return `<div class="mealrow ${rows.length?'consumed-row':''}"><div><strong>${esc(meal)}</strong><div class="muted">${rows.length?`${rows.length} registro(s)`:'Ainda não registrado'}</div></div><div>${rows.length?rows.map(consumptionDetailV1013).join(''):'<span class="muted">Nenhum consumo registrado nesta refeição.</span>'}</div><div class="mealactions">${rows.length?`<span class="statuspill done">${fmt(tot.kcal)} kcal</span>`:''}</div></div>`;
    }).join('')}</div>`;
    return html;
  };

  nutWeek=function(){
    const dates=weekDates(state.nutWeekOffset||0);
    const all=consumptionRows();
    let html=nutritionDashboard();
    html+=`<div class="sectiontitle"><div><h3>Consumidos da semana</h3><span class="muted">Somente registros reais • sem planejamento alimentar</span></div><div><button class="btn" id="prevNutWeek">← Semana anterior</button><button class="btn" id="nextNutWeek">Próxima semana →</button></div></div>`;
    html+=`<div class="tablewrap"><table class="table week"><thead><tr><th>Refeição</th>${dates.map((d,i)=>`<th>${DAYS[i]}<br><small>${brDate(d)}</small></th>`).join('')}</tr></thead><tbody>`;
    for(const meal of mealNames()){
      html+=`<tr><th>${esc(meal)}</th>`;
      for(const date of dates){
        const rows=all.filter(x=>String(x.date||'')===String(date)&&String(x.meal||'')===meal);
        const tot=mealTotalV1013(rows);
        html+=`<td class="cell ${rows.length?'consumed-cell':''}">${rows.length?`<strong>${rows.map(x=>esc(x.name||'Consumo')).join('<br>')}</strong><br><span class="muted">${fmt(tot.kcal)} kcal</span>`:'<span class="muted">—</span>'}</td>`;
      }
      html+='</tr>';
    }
    html+='</tbody></table></div>';
    const weekTotals=dates.map(d=>({date:d,...nutritionTotalsForDate(d)}));
    html+=`<div class="sectiontitle"><h3>Resumo da semana</h3></div><div class="grid">${weekTotals.map((x,i)=>card(`${DAYS[i]} • ${brDate(x.date)}`,`${fmt(x.kcal)} kcal`,`${fmt(x.protein)} g proteína`)).join('')}</div>`;
    return html;
  };

  nutHistory=function(){
    const all=consumptionRows().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt).localeCompare(String(a.createdAt)));
    if(!all.length)return '<div class="card empty">Nenhum consumo registrado.</div>';
    const dates=[...new Set(all.map(x=>x.date))];
    return `<div class="sectiontitle"><h3>Histórico de consumos</h3><span class="muted">Registro real por dia e refeição</span></div><div class="history-days">${dates.map(d=>{
      const cs=all.filter(x=>x.date===d),tot=nutritionTotalsForDate(d),water=waterRows().filter(x=>x.date===d).reduce((s,x)=>s+num(x.ml),0),g=gastoForDate(d);
      return `<article class="history-day"><div class="history-day-head"><div><span class="body-kicker">${brDate(d)}</span><h3>${fmt(tot.kcal)} kcal</h3></div><div class="train-stats"><span>${fmt(tot.protein)} g proteína</span><span>${fmt(tot.fiber)} g fibra</span><span>${fmt(water)} ml água</span>${g?`<span>${deficitLabel(g)}</span>`:''}</div></div>${cs.map(c=>`<div class="history-meal"><div><strong>${esc(c.meal)}</strong><small>${esc(c.name||'Consumo')}</small></div><div><span class="muted">Consumido</span><strong>${fmt(c.kcal)} kcal</strong></div><div><span class="muted">Tipo</span><strong>${esc(c.type||'registro')}</strong></div></div>`).join('')}</article>`;
    }).join('')}</div>`;
  };

  const previousBindV1013=bind;
  bind=function(){
    previousBindV1013();
    document.getElementById('prevNutWeek')?.addEventListener('click',()=>{state.nutWeekOffset=(state.nutWeekOffset||0)-1;render()});
    document.getElementById('nextNutWeek')?.addEventListener('click',()=>{state.nutWeekOffset=(state.nutWeekOffset||0)+1;render()});
  };
})();

    ctl.components.push("nutrition_consumed_v1013.js");
/* AF+ v10.1.4 — Editor de consumo
   - Opção de refeição: itens editáveis antes de consumir.
   - Alimentos avulsos: vários itens no mesmo consumo.
   - Alterações aqui não modificam a opção-base. */
(function(){
  if(typeof state==='undefined') return;

  let dcItems=[];

  function dcFoodById(id){return foodRows().find(f=>String(foodId(f))===String(id||''));}
  function dcFoodChoices(selected=''){
    return foodRows()
      .filter(f=>String(f.archived||'Não').toLowerCase()!=='sim')
      .map(f=>`<option value="${esc(foodId(f))}" ${String(foodId(f))===String(selected)?'selected':''}>${esc(foodName(f))}</option>`)
      .join('');
  }
  function dcNormalizeOption(name){
    return optionItems(name).map(x=>{
      const f=findFood(x.descricao||'',x.foodId||'');
      return {
        foodId:x.foodId||foodId(f)||'',
        name:foodName(f)||x.descricao||'',
        quantity:num(x.quantidade||0),
        unit:x.unidade||f?.unit||'g',
        origin:'opcao'
      };
    });
  }
  function dcNewItem(){
    const f=foodRows().find(x=>String(x.archived||'Não').toLowerCase()!=='sim');
    return f?{foodId:foodId(f),name:foodName(f),quantity:num(f.portion)||1,unit:f.unit||'g',origin:'adicionado'}:null;
  }
  function dcCalcItem(it){
    const f=dcFoodById(it.foodId)||findFood(it.name,it.foodId||'');
    if(f) it.name=foodName(f);
    const n=foodNutrition(it.name,it.quantity,it.unit,it.foodId||'');
    Object.assign(it,{foodId:n.foodId||it.foodId||'',kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat,fiber:n.fiber,sugar:n.sugar,missingConversion:n.missingConversion});
    return it;
  }
  function dcTotals(){
    dcItems.forEach(dcCalcItem);
    return dcItems.reduce((a,x)=>{
      a.kcal+=num(x.kcal);a.protein+=num(x.protein);a.carbs+=num(x.carbs);a.fat+=num(x.fat);a.fiber+=num(x.fiber);a.sugar+=num(x.sugar);
      if(x.missingConversion)a.warnings.push(`${x.name}: unidade sem conversão`);
      const f=dcFoodById(x.foodId);
      if(f&&typeof foodMissingNutritionData==='function'&&foodMissingNutritionData(f))a.warnings.push(`${x.name}: dados nutricionais pendentes`);
      return a;
    },{kcal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,warnings:[]});
  }
  function dcDraw(){
    const box=document.getElementById('dcEditorLines');
    if(!box)return;
    if(!dcItems.length){
      box.innerHTML='<div class="card empty">Nenhum alimento adicionado.</div>';
    }else{
      box.innerHTML=dcItems.map((it,i)=>{
        const f=dcFoodById(it.foodId);
        const unit=it.unit||f?.unit||'g';
        return `<div class="dc-food-row" data-dc-row="${i}">
          <span class="dc-order">${i+1}</span>
          <select class="dc-food" data-i="${i}">${dcFoodChoices(it.foodId)}</select>
          <input class="dc-qty" data-i="${i}" type="number" min="0" step="0.1" value="${esc(it.quantity)}">
          <select class="dc-unit" data-i="${i}">${unitOptions(unit,f?.unit||unit)}</select>
          <button type="button" class="btn dc-remove" data-i="${i}" title="Remover alimento">×</button>
        </div>`;
      }).join('');
    }
    document.querySelectorAll('.dc-food').forEach(el=>el.onchange=()=>{
      const i=num(el.dataset.i),f=dcFoodById(el.value);if(!dcItems[i]||!f)return;
      dcItems[i].foodId=foodId(f);dcItems[i].name=foodName(f);dcItems[i].quantity=num(f.portion)||1;dcItems[i].unit=f.unit||'g';dcDraw();
    });
    document.querySelectorAll('.dc-qty').forEach(el=>el.oninput=()=>{const i=num(el.dataset.i);if(dcItems[i])dcItems[i].quantity=num(el.value);dcPreview();});
    document.querySelectorAll('.dc-unit').forEach(el=>el.onchange=()=>{const i=num(el.dataset.i);if(dcItems[i])dcItems[i].unit=el.value;dcPreview();});
    document.querySelectorAll('.dc-remove').forEach(el=>el.onclick=()=>{dcItems.splice(num(el.dataset.i),1);dcDraw();});
    dcPreview();
  }
  function dcPreview(){
    const t=dcTotals(),box=document.getElementById('dcPreview');
    if(!box)return;
    box.innerHTML=`<div class="dc-total"><strong>${fmt(t.kcal)} kcal</strong><span>${fmt(t.protein)} g proteína • ${fmt(t.carbs)} g carbo • ${fmt(t.fat)} g gorduras</span></div>${t.warnings.length?`<div class="muted dc-warning">${esc([...new Set(t.warnings)].join(' • '))}</div>`:''}`;
  }
  function dcLoadByMode(){
    const type=document.getElementById('dcType')?.value||'opcao';
    const refWrap=document.getElementById('dcOptionWrap');
    const ref=document.getElementById('dcRef');
    if(type==='opcao'){
      if(refWrap)refWrap.style.display='block';
      const meal=document.getElementById('dcMeal')?.value||'';
      const names=mealOptionNames(meal);
      ref.innerHTML=`<option value="">Selecione uma opção de ${esc(meal)}</option>${names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join('')}`;
      dcItems=[];
    }else{
      if(refWrap)refWrap.style.display='none';
      const first=dcNewItem();dcItems=first?[first]:[];
    }
    dcDraw();
  }
  function dcLoadOption(){
    const name=document.getElementById('dcRef')?.value||'';
    dcItems=name?dcNormalizeOption(name):[];
    const ni=document.getElementById('dcName');if(ni&&!ni.value)ni.value=name;
    dcDraw();
  }

  directConsumeModal=function(){
    const d=state.day;
    state.modal=`<div class="modalhead"><div><h3>Registrar consumo</h3><div class="muted">${DAYS[d]} • registre exatamente o que consumiu</div></div><button class="x" data-close>×</button></div>
      <div class="grid2">
        <div class="field"><label>Refeição</label><select id="dcMeal">${mealNames().map(m=>`<option>${esc(m)}</option>`).join('')}</select></div>
        <div class="field"><label>Tipo</label><select id="dcType"><option value="opcao">Opção de refeição</option><option value="avulsos">Alimentos avulsos</option></select></div>
      </div>
      <div id="dcOptionWrap" class="field"><label>Opção</label><select id="dcRef"></select></div>
      <div class="field"><label>Nome do consumo</label><input id="dcName" type="text" maxlength="120" placeholder="Ex.: Lanche proteico, Cuscuz ajustado..."></div>
      <div class="sectiontitle dc-editor-title"><div><h3>Alimentos consumidos</h3><span class="muted">Altere alimento, quantidade ou unidade antes de registrar.</span></div></div>
      <div class="dc-food-head"><span>#</span><span>Alimento</span><span>Quantidade</span><span>Unidade</span><span></span></div>
      <div id="dcEditorLines"></div>
      <button type="button" class="btn" id="dcAddFood">+ Adicionar alimento</button>
      <div id="dcPreview" class="summary" style="margin-top:12px"></div>
      <div class="muted" style="margin-top:8px">As alterações feitas aqui valem somente para este consumo e não modificam a opção-base.</div>
      <div class="actions" style="margin-top:14px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="dcSave">Registrar consumo</button></div>`;
    render();
    setTimeout(()=>{
      document.getElementById('dcType')?.addEventListener('change',dcLoadByMode);
      document.getElementById('dcMeal')?.addEventListener('change',()=>{if(document.getElementById('dcType')?.value==='opcao')dcLoadByMode();});
      document.getElementById('dcRef')?.addEventListener('change',dcLoadOption);
      document.getElementById('dcAddFood')?.addEventListener('click',()=>{const it=dcNewItem();if(it){dcItems.push(it);dcDraw();}});
      document.getElementById('dcSave')?.addEventListener('click',async()=>{
        const meal=document.getElementById('dcMeal')?.value||'';
        const type=document.getElementById('dcType')?.value||'opcao';
        const ref=document.getElementById('dcRef')?.value||'';
        if(type==='opcao'&&!ref){toast('Selecione uma opção de refeição');return;}
        if(!dcItems.length){toast('Adicione pelo menos um alimento');return;}
        const invalid=dcItems.some(x=>!x.foodId||num(x.quantity)<=0);
        if(invalid){toast('Confira alimento e quantidade em todas as linhas');return;}
        dcItems.forEach(dcCalcItem);
        const typedName=(document.getElementById('dcName')?.value||'').trim();
        const name=typedName||(type==='opcao'?ref:(dcItems.length===1?dcItems[0].name:'Alimentos avulsos'));
        await writeConsumption({
          d:state.day,meal,
          type:type==='opcao'?'opcao_ajustada':'alimentos_avulsos',
          referenceId:type==='opcao'?ref:'',name,
          items:dcItems.map(x=>({...x,origin:type==='opcao'?'opcao_ajustada':'adicionado'}))
        });
        state.modal=null;render();toast('Consumo registrado');
      });
      dcLoadByMode();
      const ni=document.getElementById('dcName');if(ni&&!ni.value)ni.value='Alimentos avulsos';
    },0);
  };
})();

    ctl.components.push("nutrition_consumption_editor_v1014.js");
/* AF+ v10.1.5 — Nutrição: clique para editar/preencher consumos
   Hoje: refeição vazia abre registro pré-preenchido; consumo abre edição.
   Semana: célula vazia abre registro com data/refeição; consumo abre edição.
*/
(function(){
  if(typeof state==='undefined') return;

  let ceItems=[];
  let ceEditingId='';
  let ceDate='';
  let ceMeal='';
  let ceType='opcao';
  let ceReference='';
  let ceName='';
  let ceNameTouched=false;

  function ceFoodById(id){return foodRows().find(f=>String(foodId(f))===String(id||''));}
  function ceFoodChoices(selected=''){
    return foodRows().filter(f=>String(f.archived||'Não').toLowerCase()!=='sim')
      .map(f=>`<option value="${esc(foodId(f))}" ${String(foodId(f))===String(selected)?'selected':''}>${esc(foodName(f))}</option>`).join('');
  }
  function ceNewItem(){
    const f=foodRows().find(x=>String(x.archived||'Não').toLowerCase()!=='sim');
    return f?{foodId:foodId(f),name:foodName(f),quantity:num(f.portion)||1,unit:f.unit||'g',origin:'adicionado'}:null;
  }
  function ceNormalizeOption(name){
    return optionItems(name).map(x=>{
      const f=findFood(x.descricao||'',x.foodId||'');
      return {foodId:x.foodId||foodId(f)||'',name:foodName(f)||x.descricao||'',quantity:num(x.quantidade||0),unit:x.unidade||f?.unit||'g',origin:'opcao'};
    });
  }
  function ceCalcItem(it){
    const f=ceFoodById(it.foodId)||findFood(it.name,it.foodId||'');
    if(f)it.name=foodName(f);
    const n=foodNutrition(it.name,it.quantity,it.unit,it.foodId||'');
    Object.assign(it,{foodId:n.foodId||it.foodId||'',kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat,fiber:n.fiber,sugar:n.sugar,missingConversion:n.missingConversion});
    return it;
  }
  function ceTotals(){
    ceItems.forEach(ceCalcItem);
    return ceItems.reduce((a,x)=>{a.kcal+=num(x.kcal);a.protein+=num(x.protein);a.carbs+=num(x.carbs);a.fat+=num(x.fat);a.fiber+=num(x.fiber);a.sugar+=num(x.sugar);return a},{kcal:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0});
  }
  function ceDraw(){
    const box=document.getElementById('ceEditorLines');if(!box)return;
    box.innerHTML=ceItems.length?ceItems.map((it,i)=>{const f=ceFoodById(it.foodId),unit=it.unit||f?.unit||'g';return `<div class="dc-food-row" data-ce-row="${i}"><span class="dc-order">${i+1}</span><select class="ce-food" data-i="${i}">${ceFoodChoices(it.foodId)}</select><input class="ce-qty" data-i="${i}" type="number" min="0" step="0.1" value="${esc(it.quantity)}"><select class="ce-unit" data-i="${i}">${unitOptions(unit,f?.unit||unit)}</select><button type="button" class="btn ce-remove" data-i="${i}" title="Remover alimento">×</button></div>`}).join(''):'<div class="card empty">Nenhum alimento adicionado.</div>';
    document.querySelectorAll('.ce-food').forEach(el=>el.onchange=()=>{const i=num(el.dataset.i),f=ceFoodById(el.value);if(!ceItems[i]||!f)return;ceItems[i].foodId=foodId(f);ceItems[i].name=foodName(f);ceItems[i].quantity=num(f.portion)||1;ceItems[i].unit=f.unit||'g';ceDraw();});
    document.querySelectorAll('.ce-qty').forEach(el=>el.oninput=()=>{const i=num(el.dataset.i);if(ceItems[i])ceItems[i].quantity=num(el.value);cePreview();});
    document.querySelectorAll('.ce-unit').forEach(el=>el.onchange=()=>{const i=num(el.dataset.i);if(ceItems[i])ceItems[i].unit=el.value;cePreview();});
    document.querySelectorAll('.ce-remove').forEach(el=>el.onclick=()=>{ceItems.splice(num(el.dataset.i),1);ceDraw();});
    cePreview();
  }
  function cePreview(){const t=ceTotals(),box=document.getElementById('cePreview');if(box)box.innerHTML=`<div class="dc-total"><strong>${fmt(t.kcal)} kcal</strong><span>${fmt(t.protein)} g proteína • ${fmt(t.carbs)} g carbo • ${fmt(t.fat)} g gorduras</span></div>`;}

  function ceLoadType(){
    const type=document.getElementById('ceType')?.value||'opcao';ceType=type;
    const wrap=document.getElementById('ceOptionWrap'),ref=document.getElementById('ceRef');
    if(type==='opcao'){
      if(wrap)wrap.style.display='block';
      const meal=document.getElementById('ceMeal')?.value||ceMeal;const names=mealOptionNames(meal);
      ref.innerHTML=`<option value="">Selecione uma opção de ${esc(meal)}</option>${names.map(n=>`<option value="${esc(n)}" ${n===ceReference?'selected':''}>${esc(n)}</option>`).join('')}`;
      if(!ceEditingId){ceItems=[];ceDraw();}
      if(!ceNameTouched&&!ceEditingId){ceName=ceReference||'';const ni=document.getElementById('ceName');if(ni)ni.value=ceName;}
    }else{
      if(wrap)wrap.style.display='none';
      if(!ceEditingId&&!ceItems.length){const first=ceNewItem();ceItems=first?[first]:[];}
      if(!ceNameTouched&&!ceEditingId){ceName='Alimentos avulsos';const ni=document.getElementById('ceName');if(ni)ni.value=ceName;}
      ceDraw();
    }
  }

  async function cePersist(){
    ceMeal=document.getElementById('ceMeal')?.value||ceMeal;
    ceType=document.getElementById('ceType')?.value||ceType;
    ceReference=document.getElementById('ceRef')?.value||ceReference;
    ceName=(document.getElementById('ceName')?.value||ceName||'').trim();
    if(ceType==='opcao'&&!ceReference&&!ceEditingId){toast('Selecione uma opção de refeição');return;}
    if(!ceItems.length){toast('Adicione pelo menos um alimento');return;}
    if(ceItems.some(x=>!x.foodId||num(x.quantity)<=0)){toast('Confira alimento e quantidade em todas as linhas');return;}
    ceItems.forEach(ceCalcItem);const total=ceTotals();const now=new Date().toISOString();
    const consHeaders=rows(FILES.nutrition,'Consumos')[0]?.map(String)||[];
    const itemHeaders=rows(FILES.nutrition,'Consumo_Itens')[0]?.map(String)||[];
    const cons=consumptionRows();let cid=ceEditingId;let c=cons.find(x=>String(x.id)===String(cid));
    if(!c){cid='cons-'+Date.now();c={id:cid,createdAt:now};cons.push(c);}
    const typeValue=ceType==='opcao'?'opcao_ajustada':'alimentos_avulsos';
    const fallbackName=ceType==='opcao'?(ceReference||c.name||'Opção de refeição'):(ceItems.length===1?ceItems[0].name:'Alimentos avulsos');
    const name=ceName||fallbackName;
    Object.assign(c,{date:ceDate,day:DAYS[new Date(ceDate+'T12:00:00').getDay()],meal:ceMeal,time:c.time||'',type:typeValue,referenceId:ceType==='opcao'?(ceReference||c.referenceId||''):'',name,quantity:'',unit:'',kcal:total.kcal,proteinG:total.protein,carbsG:total.carbs,fatG:total.fat,fiberG:total.fiber,sugarG:total.sugar,sourcePlanId:'',updatedAt:now});
    let itemObjs=consumptionItemRows().filter(x=>String(x.consumptionId)!==String(cid));
    ceItems.forEach((x,i)=>itemObjs.push({id:`${cid}-${i+1}`,consumptionId:cid,foodId:x.foodId||'',foodName:x.name,quantity:x.quantity,unit:x.unit,kcal:x.kcal,proteinG:x.protein,carbsG:x.carbs,fatG:x.fat,fiberG:x.fiber,sugarG:x.sugar,origin:ceType==='opcao'?'opcao_ajustada':'adicionado',createdAt:now}));
    await saveSheet(FILES.nutrition,'Consumos',toRows(cons,consHeaders));
    await saveSheet(FILES.nutrition,'Consumo_Itens',toRows(itemObjs,itemHeaders));
    state.modal=null;render();toast(ceEditingId?'Consumo atualizado':'Consumo registrado');
  }

  function openConsumptionEditor({id='',date='',meal=''}){
    ceEditingId=id||'';ceDate=date||today();ceMeal=meal||mealNames()[0]||'';ceItems=[];ceType='opcao';ceReference='';ceName='';ceNameTouched=false;
    const existing=ceEditingId?consumptionRows().find(x=>String(x.id)===String(ceEditingId)):null;
    if(existing){ceDate=String(existing.date||ceDate);ceMeal=String(existing.meal||ceMeal);ceType=String(existing.type||'').includes('avuls')?'avulsos':'opcao';ceReference=String(existing.referenceId||'');ceName=String(existing.name||existing.referenceId||'');ceNameTouched=true;ceItems=consumptionItemRows().filter(x=>String(x.consumptionId)===String(existing.id)).map(x=>({foodId:x.foodId||'',name:x.foodName||'',quantity:num(x.quantity),unit:x.unit||'g',origin:x.origin||'editado'}));}
    const title=existing?'Editar consumo':'Registrar consumo';
    state.modal=`<div class="modalhead"><div><h3>${title}</h3><div class="muted">${brDate(ceDate)} • ${esc(ceMeal)}</div></div><button class="x" data-close>×</button></div>
      <div class="grid2"><div class="field"><label>Data</label><input id="ceDate" type="date" value="${esc(ceDate)}"></div><div class="field"><label>Refeição</label><select id="ceMeal">${mealNames().map(m=>`<option ${m===ceMeal?'selected':''}>${esc(m)}</option>`).join('')}</select></div></div>
      <div class="field"><label>Tipo</label><select id="ceType"><option value="opcao" ${ceType==='opcao'?'selected':''}>Opção de refeição</option><option value="avulsos" ${ceType==='avulsos'?'selected':''}>Alimentos avulsos</option></select></div>
      <div id="ceOptionWrap" class="field"><label>Opção</label><select id="ceRef"></select></div>
      <div class="field"><label>Nome do consumo</label><input id="ceName" type="text" maxlength="120" value="${esc(ceName)}" placeholder="Ex.: Lanche proteico, Cuscuz ajustado..."><div class="muted" style="margin-top:5px">Você pode escolher um nome para alimentos avulsos ou renomear uma opção ajustada.</div></div>
      <div class="sectiontitle dc-editor-title"><div><h3>Alimentos consumidos</h3><span class="muted">Edite os itens e salve o mesmo consumo.</span></div></div>
      <div class="dc-food-head"><span>#</span><span>Alimento</span><span>Quantidade</span><span>Unidade</span><span></span></div><div id="ceEditorLines"></div>
      <button type="button" class="btn" id="ceAddFood">+ Adicionar alimento</button><div id="cePreview" class="summary" style="margin-top:12px"></div>
      <div class="actions" style="margin-top:14px"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="ceSave">${existing?'Salvar alterações':'Registrar consumo'}</button></div>`;
    render();
    setTimeout(()=>{
      document.getElementById('ceDate')?.addEventListener('change',e=>{ceDate=e.target.value||ceDate});
      document.getElementById('ceMeal')?.addEventListener('change',e=>{ceMeal=e.target.value;if(document.getElementById('ceType')?.value==='opcao'){ceReference='';if(!ceEditingId)ceItems=[];ceLoadType();}});
      document.getElementById('ceType')?.addEventListener('change',()=>{if(!ceEditingId)ceItems=[];ceReference='';ceNameTouched=false;ceLoadType();});
      document.getElementById('ceName')?.addEventListener('input',e=>{ceName=e.target.value||'';ceNameTouched=true;});
      document.getElementById('ceRef')?.addEventListener('change',e=>{ceReference=e.target.value||'';if(ceReference){ceItems=ceNormalizeOption(ceReference);if(!ceNameTouched){ceName=ceReference;const ni=document.getElementById('ceName');if(ni)ni.value=ceName;}ceDraw();}});
      document.getElementById('ceAddFood')?.addEventListener('click',()=>{const it=ceNewItem();if(it){ceItems.push(it);ceDraw();}});
      document.getElementById('ceSave')?.addEventListener('click',cePersist);
      ceLoadType();
      if(existing){const ref=document.getElementById('ceRef');if(ref&&ceType==='opcao'){ref.value=ceReference;}ceDraw();}
    },0);
  }

  function ceConsumptionCard(c){
    const items=consumptionItemRows().filter(x=>String(x.consumptionId)===String(c.id));
    const detail=items.map(i=>`${esc(i.foodName||'Item')} ${fmt(i.quantity)} ${esc(i.unit||'')}`).join(' • ');
    return `<button type="button" class="consumed-item consumption-click" data-edit-consumption="${esc(c.id)}" title="Clique para editar"><div><strong>${esc(c.name||c.referenceId||'Consumo')}</strong><small>${detail||esc(c.type||'Registrado')}</small></div><div><strong>${fmt(c.kcal)} kcal</strong><small>${fmt(c.proteinG)} g proteína</small></div></button>`;
  }

  nutToday=function(){
    const date=today(),cs=consumptionsForDate(date);let html=nutritionDashboard();
    html+=`<div class="sectiontitle"><div><h3>Consumido hoje</h3><span class="muted">${brDate(date)} • clique na refeição para preencher ou editar</span></div><button class="btn orange" id="directConsume">+ Registrar consumo</button></div>`;
    html+=`<div class="card dayplan todayplan">${mealNames().map(meal=>{const rr=cs.filter(x=>String(x.meal||'')===meal);const tot=rr.reduce((a,x)=>{a.kcal+=num(x.kcal);return a},{kcal:0});return `<div class="mealrow ${rr.length?'consumed-row':'mealrow-click'}" ${rr.length?'':`data-new-consumption="${esc(date)}|${esc(meal)}"`}><div><strong>${esc(meal)}</strong><div class="muted">${rr.length?`${rr.length} registro(s)`:'Ainda não registrado • clique para preencher'}</div></div><div>${rr.length?rr.map(ceConsumptionCard).join(''):'<span class="muted">Nenhum consumo registrado nesta refeição.</span>'}</div><div class="mealactions">${rr.length?`<span class="statuspill done">${fmt(tot.kcal)} kcal</span>`:'<button class="btn orange" data-new-consumption="'+esc(date)+'|'+esc(meal)+'">+ Preencher</button>'}</div></div>`}).join('')}</div>`;
    return html;
  };

  nutWeek=function(){
    const dates=weekDates(state.nutWeekOffset||0),all=consumptionRows();let html=nutritionDashboard();
    html+=`<div class="sectiontitle"><div><h3>Consumidos da semana</h3><span class="muted">Clique em um consumo para editar ou em uma célula vazia para preencher.</span></div><div><button class="btn" id="prevNutWeek">← Semana anterior</button><button class="btn" id="nextNutWeek">Próxima semana →</button></div></div>`;
    html+=`<div class="tablewrap"><table class="table week"><thead><tr><th>Refeição</th>${dates.map((d,i)=>`<th>${DAYS[i]}<br><small>${brDate(d)}</small></th>`).join('')}</tr></thead><tbody>`;
    for(const meal of mealNames()){
      html+=`<tr><th>${esc(meal)}</th>`;
      for(const date of dates){const rr=all.filter(x=>String(x.date||'')===String(date)&&String(x.meal||'')===meal);const kcal=rr.reduce((s,x)=>s+num(x.kcal),0);html+=`<td class="cell ${rr.length?'consumed-cell':'week-empty-click'}" ${rr.length?'':`data-new-consumption="${esc(date)}|${esc(meal)}"`}>${rr.length?rr.map(c=>`<button class="week-consumption-link" type="button" data-edit-consumption="${esc(c.id)}">${esc(c.name||'Consumo')}</button>`).join('')+`<br><span class="muted">${fmt(kcal)} kcal</span>`:'<button type="button" class="week-empty-button" data-new-consumption="'+esc(date)+'|'+esc(meal)+'">+ preencher</button>'}</td>`;}
      html+='</tr>';
    }
    html+='</tbody></table></div>';
    const weekTotals=dates.map(d=>({date:d,...nutritionTotalsForDate(d)}));html+=`<div class="sectiontitle"><h3>Resumo da semana</h3></div><div class="grid">${weekTotals.map((x,i)=>card(`${DAYS[i]} • ${brDate(x.date)}`,`${fmt(x.kcal)} kcal`,`${fmt(x.protein)} g proteína`)).join('')}</div>`;return html;
  };

  directConsumeModal=function(){openConsumptionEditor({date:today(),meal:mealNames()[0]||''});};

  const prevBind=bind;
  bind=function(){
    prevBind();
    document.querySelectorAll('[data-edit-consumption]').forEach(el=>el.onclick=e=>{e.stopPropagation();openConsumptionEditor({id:el.dataset.editConsumption});});
    document.querySelectorAll('[data-new-consumption]').forEach(el=>el.onclick=e=>{e.stopPropagation();const raw=el.dataset.newConsumption||'';const cut=raw.indexOf('|');const date=cut>=0?raw.slice(0,cut):today();const meal=cut>=0?raw.slice(cut+1):mealNames()[0];openConsumptionEditor({date,meal});});
  };
})();

    ctl.components.push("nutrition_click_edit_v1015.js");
    (()=>{
      'use strict';
      const VERSION='11.5.0';
      function n(v){const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0}
      function low(v){return String(v??'').trim().toLowerCase()}
      function activeFoods(){try{return (typeof foodRows==='function'?foodRows():objRows(FILES.nutrition,'Alimentos')).filter(f=>low(f.archived||'não')!=='sim')}catch(e){return []}}
      function activePlan(){try{return objRows(FILES.nutrition,'Plano_Nutricionista').filter(x=>low(x.ativo||'sim')!=='não')}catch(e){return []}}
      function goals(){try{return (typeof goalsRows==='function'?goalsRows():objRows(FILES.nutrition,'Metas'))[0]||{}}catch(e){return {}}}
      async function reconcile(){
        try{
          if(typeof window.AF_NUTRICAO_MIGRATE_1141==='function') await window.AF_NUTRICAO_MIGRATE_1141();
          if(activeFoods().length && typeof render==='function') render();
        }catch(e){console.warn('[AF+ Nutrição 11.5.0] reconciliação:',e)}
      }
      [0,500,1500,3000,6000].forEach(ms=>setTimeout(reconcile,ms));
      window.addEventListener('afplus:modules-ready',()=>setTimeout(reconcile,150));
      async function syncOfficialPlan(){
        try{
          const hdr=(rows(FILES.nutrition,'Plano_Nutricionista')[0]||[]).map(String);
          if(!hdr.length)return;
          let plan=objRows(FILES.nutrition,'Plano_Nutricionista');
          if(!plan.length)return;
          const before=JSON.stringify(plan);
          plan=plan.filter(x=>!['planitem-opt-042-avela','planitem-opt-042-cookies'].includes(String(x.id||'')));
          for(const x of plan){
            if(String(x.id)==='planitem-opt-042-chocolate'){
              x.itemOrdem=2;x.textoOriginal='1 Wafer Timbers Zero Chocolate (27g)';x.alimentoPadronizado='Timber’s Wafer Chocolate';x.quantidade=27;x.unidade='g';
            }
            if(String(x.id)==='planitem-opt-043'){
              x.itemOrdem=3;x.textoOriginal='200g Iogurte Batavo Pense Zero';x.quantidade=200;x.unidade='g';
            }
          }
          if(JSON.stringify(plan)!==before) await saveSheet(FILES.nutrition,'Plano_Nutricionista',toRows(plan,hdr));
        }catch(e){console.warn('[AF+ Nutrição 11.5.0] plano oficial:',e)}
      }
      [700,1800,3500].forEach(ms=>setTimeout(syncOfficialPlan,ms));
      function selfTest(){
        const results=[];const add=(name,ok,detail='')=>results.push({name,ok:!!ok,detail});
        try{
          const foods=activeFoods(),ids=foods.map(x=>String(x.id||'')).filter(Boolean),plan=activePlan(),g=goals();
          add('Catálogo ativo disponível',foods.length>=165,`alimentos=${foods.length}`);
          add('IDs de alimentos sem duplicidade',new Set(ids).size===ids.length,`ids=${ids.length}`);
          add('Plano oficial carregado',plan.length>=68,`itens=${plan.length}`);
          add('Meta energética do plano',n(g.kcalGoal)===2250,String(g.kcalGoal||''));
          add('Meta de proteína do plano',n(g.proteinGGoal)===180,String(g.proteinGGoal||''));
          add('Meta de carboidratos do plano',n(g.carbsGGoal)===225,String(g.carbsGGoal||''));
          add('Meta de lipídeos do plano',n(g.fatGGoal)===70,String(g.fatGGoal||''));
          add('Água acompanha teto de 3,0 L',n(g.waterMl)===3000,String(g.waterMl||''));
          add('Consumos preservados',typeof consumptionRows==='function',typeof consumptionRows==='function'?`registros=${consumptionRows().length}`:'função ausente');
        }catch(err){add('Execução da homologação',false,String(err&&err.message||err))}
        return {version:VERSION,ok:results.every(x=>x.ok),passed:results.filter(x=>x.ok).length,total:results.length,results};
      }
      window.AFPLUS_NUTRITION_HOMOLOGATION_1150={version:VERSION,selfTest,reconcile};
    })();
  }
})();
