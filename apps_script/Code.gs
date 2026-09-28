const AFPLUS_ROOT_FOLDER_PROP='AFPLUS_ROOT_FOLDER_ID';
const AFPLUS_DB_PROP='AFPLUS_DB_ID';
const AFPLUS_BACKUP_FOLDER_PROP='AFPLUS_BACKUP_FOLDER_ID';
const AFPLUS_IMPORT_FOLDER_PROP='AFPLUS_IMPORT_FOLDER_ID';
const IMPORT_LOG_SHEET='_AFPLUS_IMPORT_LOG';
const META_SHEET='_AFPLUS_META';
const HOME_SHEET='INICIO';
const AFPLUS_LAST_SAFETY_BACKUP='AFPLUS_LAST_SAFETY_BACKUP';
const AFPLUS_MODULE_DBS_PROP='AFPLUS_MODULE_DBS_V2';
const AFPLUS_ARCH_VERSION='13.2.1';
const AFPLUS_MODULE_NAMES={
  'AF_PLUS_NUTRICAO.xlsx':'AF+ — Nutrição',
  'AF_PLUS_CORPO.xlsx':'AF+ — Corpo',
  'AF_PLUS_TREINOS.xlsx':'AF+ — Treinos',
  'AF_PLUS_LEITURA.xlsx':'AF+ — Leitura',
  'AF_PLUS_AGENDA.xlsx':'AF+ — Agenda',
  'AF_PLUS_MIDIA.xlsx':'AF+ — Mídia',
  'AF_PLUS_VIAGENS.xlsx':'AF+ — Viagens',
  'AF_PLUS_INTEGRACOES.xlsx':'AF+ — Integrações',
  'AF_PLUS_CONFIG.xlsx':'AF+ — Configuração'
};

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
    if(action==='books') return {ok:true,books:readBooks_(req.file||'')};
    if(action==='saveSheet') return saveSheet_(req.file,req.sheet,req.rows||[]);
    if(action==='saveBatch') return saveBatch_(req.items||[]);
    if(action==='cleanupUnusedTabs') return {ok:false,disabled:true,error:'Limpeza automática desativada no AF+ 13.2.0 para proteger os dados.'};
    if(action==='migrateModules') return migrarBancoUnicoParaModulosAFPlus();
    if(action==='moduleStatus') return moduleStatus_();
    if(action==='backup') return backup_();
    if(action==='replaceAll') return {ok:false,disabled:true,error:'Reset total desativado no AF+ 13.2.0 para proteger os bancos modulares.'};
    return {ok:false,error:'Ação desconhecida: '+action};
  }catch(err){ return {ok:false,error:String(err&&err.message||err),stack:String(err&&err.stack||'')}; }
}

function getRootFolder_(create){
  const props=PropertiesService.getScriptProperties();
  let id=props.getProperty(AFPLUS_ROOT_FOLDER_PROP);
  if(id){ try{return DriveApp.getFolderById(id);}catch(_){ id=''; } }
  if(!create) return null;
  const it=DriveApp.getFoldersByName('AF+');
  const folder=it.hasNext()?it.next():DriveApp.createFolder('AF+');
  props.setProperty(AFPLUS_ROOT_FOLDER_PROP,folder.getId());
  return folder;
}

function getDb_(create){
  const props=PropertiesService.getScriptProperties();
  let id=props.getProperty(AFPLUS_DB_PROP);
  if(id){ try{return SpreadsheetApp.openById(id);}catch(_){ id=''; } }
  if(!create) return null;
  const root=getRootFolder_(true);
  const ss=SpreadsheetApp.create('AF+ — Banco de Dados');
  try{ DriveApp.getFileById(ss.getId()).moveTo(root); }catch(err){ console.warn('Não foi possível mover o banco para a pasta AF+:',err); }
  props.setProperty(AFPLUS_DB_PROP, ss.getId());
  const first=ss.getSheets()[0];
  first.setName(HOME_SHEET);
  first.getRange('A1').setValue('AF+ — Banco de Dados');
  first.getRange('A2').setValue('Esta aba deve permanecer visível. Os dados do AF+ são organizados nas demais abas.');
  const meta=ss.insertSheet(META_SHEET);
  meta.getRange(1,1,1,4).setValues([['file','sheet','tab','updatedAt']]);
  const log=ss.insertSheet(IMPORT_LOG_SHEET);
  log.getRange(1,1,1,6).setValues([['fileId','fileName','importedAt','sheets','records','status']]);
  log.hideSheet();
  meta.hideSheet();
  return ss;
}



