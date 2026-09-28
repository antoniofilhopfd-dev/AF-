const AFPLUS_DB_PROP='AFPLUS_DB_ID';
const AFPLUS_BACKUP_FOLDER_PROP='AFPLUS_BACKUP_FOLDER_ID';
const META_SHEET='_AFPLUS_META';
const AFPLUS_LAST_SAFETY_BACKUP='AFPLUS_LAST_SAFETY_BACKUP';

function doGet(e){
  const action=(e&&e.parameter&&e.parameter.action)||'health';
  return jsonOut(route_(action, e&&e.parameter||{}, null));
}
function doPost(e){
  let body={};
  try{ body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}'); }catch(err){ return jsonOut({ok:false,error:'JSON inválido: '+err.message}); }
  return jsonOut(route_(body.action||'health', body, body.payload||null));
}
function jsonOut(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function route_(action, req, payload){
  try{
    if(action==='health') return health_();
    if(action==='setup') return setup_(req.seed||payload||{});
    if(action==='books') return {ok:true,books:readBooks_()};
    if(action==='saveSheet') return saveSheet_(req.file,req.sheet,req.rows||[]);
    if(action==='backup') return backup_();
    if(action==='replaceAll') return setup_(req.seed||payload||{}, true);
    return {ok:false,error:'Ação desconhecida: '+action};
  }catch(err){ return {ok:false,error:String(err&&err.message||err),stack:String(err&&err.stack||'')}; }
}

function getDb_(create){
  const props=PropertiesService.getScriptProperties();
  let id=props.getProperty(AFPLUS_DB_PROP);
  if(id){ try{return SpreadsheetApp.openById(id);}catch(_){ id=''; } }
  if(!create) return null;
  const ss=SpreadsheetApp.create('AF+ — Banco de Dados');
  props.setProperty(AFPLUS_DB_PROP, ss.getId());
  const first=ss.getSheets()[0]; first.setName(META_SHEET);
  first.getRange(1,1,1,4).setValues([['file','sheet','tab','updatedAt']]);
  first.hideSheet();
  return ss;
}

function tabName_(file,sheet){
  const base=String(file||'').replace(/^AF_PLUS_/,'').replace(/\.xlsx$/i,'');
  let n=(base+'__'+String(sheet||'')).replace(/[\\\/\?\*\[\]:]/g,'_');
  if(n.length>95)n=n.slice(0,95);
  return n||'Dados';
}
function metaRows_(ss){
  const sh=ss.getSheetByName(META_SHEET); if(!sh)return [];
  const vals=sh.getDataRange().getValues();
  return vals.slice(1).filter(r=>r[0]&&r[1]&&r[2]);
}
function findTab_(ss,file,sheet){
  const row=metaRows_(ss).find(r=>String(r[0])===String(file)&&String(r[1])===String(sheet));
  return row?ss.getSheetByName(String(row[2])):null;
}
function ensureMeta_(ss,file,sheet,tab){
  const meta=ss.getSheetByName(META_SHEET);
  const rows=metaRows_(ss); const idx=rows.findIndex(r=>String(r[0])===String(file)&&String(r[1])===String(sheet));
  const now=new Date();
  if(idx>=0) meta.getRange(idx+2,1,1,4).setValues([[file,sheet,tab,now]]);
  else meta.appendRow([file,sheet,tab,now]);
}

function setup_(seed, replace){
  const ss=getDb_(true);
  if(replace){
    ss.getSheets().filter(s=>s.getName()!==META_SHEET).forEach(s=>ss.deleteSheet(s));
    const meta=ss.getSheetByName(META_SHEET); if(meta.getLastRow()>1)meta.getRange(2,1,meta.getLastRow()-1,4).clearContent();
  }
  const books=seed&&typeof seed==='object'?seed:{}; let created=0, rowsCount=0;
  Object.keys(books).forEach(file=>{
    const sheets=books[file]||{};
    Object.keys(sheets).forEach(sheet=>{
      const rows=Array.isArray(sheets[sheet])?sheets[sheet]:[];
      let tab=findTab_(ss,file,sheet);
      if(!tab){ let n=tabName_(file,sheet), suffix=2; while(ss.getSheetByName(n))n=tabName_(file,sheet).slice(0,90)+'_'+suffix++; tab=ss.insertSheet(n); created++; }
      tab.clearContents();
      if(rows.length){ const cols=Math.max(1,...rows.map(r=>Array.isArray(r)?r.length:1)); const norm=rows.map(r=>{const a=(Array.isArray(r)?r.slice():[r]).map(v=>v==null?'':v); while(a.length<cols)a.push(''); return a;}); tab.getRange(1,1,norm.length,cols).setValues(norm); rowsCount+=Math.max(0,norm.length-1); }
      ensureMeta_(ss,file,sheet,tab.getName());
    });
  });
  SpreadsheetApp.flush();
  ensureDailyBackupTrigger_();
  return {ok:true,spreadsheetId:ss.getId(),spreadsheetUrl:ss.getUrl(),createdSheets:created,records:rowsCount};
}

function readBooks_(){
  const ss=getDb_(false); if(!ss)return {};
  const out={};
  metaRows_(ss).forEach(r=>{
    const file=String(r[0]), sheet=String(r[1]), tab=ss.getSheetByName(String(r[2])); if(!tab)return;
    const vals=tab.getDataRange().getValues();
    out[file]=out[file]||{}; out[file][sheet]=vals;
  });
  return out;
}

function saveSheet_(file,sheet,rows){
  if(!file||!sheet)throw new Error('file e sheet são obrigatórios');
  safetyBackupIfNeeded_();
  const ss=getDb_(true); let tab=findTab_(ss,file,sheet);
  if(!tab){tab=ss.insertSheet(tabName_(file,sheet)); ensureMeta_(ss,file,sheet,tab.getName());}
  tab.clearContents();
  const arr=Array.isArray(rows)?rows:[];
  if(arr.length){ const cols=Math.max(1,...arr.map(r=>Array.isArray(r)?r.length:1)); const norm=arr.map(r=>{const a=(Array.isArray(r)?r.slice():[r]).map(v=>v==null?'':v); while(a.length<cols)a.push(''); return a;}); tab.getRange(1,1,norm.length,cols).setValues(norm); }
  ensureMeta_(ss,file,sheet,tab.getName()); SpreadsheetApp.flush();
  return {ok:true,file:file,sheet:sheet,rows:Math.max(0,arr.length-1),savedAt:new Date().toISOString()};
}

function backup_(){
  const ss=getDb_(false); if(!ss)return {ok:false,error:'Banco ainda não criado'};
  const props=PropertiesService.getScriptProperties(); let folderId=props.getProperty(AFPLUS_BACKUP_FOLDER_PROP); let folder;
  try{folder=folderId?DriveApp.getFolderById(folderId):null;}catch(_){folder=null;}
  if(!folder){folder=DriveApp.createFolder('AF+ Backups'); props.setProperty(AFPLUS_BACKUP_FOLDER_PROP,folder.getId());}
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Fortaleza','yyyy-MM-dd_HH-mm-ss');
  const copy=DriveApp.getFileById(ss.getId()).makeCopy('AF+ Backup '+stamp,folder);
  return {ok:true,files:1,backupId:copy.getId(),backupName:copy.getName()};
}
function health_(){
  const ss=getDb_(false);
  return {ok:true,version:'13.1.0',mode:'google-sheets',initialized:!!ss,spreadsheetId:ss?ss.getId():'',spreadsheetUrl:ss?ss.getUrl():'',time:new Date().toISOString()};
}


function ensureDailyBackupTrigger_(){
  const exists=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='dailyBackup');
  if(!exists) ScriptApp.newTrigger('dailyBackup').timeBased().everyDays(1).atHour(3).create();
}
function dailyBackup(){ try{return backup_();}catch(err){console.error(err);} }


function safetyBackupIfNeeded_(){
  const props=PropertiesService.getScriptProperties();
  const last=Number(props.getProperty(AFPLUS_LAST_SAFETY_BACKUP)||0);
  const now=Date.now();
  if(now-last < 30*60*1000) return;
  try{ backup_(); props.setProperty(AFPLUS_LAST_SAFETY_BACKUP,String(now)); }catch(err){ console.warn('Backup de segurança não criado:',err); }
}
