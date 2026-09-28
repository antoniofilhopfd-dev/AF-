// AF+ SAFE5 — estabilidade de digitação em buscas.
// Regra: campos de busca não podem ser recriados a cada tecla.
(function(){
  function normalize(v){
    return String(v == null ? '' : v).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  }

  function currentFoodRows(){
    try {
      const rows = typeof foodRows === 'function' ? foodRows() : [];
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  function visibleFoodRows(){
    const rows=currentFoodRows();
    if(typeof yes === 'function' && typeof state !== 'undefined' && 'showArchivedFoods' in state){
      return rows.filter(f=>state.showArchivedFoods ? yes(f.archived) : !yes(f.archived));
    }
    return rows;
  }

  function foodCardHTML(f){
    const name=foodName(f);
    const id=foodId(f);
    const category=String(f.category||'');
    const searchText=normalize(`${name} ${f.brand||''} ${category||''}`);
    const archived=(typeof yes === 'function') ? yes(f.archived) : false;
    return `<article class="foodcard ${archived?'archived':''}" data-food-stable-card="1" data-food-search="${esc(searchText)}" data-food-category="${esc(category)}"><div class="foodcardtop"><div><h3>${esc(name)}</h3><span class="muted">${esc([f.brand,f.category].filter(Boolean).join(' • '))}</span></div><div class="row-actions"><button class="btn small" data-edit-food="${esc(id)}">Editar</button>${archived?`<button class="btn small" data-food-restore="${esc(id)}">Restaurar</button>`:`<button class="btn small" data-food-archive="${esc(id)}">Arquivar</button><button class="btn small danger" data-food-delete="${esc(id)}">Excluir</button>`}</div></div><div class="foodportion">Porção base: <strong>${fmt(f.portion)} ${esc(f.unit||'')}</strong></div><div class="foodnutri"><span><strong>${fmt(f.kcal)}</strong> kcal</span><span><strong>${fmt(f.proteinG)}</strong> g proteína</span><span><strong>${fmt(f.carbsG)}</strong> g carbo</span><span><strong>${fmt(f.fatG)}</strong> g gordura</span><span><strong>${fmt(f.fiberG)}</strong> g fibra</span><span><strong>${fmt(f.sugarG)}</strong> g açúcar</span></div></article>`;
  }

  // Sobrescreve somente a tela de Alimentos: renderiza o conjunto atual uma vez.
  // A filtragem depois ocorre no DOM, sem chamar render() a cada tecla.
  window.foodsTab=function(){
    const all=visibleFoodRows();
    const cats=[...new Set(all.map(f=>f.category).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'));
    const countText=`<span class="muted" id="foodStableCount">${all.length} de ${all.length} alimentos ${state.showArchivedFoods?'arquivados':'ativos'}</span>`;
    const cards=all.map(foodCardHTML).join('');
    return `<div class="foodtoolbar"><div><h3>Alimentos</h3>${countText}</div><div class="foodfilters"><input id="foodSearch" placeholder="Buscar alimento" value="${esc(state.foodSearch||'')}" autocomplete="off" spellcheck="false"><select id="foodCategory"><option value="all">Todas as categorias</option>${cats.map(c=>`<option value="${esc(c)}" ${state.foodCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select>${('showArchivedFoods' in state)?`<button class="btn" id="toggleArchivedFoods">${state.showArchivedFoods?'Mostrar ativos':'Mostrar arquivados'}</button>`:''}<button class="btn primary" id="addFoodMaster">+ Adicionar alimento</button></div></div><div class="foodcards" id="foodStableCards">${cards}<div class="card empty" id="foodStableEmpty" style="display:none">Nenhum alimento encontrado.</div></div>`;
  };

  function applyFoodFilter(){
    if(typeof state==='undefined') return;
    const q=normalize(state.foodSearch||'');
    const category=String(state.foodCategory||'all');
    const cards=document.querySelectorAll('[data-food-stable-card="1"]');
    let shown=0;
    cards.forEach(card=>{
      const text=normalize(card.dataset.foodSearch||card.textContent||'');
      const cat=String(card.dataset.foodCategory||'');
      const ok=(!q || text.includes(q)) && (category==='all' || cat===category);
      card.style.display=ok?'':'none';
      if(ok) shown++;
    });
    const count=document.getElementById('foodStableCount');
    if(count){const txt=`${shown} de ${cards.length} alimentos ${state.showArchivedFoods?'arquivados':'ativos'}`;if(count.textContent!==txt)count.textContent=txt;}
    const empty=document.getElementById('foodStableEmpty');
    if(empty) empty.style.display=shown===0?'':'none';
  }

  // CAPTURE: impede o listener legado de receber o input e chamar render().
  document.addEventListener('input',function(e){
    const el=e.target;
    if(!(el instanceof HTMLInputElement) || el.id!=='foodSearch') return;
    e.stopImmediatePropagation();
    state.foodSearch=el.value;
    applyFoodFilter();
  },true);

  document.addEventListener('change',function(e){
    const el=e.target;
    if(!(el instanceof HTMLSelectElement) || el.id!=='foodCategory') return;
    e.stopImmediatePropagation();
    state.foodCategory=el.value;
    applyFoodFilter();
  },true);

  // Após qualquer render normal (troca de aba, edição etc.), reaplica o filtro sem tocar no cursor.
  const observer=new MutationObserver(function(){
    if(document.getElementById('foodSearch')) applyFoodFilter();
  });
  document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true}));

  window.AFPlusInputStability={version:'12.0.4-safe5',applyFoodFilter};
  console.info('AF+ SAFE5: busca de Alimentos em modo estável (sem rerender por tecla).');
})();