function moduleDbMap_(){
  const raw=PropertiesService.getScriptProperties().getProperty(AFPLUS_MODULE_DBS_PROP)||'{}';
  try{return JSON.parse(raw)||{};}catch(_){return {};}
}
function saveModuleDbMap_(map){ PropertiesService.getScriptProperties().setProperty(AFPLUS_MODULE_DBS_PROP,JSON.stringify(map||{})); }
function getModuleDb_(file,create){
  file=String(file||'').trim();
  if(!file) return null;
  const map=moduleDbMap_();
  const id=map[file];
  if(id){ try{return SpreadsheetApp.openById(id);}catch(_){ delete map[file]; saveModuleDbMap_(map); } }
  if(!create) return null;
  const root=getRootFolder_(true);
  const name=AFPLUS_MODULE_NAMES[file] || ('AF+ — '+file.replace(/^AF_PLUS_/,'').replace(/\.xlsx$/i,''));
  const ss=SpreadsheetApp.create(name);
  try{DriveApp.getFileById(ss.getId()).moveTo(root);}catch(err){console.warn(err);}
  const first=ss.getSheets()[0];
  first.setName(HOME_SHEET);
  first.getRange('A1').setValue(name);
  first.getRange('A2').setValue('Banco separado do módulo AF+. Não excluir abas manualmente.');
  map[file]=ss.getId(); saveModuleDbMap_(map);
  return ss;
}
function moduleStatus_(){
  const map=moduleDbMap_(); const modules={};
  Object.keys(AFPLUS_MODULE_NAMES).forEach(file=>{
    const id=map[file]||''; let ss=null;
    try{if(id)ss=SpreadsheetApp.openById(id);}catch(_){}
    modules[file]={name:AFPLUS_MODULE_NAMES[file],created:!!ss,id:ss?ss.getId():'',url:ss?ss.getUrl():'',sheets:ss?ss.getSheets().filter(x=>x.getName()!==HOME_SHEET).length:0};
  });
  return {ok:true,version:AFPLUS_ARCH_VERSION,architecture:'one-spreadsheet-per-module',modules:modules};
}
function migrarBancoUnicoParaModulosAFPlus(){
  const legacy=getDb_(false);
  if(!legacy) throw new Error('Banco único antigo não encontrado.');
  const backup=backupLegacyOnly_();
  const metas=metaRows_(legacy);
  const copied=[]; const errors=[];
  metas.forEach(r=>{
    const file=String(r[0]||''), sheet=String(r[1]||''), tabName=String(r[2]||'');
    if(!file||!sheet||!tabName) return;
    // AF+ 13.2.1: Nutrição trabalha somente com consumos reais.
    // Planejamento diário foi desativado e não deve ser recriado na arquitetura modular.
    if(file==='AF_PLUS_NUTRICAO.xlsx' && (sheet==='Planejamento' || sheet==='Planejamento_Itens')) return;
    try{
      const src=legacy.getSheetByName(tabName); if(!src) throw new Error('Aba física não encontrada: '+tabName);
      const vals=src.getDataRange().getValues();
      saveSheet_(file,sheet,vals);
      copied.push({file:file,sheet:sheet,rows:Math.max(0,vals.length-1)});
    }catch(err){errors.push({file:file,sheet:sheet,error:String(err&&err.message||err)});}
  });
  SpreadsheetApp.flush();
  return {ok:errors.length===0,version:AFPLUS_ARCH_VERSION,backup:backup,copiedSheets:copied.length,errors:errors,status:moduleStatus_(),note:'O banco único original foi preservado e não foi excluído.'};
}
function backupLegacyOnly_(){
  const ss=getDb_(false); if(!ss)return {ok:false,error:'Banco único não encontrado'};
  const folder=getBackupFolder_();
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Fortaleza','yyyy-MM-dd_HH-mm-ss');
  const copy=DriveApp.getFileById(ss.getId()).makeCopy('AF+ Backup PRE-MIGRACAO '+stamp,folder);
  return {ok:true,backupId:copy.getId(),backupName:copy.getName()};
}
function getBackupFolder_(){
  const props=PropertiesService.getScriptProperties(); let folderId=props.getProperty(AFPLUS_BACKUP_FOLDER_PROP); let folder;
  try{folder=folderId?DriveApp.getFolderById(folderId):null;}catch(_){folder=null;}
  if(!folder){const root=getRootFolder_(true);const it=root.getFoldersByName('Backups');folder=it.hasNext()?it.next():root.createFolder('Backups');props.setProperty(AFPLUS_BACKUP_FOLDER_PROP,folder.getId());}
  return folder;
}

