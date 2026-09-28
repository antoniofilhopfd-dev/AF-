const seed = require('./seed-data.json');

const GAS_URL = process.env.AFPLUS_APPS_SCRIPT_URL || '';
async function gas(body){
  if(!GAS_URL) throw new Error('AFPLUS_APPS_SCRIPT_URL não configurada no Netlify');
  const r=await fetch(GAS_URL,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),redirect:'follow'});
  const txt=await r.text();
  try{return JSON.parse(txt)}catch(_){throw new Error('Resposta inválida do Apps Script: '+txt.slice(0,300))}
}
exports.handler=async(event)=>{
  const endpoint=(event.path.split('/').filter(Boolean).pop()||'health').toLowerCase();
  try{
    if(endpoint==='health'){
      const j=await gas({action:'health'}); return json(200,j);
    }
    if(endpoint==='books'){
      let h=await gas({action:'health'});
      if(!h.initialized) await gas({action:'setup',seed});
      let j=await gas({action:'books'});
      if(j.ok && (!j.books || Object.keys(j.books).length===0)){await gas({action:'setup',seed}); j=await gas({action:'books'});}
      return json(j.ok?200:500,j.ok?j.books:j);
    }
    if(endpoint==='save-sheet'){
      const b=JSON.parse(event.body||'{}'); const j=await gas({action:'saveSheet',file:b.file,sheet:b.sheet,rows:b.rows});
      return json(j.ok?200:500,j);
    }
    if(endpoint==='backup'){
      const j=await gas({action:'backup'}); return json(j.ok?200:500,j);
    }
    if(endpoint==='setup'){
      const j=await gas({action:'setup',seed}); return json(j.ok?200:500,j);
    }
    if(endpoint==='reset-from-seed'){
      const j=await gas({action:'replaceAll',seed}); return json(j.ok?200:500,j);
    }
    if(endpoint==='open-data') return json(200,{ok:true,mode:'cloud',message:'Os dados estão no Google Sheets.'});
    return json(404,{ok:false,error:'Endpoint não encontrado'});
  }catch(err){return json(500,{ok:false,error:String(err&&err.message||err)});}
};
function json(statusCode,obj){return {statusCode,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'},body:JSON.stringify(obj)}}
