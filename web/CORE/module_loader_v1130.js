// AF+ 11.2.4 — carregador modular por manifest.json
// Mantém a ordem de execução da 11.2.2, mas remove do index.html referências diretas aos módulos.
const AF_VERSION = '11.6.0';
const PHASES = ['after_final_patch','after_finalization','after_final_stable','after_af_plus'];

const CORE_PIPELINE = [
  ['CORE/app.js', null],
  ['CORE/enhancements.js', null],
  ['CORE/final_patch.js', 'after_final_patch'],
  ['CORE/finalization_v8.js', 'after_finalization'],
  ['CORE/modules_v820.js', null],
  ['CORE/final_stable_v900.js', 'after_final_stable'],
  ['CORE/af_plus_v1000.js', 'after_af_plus']
];

function cacheTag(version){
  return encodeURIComponent(String(version || AF_VERSION));
}

async function fetchJson(path){
  const sep = path.includes('?') ? '&' : '?';
  const res = await fetch(`${path}${sep}_=${Date.now()}`, {cache:'no-store'});
  if(!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${path}`);
  return res.json();
}

function loadClassicScript(src, version, phase=''){
  return new Promise((resolve,reject)=>{
    const s=document.createElement('script');
    s.src=`${src}${src.includes('?')?'&':'?'}mv=${cacheTag(version)}${phase?`&af_phase=${encodeURIComponent(phase)}`:''}`;
    s.async=false;
    s.dataset.afModuleLoader='11.6.0';
    s.onload=()=>resolve(src);
    s.onerror=()=>reject(new Error(`Falha ao carregar script: ${src}`));
    document.head.appendChild(s);
  });
}

function normalizeScript(folder, script){
  if(!script) return null;
  const raw=String(script).replace(/^\.\//,'');
  if(raw.startsWith('APPS/') || raw.startsWith('CORE/')) return raw;
  return `APPS/${folder}/${raw}`;
}

async function loadModuleManifests(){
  const registry=await fetchJson('APPS/manifest.json');
  const modules=[];
  for(const folder of (registry.modules || [])){
    try{
      const manifest=await fetchJson(`APPS/${folder}/manifest.json`);
      manifest.__folder=folder;
      modules.push(manifest);
    }catch(err){
      console.warn(`[AF+ loader] Módulo ${folder} não carregado:`, err);
    }
  }
  return {registry, modules};
}

async function runPhase(phase, modules){
  const ordered=[...modules].sort((a,b)=>{
    const ao=Number(a.runtime_order && a.runtime_order[phase]);
    const bo=Number(b.runtime_order && b.runtime_order[phase]);
    const av=Number.isFinite(ao)?ao:1000;
    const bv=Number.isFinite(bo)?bo:1000;
    return av-bv;
  });
  for(const m of ordered){
    const list=(m.runtime_phases && m.runtime_phases[phase]) || [];
    for(const script of list){
      const src=normalizeScript(m.__folder, script);
      if(src) await loadClassicScript(src, m.versao_base || AF_VERSION, phase);
    }
  }
}

function exposeStatus(status){
  window.AF_PLUS_MODULE_LOADER={
    version:AF_VERSION,
    ...status
  };
  window.dispatchEvent(new CustomEvent('afplus:modules-ready',{detail:window.AF_PLUS_MODULE_LOADER}));
}

async function bootstrap(){
  const started=performance.now();
  const {registry,modules}=await loadModuleManifests();
  const moduleIds=modules.map(m=>m.id || m.__folder);

  for(const [coreScript,phaseAfter] of CORE_PIPELINE){
    await loadClassicScript(coreScript, AF_VERSION);
    if(phaseAfter) await runPhase(phaseAfter,modules);
  }

  const elapsed=Math.round(performance.now()-started);
  exposeStatus({ok:true,registry,moduleIds,modules,elapsedMs:elapsed});
  console.info(`[AF+ ${AF_VERSION}] módulos carregados por manifest: ${moduleIds.join(', ')} (${elapsed} ms)`);
}

try{
  await bootstrap();
}catch(err){
  console.error('[AF+ loader] Falha crítica no carregamento modular:',err);
  exposeStatus({ok:false,error:String(err && err.message || err),moduleIds:[],modules:[]});
  const boot=document.querySelector('.boot p');
  if(boot) boot.textContent='Erro ao carregar módulos. Consulte o diagnóstico.';
}