function repairDbStructure_(){
  const ss=getDb_(true);
  let home=ss.getSheetByName(HOME_SHEET);
  let meta=ss.getSheetByName(META_SHEET);
  let importLog=ss.getSheetByName(IMPORT_LOG_SHEET);

  if(!home){
    home=ss.insertSheet(HOME_SHEET,0);
    home.getRange('A1').setValue('AF+ — Banco de Dados');
    home.getRange('A2').setValue('Esta aba deve permanecer visível. Os dados do AF+ são organizados nas demais abas.');
  }

  if(!meta){
    meta=ss.insertSheet(META_SHEET);
    meta.getRange(1,1,1,4).setValues([['file','sheet','tab','updatedAt']]);
  }else if(meta.getLastRow()===0){
    meta.getRange(1,1,1,4).setValues([['file','sheet','tab','updatedAt']]);
  }

  if(!importLog){
    importLog=ss.insertSheet(IMPORT_LOG_SHEET);
    importLog.getRange(1,1,1,6).setValues([['fileId','fileName','importedAt','sheets','records','status']]);
  }else if(importLog.getLastRow()===0){
    importLog.getRange(1,1,1,6).setValues([['fileId','fileName','importedAt','sheets','records','status']]);
  }

  // Sempre deixe ao menos INICIO visível antes de esconder a aba técnica.
  if(home.isSheetHidden()) home.showSheet();
  try{ if(!meta.isSheetHidden()) meta.hideSheet(); }catch(err){ console.warn('Não foi possível ocultar META:',err); }
  try{ if(!importLog.isSheetHidden()) importLog.hideSheet(); }catch(err){ console.warn('Não foi possível ocultar LOG:',err); }
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
  if(replace) throw new Error('Substituição total desativada no AF+ 13.2.0.');
  const books=seed&&typeof seed==='object'?seed:{}; let created=0,rowsCount=0;
  Object.keys(books).forEach(file=>{
    const ss=getModuleDb_(file,true); const sheets=books[file]||{};
    Object.keys(sheets).forEach(sheet=>{
      // Setup modular é não destrutivo: só cria aba ausente. Dados existentes nunca são sobrescritos pelo seed.
      if(ss.getSheetByName(sheet)) return;
      const rows=Array.isArray(sheets[sheet])?sheets[sheet]:[];
      saveSheet_(file,sheet,rows); created++; rowsCount+=Math.max(0,rows.length-1);
    });
  });
  ensureDailyBackupTrigger_();
  return {ok:true,version:AFPLUS_ARCH_VERSION,architecture:'one-spreadsheet-per-module',createdSheets:created,records:rowsCount,status:moduleStatus_()};
}


