  const seed = require('./seed-data.json');

const GAS_URL = process.env.AFPLUS_APPS_SCRIPT_URL || '';

function gasUrl(action, params={}){
  if(!GAS_URL) throw new Error('AFPLUS_APPS_SCRIPT_URL não configurada no Netlify');
  const u = new URL(GAS_URL);
  u.searchParams.set('action', action);
  Object.entries(params).forEach(([k,v])=>{
    if(v !== undefined && v !== null && v !== '') u.searchParams.set(k, String(v));
  });
  return u.toString();
}

async function gasGet(action, params={}){
  const r = await fetch(gasUrl(action, params), {method:'GET', redirect:'follow'});
  const txt = await r.text();
  if(!r.ok) throw new Error(`Apps Script HTTP ${r.status}: ${txt.slice(0,240)}`);
  try{return JSON.parse(txt)}catch(_){throw new Error('Resposta inválida do Apps Script: '+txt.slice(0,300))}
}

async function gasPost(body){
  if(!GAS_URL) throw new Error('AFPLUS_APPS_SCRIPT_URL não configurada no Netlify');
  const r=await fetch(GAS_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),redirect:'follow'});
  const txt=await r.text();
  if(!r.ok) throw new Error(`Apps Script HTTP ${r.status}: ${txt.slice(0,240)}`);
  try{return JSON.parse(txt)}catch(_){throw new Error('Resposta inválida do Apps Script: '+txt.slice(0,300))}
}

exports.handler=async(event)=>{
  const endpoint=(event.path.split('/').filter(Boolean).pop()||'health').toLowerCase();
  try{
    if(endpoint==='health'){
      const j=await gasGet('health');
      return json(200,j);
    }

    if(endpoint==='books'){
      // IMPORTANTE: apenas UMA chamada ao Apps Script.
      // A versão anterior fazia health + books em sequência e podia ultrapassar
      // o limite de tempo da Function, gerando 504 mesmo com o Apps Script OK.
      const j=await gasGet('books');
      if(!j || j.ok!==true) return json(502,j||{ok:false,error:'Resposta vazia do Apps Script'});
      return json(200,j.books||{});
    }

    if(endpoint==='save-sheet'){
      const b=JSON.parse(event.body||'{}');
      const j=await gasPost({action:'saveSheet',file:b.file,sheet:b.sheet,rows:b.rows});
      return json(j.ok?200:500,j);
    }

    if(endpoint==='backup'){
      const j=await gasPost({action:'backup'});
      return json(j.ok?200:500,j);
    }

    if(endpoint==='setup'){
      const j=await gasPost({action:'setup',seed});
      return json(j.ok?200:500,j);
    }

    if(endpoint==='reset-from-seed'){
      const j=await gasPost({action:'replaceAll',seed});
      return json(j.ok?200:500,j);
    }

    if(endpoint==='open-data') return json(200,{ok:true,mode:'cloud',message:'Os dados estão no Google Sheets.'});
    return json(404,{ok:false,error:'Endpoint não encontrado'});
  }catch(err){
    return json(500,{ok:false,error:String(err&&err.message||err)});
  }
};

function json(statusCode,obj){
  return {
    statusCode,
    headers:{
      'content-type':'application/json; charset=utf-8',
      'cache-control':'no-store'
    },
    body:JSON.stringify(obj)
  };
}