function instalarAFPlus(){
  const root=getRootFolder_(true);
  Object.keys(AFPLUS_MODULE_NAMES).forEach(file=>getModuleDb_(file,true));
  const backup=backup_();
  const importFolder=getImportFolder_(true);
  return {ok:true,version:AFPLUS_ARCH_VERSION,rootFolderId:root.getId(),rootFolderName:root.getName(),backup:backup,importFolderId:importFolder.getId(),importFolderName:importFolder.getName(),status:moduleStatus_()};
}

function readBooks_(fileFilter){
  const wanted=String(fileFilter||'').trim();
  if(!wanted) return {};
  const ss=getModuleDb_(wanted,false);
  if(!ss) return {};
  const tabs=ss.getSheets().filter(sh=>sh.getName()!==HOME_SHEET);
  if(!tabs.length) return {[wanted]:{}};
  const ranges=tabs.map(sh=>"'"+sh.getName().replace(/'/g,"''")+"'");
  const batch=Sheets.Spreadsheets.Values.batchGet(ss.getId(),{ranges:ranges,majorDimension:'ROWS',valueRenderOption:'UNFORMATTED_VALUE',dateTimeRenderOption:'FORMATTED_STRING'});
  const vr=(batch&&batch.valueRanges)||[]; const out={[wanted]:{}};
  tabs.forEach((sh,i)=>{out[wanted][sh.getName()]=(vr[i]&&vr[i].values)||[];});
  return out;
}

function saveSheet_(file,sheet,rows){
  if(!file||!sheet)throw new Error('file e sheet são obrigatórios');
  const ss=getModuleDb_(file,true);

  // AF+ 13.2.0: grava diretamente no banco separado do módulo.
  // AF+ 13.1.5: caminho rápido de gravação.
  // Não cria backup síncrono antes de cada POST; isso fazia a Netlify Function estourar em 504.
  // Os backups diário/manual continuam disponíveis e o frontend dispara backup fora do caminho crítico.
  const expected=String(sheet).replace(/[\\/\?\*\[\]:]/g,'_').slice(0,95)||'Dados';
  let tab=ss.getSheetByName(expected);
  let created=false;
  if(!tab){
    tab=ss.insertSheet(expected);
    created=true;
  }

  const arr=Array.isArray(rows)?rows:[];
  const cols=arr.length?Math.max(1,...arr.map(r=>Array.isArray(r)?r.length:1)):1;
  const norm=arr.map(r=>{
    const a=(Array.isArray(r)?r.slice():[r]).map(v=>v==null?'':v);
    while(a.length<cols)a.push('');
    return a;
  });

  const title=String(tab.getName()).replace(/'/g,"''");
  const rangeAll=`'${title}'`;
  Sheets.Spreadsheets.Values.clear({},ss.getId(),rangeAll);
  if(norm.length){
    Sheets.Spreadsheets.Values.update(
      {values:norm},
      ss.getId(),
      `'${title}'!A1`,
      {valueInputOption:'RAW'}
    );
  }

  // O vínculo META só precisa ser criado quando a aba nasce; evita reler META em cada salvamento.
  // Sem META global: cada arquivo lógico possui seu próprio Google Sheets.
  return {ok:true,file:file,sheet:sheet,rows:Math.max(0,arr.length-1),savedAt:new Date().toISOString(),mode:'fast-values-api'};
}


function saveBatch_(items){
  const list=Array.isArray(items)?items:[];
  if(!list.length) throw new Error('items é obrigatório');
  const lock=LockService.getScriptLock();
  lock.waitLock(15000);
  try{
    const results=[];
    for(const it of list){
      if(!it || !it.file || !it.sheet) throw new Error('file e sheet são obrigatórios em cada item');
      results.push(saveSheet_(it.file,it.sheet,it.rows||[]));
    }
    return {ok:true,count:results.length,results:results,savedAt:new Date().toISOString(),mode:'batch-fast-values-api'};
  }finally{
    lock.releaseLock();
  }
}


// Limpeza conservadora de abas legadas/derivadas que o AF+ 13.1.x não consulta.
// Faz backup antes de excluir e preserva todas as abas operacionais atuais.
function limparAbasDesnecessariasAFPlus(){
  const ss=repairDbStructure_();
  const plano={
    'AF_PLUS_CONFIG.xlsx':['Historico_Versoes','Filtros_Salvos','Dashboard_Layout'],
    'AF_PLUS_CORPO.xlsx':['Bio_Avaliacoes','Bio_Impedancia','Bio_Segmentar'],
    'AF_PLUS_LEITURA.xlsx':['Destaques','Leitura'],
    'AF_PLUS_NUTRICAO.xlsx':['Alimentos_Referencia','Fontes_Alimentos','Lista_Desativada','Migracao_Dados','Planejamento_Consumido','Politica_Calculo','Variantes_Opcoes']
  };
  const backup=backup_();
  const meta=ss.getSheetByName(META_SHEET);
  const rows=metaRows_(ss);
  const removidos=[];
  const ausentes=[];

  Object.keys(plano).forEach(file=>{
    plano[file].forEach(sheet=>{
      const row=rows.find(r=>String(r[0])===file && String(r[1])===sheet);
      const tab=row ? ss.getSheetByName(String(row[2])) : null;
      if(tab && ![HOME_SHEET,META_SHEET,IMPORT_LOG_SHEET].includes(tab.getName())){
        ss.deleteSheet(tab);
        removidos.push({file:file,sheet:sheet,tab:String(row[2])});
      }else{
        ausentes.push({file:file,sheet:sheet});
      }
    });
  });

  // Reescreve META sem referências às abas removidas.
  const excluir=new Set(removidos.map(x=>x.file+'|||'+x.sheet));
  const manter=rows.filter(r=>!excluir.has(String(r[0])+'|||'+String(r[1])));
  if(meta.getLastRow()>1) meta.getRange(2,1,meta.getLastRow()-1,4).clearContent();
  if(manter.length) meta.getRange(2,1,manter.length,4).setValues(manter.map(r=>[r[0],r[1],r[2],r[3]||new Date()]));
  SpreadsheetApp.flush();

  return {
    ok:true,
    version:'13.1.7',
    backup:backup,
    removedCount:removidos.length,
    removed:removidos,
    alreadyMissing:ausentes,
    note:'Limpeza conservadora: apenas abas sem uso no runtime atual foram removidas.'
  };
}

function backup_(){
  const folder=getBackupFolder_();
  const stamp=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'America/Fortaleza','yyyy-MM-dd_HH-mm-ss');
  const files=[]; const map=moduleDbMap_();
  Object.keys(map).forEach(file=>{try{const src=DriveApp.getFileById(map[file]);const cp=src.makeCopy(src.getName()+' Backup '+stamp,folder);files.push({file:file,id:cp.getId(),name:cp.getName()});}catch(err){console.warn(err);}});
  return {ok:true,files:files.length,backups:files};
}

function health_(){
  const map=moduleDbMap_();
  return {ok:true,version:AFPLUS_ARCH_VERSION,mode:'google-sheets-modular',architecture:'one-spreadsheet-per-module',initialized:Object.keys(map).length>0,moduleDatabases:Object.keys(map).length,time:new Date().toISOString()};
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


function getImportFolder_(create){
  const props=PropertiesService.getScriptProperties();
  let id=props.getProperty(AFPLUS_IMPORT_FOLDER_PROP);
  if(id){ try{return DriveApp.getFolderById(id);}catch(_){ id=''; } }
  if(!create) return null;
  const root=getRootFolder_(true);
  const it=root.getFoldersByName('IMPORTAR');
  const folder=it.hasNext()?it.next():root.createFolder('IMPORTAR');
  props.setProperty(AFPLUS_IMPORT_FOLDER_PROP,folder.getId());
  return folder;
}

function prepararImportacaoAFPlus(){
  const ss=repairDbStructure_();
  const folder=getImportFolder_(true);
  return {
    ok:true,
    pasta:'AF+/IMPORTAR',
    folderId:folder.getId(),
    folderUrl:'https://drive.google.com/drive/folders/'+folder.getId(),
    banco:ss.getName(),
    bancoUrl:ss.getUrl()
  };
}

function importLogIds_(){
  const ss=repairDbStructure_();
  const sh=ss.getSheetByName(IMPORT_LOG_SHEET);
  if(!sh || sh.getLastRow()<2) return new Set();
  return new Set(sh.getRange(2,1,sh.getLastRow()-1,1).getValues().flat().filter(Boolean).map(String));
}

function registrarImportacao_(fileId,fileName,sheets,records,status){
  const ss=repairDbStructure_();
  const sh=ss.getSheetByName(IMPORT_LOG_SHEET);
  sh.appendRow([String(fileId||''),String(fileName||''),new Date(),Number(sheets||0),Number(records||0),String(status||'OK')]);
}

function migrarXLSXDaPastaImportar(){
  // Requer o serviço avançado Google Drive ativado em Serviços > Drive API.
  repairDbStructure_();
  const folder=getImportFolder_(true);
  const imported=importLogIds_();
  const files=folder.getFiles();
  const candidatos=[];
  while(files.hasNext()){
    const f=files.next();
    if(/\.xlsx$/i.test(f.getName()) && /^AF_PLUS_/i.test(f.getName())) candidatos.push(f);
  }
  if(!candidatos.length) return {ok:false,error:'Nenhum AF_PLUS_*.xlsx encontrado em AF+/IMPORTAR'};

  const backup=backup_();
  const resumo=[];
  let totalSheets=0,totalRecords=0,skipped=0;

  candidatos.forEach(file=>{
    const fileId=String(file.getId());
    const fileName=file.getName();
    if(imported.has(fileId)){
      resumo.push({arquivo:fileName,status:'IGNORADO_JA_IMPORTADO'}); skipped++; return;
    }

    let tempId='';
    try{
      const blob=file.getBlob();
      const created=Drive.Files.create({
        name:'TMP_AFPLUS_'+Date.now()+'_'+fileName.replace(/\.xlsx$/i,''),
        mimeType:'application/vnd.google-apps.spreadsheet'
      }, blob);
      tempId=created.id;
      const temp=SpreadsheetApp.openById(tempId);
      let sheetsCount=0,recordsCount=0;

      temp.getSheets().forEach(sourceSheet=>{
        const rows=sourceSheet.getDataRange().getValues();
        const logicalFile=fileName;
        const logicalSheet=sourceSheet.getName();
        saveSheet_(logicalFile,logicalSheet,rows);
        sheetsCount++;
        recordsCount+=Math.max(0,rows.length-1);
      });

      registrarImportacao_(fileId,fileName,sheetsCount,recordsCount,'OK');
      resumo.push({arquivo:fileName,status:'OK',abas:sheetsCount,registros:recordsCount});
      totalSheets+=sheetsCount; totalRecords+=recordsCount;
    }catch(err){
      registrarImportacao_(fileId,fileName,0,0,'ERRO: '+String(err&&err.message||err));
      resumo.push({arquivo:fileName,status:'ERRO',erro:String(err&&err.message||err)});
    }finally{
      if(tempId){ try{DriveApp.getFileById(tempId).setTrashed(true);}catch(_){} }
    }
  });

  SpreadsheetApp.flush();
  return {ok:true,backup:backup,arquivos:candidatos.length,ignorados:skipped,abas:totalSheets,registros:totalRecords,resumo:resumo};
}
