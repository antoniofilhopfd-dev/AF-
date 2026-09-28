/* AF+ Treinos v11.3.0 — controlador único homologado por fases.
   Um único arquivo executa as camadas na mesma posição relativa do runtime consolidado.
   A fase é informada pelo module_loader_v1130 via ?af_phase=. */
(function(){
  const src=(document.currentScript&&document.currentScript.src)||"";
  const phase=new URL(src,location.href).searchParams.get("af_phase")||"after_af_plus";
  window.AFPLUS_TRAINING_CONTROLLER_1130=window.AFPLUS_TRAINING_CONTROLLER_1130||{version:"11.3.0",phases:[],components:[],loadedAt:new Date().toISOString()};
  if(!window.AFPLUS_TRAINING_CONTROLLER_1130.phases.includes(phase)) window.AFPLUS_TRAINING_CONTROLLER_1130.phases.push(phase);
  if(phase==="after_final_patch") {
/* AF+ Treinus parser v5.5 — tempo/distância, ritmos legíveis e repetições agrupadas */
(function(){
  function tNum(v){
    const s=String(v??'').trim().replace(/\s/g,'').replace(',','.').replace(/[^0-9.+-]/g,'');
    const n=Number(s); return Number.isFinite(n)?n:0;
  }
  function paceDec(clock){
    const m=String(clock||'').trim().match(/(\d{1,2}):(\d{2})/);
    return m?Number(m[1])+Number(m[2])/60:0;
  }
  function paceClock(v){
    const n=Number(v)||0;if(!n)return '';
    let min=Math.floor(n),sec=Math.round((n-min)*60);
    if(sec===60){min++;sec=0}
    return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  function clockMinutes(v){
    const s=String(v||'').trim().toLowerCase();
    const m=s.match(/(?:(\d+)\s*h)?\s*(\d{1,2})\s*(?:['’]|min)\s*(?:(\d{1,2})\s*(?:["”]|s))?/i);
    if(m)return (Number(m[1]||0)*60)+Number(m[2]||0)+Number(m[3]||0)/60;
    const h=s.match(/^(\d+)\s*h\s*(\d{1,2})(?::(\d{2}))?$/);
    if(h)return Number(h[1])*60+Number(h[2]||0)+Number(h[3]||0)/60;
    return tNum(s);
  }
  function durClock(mins,secondsAlways=false){
    const n=Number(mins)||0;if(!n)return '—';
    const total=Math.round(n*60),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
    if(h)return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if(secondsAlways||s)return `${m}:${String(s).padStart(2,'0')}`;
    return `${m} min`;
  }
  function rangeLabel(a,b,formatter){
    a=Number(a)||0;b=Number(b)||0;
    if(!a&&!b)return '—';if(!b)b=a;if(!a)a=b;
    return Math.abs(a-b)<0.0001?formatter(a):`${formatter(Math.min(a,b))}–${formatter(Math.max(a,b))}`;
  }
  function km(v){return (Math.round((Number(v)||0)*100)/100).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:2})}
  function speed(v){return (Math.round((Number(v)||0)*100)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
  function clone(b){return JSON.parse(JSON.stringify(b||{}))}
  function durationLow(b){return Number(b.plannedDurationMinEstimate||b.plannedDurationMin||0)}
  function durationHigh(b){return Number(b.plannedDurationMaxEstimate||b.plannedDurationMin||0)}

  treinosParseSegment=function(text,ctx={}){
    const raw=String(text||'').trim().replace(/^[-•]\s*/,'');if(!raw)return null;
    const lower=raw.toLowerCase();
    let type='Outro';
    if(/\bcorrer\b/i.test(raw))type='Corrida';
    else if(/\bcaminhar\b/i.test(raw))type='Caminhada';
    else if(/aquecer|aquecimento/i.test(raw))type='Aquecimento';
    else if(/desaquecer|desaquecimento/i.test(raw))type='Desaquecimento';
    else if(/recuper/i.test(raw))type='Recuperação';

    const verb='(?:correr|caminhar|aquecer|aquecimento|desaquecer|desaquecimento|recuperar|recuperação)';
    const fixedTime=raw.match(new RegExp('^'+verb+'\\s+(\\d+(?:[,.]\\d+)?)\\s*(?:[\\\'’]|min(?:uto)?s?)','i'));
    const fixedDistance=raw.match(new RegExp('^'+verb+'\\s+(\\d+(?:[,.]\\d+)?)\\s*km\\b','i'));
    const zone=(raw.match(/\bZ\s*([1-4])\b/i)||[])[1];
    const intensity=(raw.match(/Z\s*[1-4]\s*-\s*([^\(]+?)(?=\s*\(|\s+\d+[,.]?\d*\s*a\s*\d|\s+completar|$)/i)||[])[1];
    const pace=raw.match(/\((\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})\s*\/km\)/i);
    const speedMatch=raw.match(/(\d+(?:[,.]\d+)?)\s*a\s*(\d+(?:[,.]\d+)?)\s*km\/h/i);
    const distRange=raw.match(/completar\s+entre\s+(\d+(?:[,.]\d+)?)\s*e\s*(\d+(?:[,.]\d+)?)\s*km\b/i);
    const distFixed=raw.match(/completar\s+(?!entre)(\d+(?:[,.]\d+)?)\s*km\b/i);
    const durationRange=raw.match(/completar\s+entre\s+((?:\d+\s*h)?\s*\d{1,2}\s*['’]\s*\d{1,2}\s*["”]?)\s*e\s*((?:\d+\s*h)?\s*\d{1,2}\s*['’]\s*\d{1,2}\s*["”]?)/i);

    const p1=pace?paceDec(pace[1]):0,p2=pace?paceDec(pace[2]):0;
    let paceMin=p1&&p2?Math.min(p1,p2):(p1||p2),paceMax=p1&&p2?Math.max(p1,p2):(p1||p2);
    let s1=speedMatch?tNum(speedMatch[1]):0,s2=speedMatch?tNum(speedMatch[2]):0;
    let speedMin=s1&&s2?Math.min(s1,s2):(s1||s2),speedMax=s1&&s2?Math.max(s1,s2):(s1||s2);

    let targetMode=fixedDistance?'distance':'time';
    let fixedMin=fixedTime?tNum(fixedTime[1]):0;
    let targetDistance=fixedDistance?tNum(fixedDistance[1]):0;
    let dmin=0,dmax=0;
    if(targetDistance){dmin=dmax=targetDistance}
    else if(distRange){dmin=tNum(distRange[1]);dmax=tNum(distRange[2])}
    else if(distFixed){dmin=dmax=tNum(distFixed[1])}

    let tmin=0,tmax=0;
    if(durationRange){tmin=clockMinutes(durationRange[1]);tmax=clockMinutes(durationRange[2])}
    else if(fixedMin){tmin=tmax=fixedMin}

    if(type==='Caminhada'&&!paceMin){
      paceMin=10+26/60;paceMax=12.5;speedMin=4.8;speedMax=60/paceMin;
    }
    if(targetMode==='time'&&fixedMin&&!(dmin||dmax)&&paceMin&&paceMax){
      dmin=fixedMin/paceMax;dmax=fixedMin/paceMin;
    }
    if(targetMode==='distance'&&targetDistance&&!(tmin||tmax)&&paceMin&&paceMax){
      tmin=targetDistance*paceMin;tmax=targetDistance*paceMax;
    }
    if(!speedMin&&paceMax)speedMin=60/paceMax;
    if(!speedMax&&paceMin)speedMax=60/paceMin;

    if(tmin&&tmax&&tmin>tmax){const q=tmin;tmin=tmax;tmax=q}
    if(dmin&&dmax&&dmin>dmax){const q=dmin;dmin=dmax;dmax=q}
    const plannedDuration=(tmin&&tmax)?(tmin+tmax)/2:(tmin||tmax||fixedMin);
    const plannedDistance=(dmin&&dmax)?(dmin+dmax)/2:(dmin||dmax||targetDistance);
    const durationLabel=rangeLabel(tmin,tmax,x=>durClock(x,true));
    const notes=[zone?'Z'+zone:'',intensity?intensity.trim():'',paceMin?`Ritmo ${paceClock(paceMin)}–${paceClock(paceMax||paceMin)}/km`:'',speedMin?`Velocidade ${speed(speedMin)}–${speed(speedMax||speedMin)} km/h`:'',targetMode==='distance'&&targetDistance?`Alvo ${km(targetDistance)} km`:'',durationRange?`Tempo estimado ${durationLabel}`:'',ctx.repeatCount?`Repetição ${ctx.repeatIndex}/${ctx.repeatCount}`:''].filter(Boolean).join(' • ');

    return {
      type,plannedDurationMin:plannedDuration,plannedDurationMinEstimate:tmin,plannedDurationMaxEstimate:tmax,
      plannedDistanceKm:plannedDistance,plannedDistanceMinKm:dmin,plannedDistanceMaxKm:dmax,
      plannedPaceMinKm:paceMin,plannedPaceMaxMinKm:paceMax,zone:zone?'Z'+zone:'',intensity:intensity?intensity.trim():'',
      plannedSpeedMinKmh:speedMin,plannedSpeedMaxKmh:speedMax,targetMode,targetDistanceKm:targetDistance,
      repeatGroup:ctx.repeatGroup||'',repeatIndex:ctx.repeatIndex||0,repeatCount:ctx.repeatCount||0,parsedFromTreinus:true,notes,rawTreinus:raw,raw
    };
  };

  parseTreinusText=function(text){
    const lines=String(text||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean);
    const out=[];let i=0,groupSeq=0;
    while(i<lines.length){
      let sourceLine=lines[i];let line=sourceLine.replace(/^\d+\.\s*/,'').trim();
      const rep=line.match(/^Repetir\s+(\d+)\s*x/i);
      if(rep){
        const count=Math.max(1,Number(rep[1])||1),group='rep-'+(++groupSeq),children=[];i++;
        while(i<lines.length&&!/^\d+\.\s*/.test(lines[i])&&!/^Repetir\s+/i.test(lines[i])){
          const candidate=lines[i].replace(/^[-•]\s*/,'').trim();
          if(treinosParseSegment(candidate))children.push(candidate);i++;
        }
        for(let r=1;r<=count;r++)children.forEach(c=>{const b=treinosParseSegment(c,{repeatGroup:group,repeatIndex:r,repeatCount:count});if(b)out.push(b)});
        continue;
      }
      const b=treinosParseSegment(line);if(b)out.push(b);i++;
    }
    return out;
  };

  function units(blocks){
    const out=[];let i=0;
    while(i<blocks.length){
      const b=blocks[i];
      if(!b.repeatGroup){out.push({kind:'single',block:b});i++;continue}
      const group=b.repeatGroup,all=[];while(i<blocks.length&&blocks[i].repeatGroup===group){all.push(blocks[i]);i++}
      let templates=all.filter(x=>Number(x.repeatIndex||0)===1);
      if(!templates.length){const n=Math.max(1,Math.floor(all.length/Math.max(1,Number(b.repeatCount)||1)));templates=all.slice(0,n)}
      out.push({kind:'repeat',group,count:Number(b.repeatCount)||1,templates});
    }
    return out;
  }
  function stageMetric(b){
    if(b.targetMode==='distance'||Number(b.targetDistanceKm)>0){
      const d=Number(b.targetDistanceKm||b.plannedDistanceKm||0);return `${km(d)} km`;
    }
    return durClock(Number(b.plannedDurationMin)||0,true);
  }
  function stageDetails(b){
    const a=[];
    if(b.plannedPaceMinKm)a.push(`${paceClock(b.plannedPaceMinKm)}–${paceClock(b.plannedPaceMaxMinKm||b.plannedPaceMinKm)}/km`);
    if(b.plannedSpeedMinKmh)a.push(`${speed(b.plannedSpeedMinKmh)}–${speed(b.plannedSpeedMaxKmh||b.plannedSpeedMinKmh)} km/h`);
    if(b.targetMode==='distance'&&(durationLow(b)||durationHigh(b)))a.push(`estimativa ${rangeLabel(durationLow(b),durationHigh(b),x=>durClock(x,true))}`);
    else if(b.plannedDistanceMinKm)a.push(`${km(b.plannedDistanceMinKm)}${b.plannedDistanceMaxKm&&Math.abs(b.plannedDistanceMaxKm-b.plannedDistanceMinKm)>.0001?'–'+km(b.plannedDistanceMaxKm):''} km`);
    return a.join(' • ');
  }
  function editCard(b,idx,repeat=false){
    const isDist=b.targetMode==='distance'||Number(b.targetDistanceKm)>0;
    return `<div class="treinus-stage-edit" data-treinus-edit data-edit-index="${idx}" data-intensity="${esc(b.intensity||'')}" data-raw="${esc(b.rawTreinus||b.raw||'')}">
      <div class="stage-edit-head"><span class="block-order">${idx+1}</span><strong>${repeat?'Etapa da repetição':'Etapa'}</strong></div>
      <div class="stage-edit-grid">
        <label>Tipo<select data-e-type><option ${b.type==='Corrida'?'selected':''}>Corrida</option><option ${b.type==='Caminhada'?'selected':''}>Caminhada</option><option ${b.type==='Aquecimento'?'selected':''}>Aquecimento</option><option ${b.type==='Recuperação'?'selected':''}>Recuperação</option><option ${b.type==='Desaquecimento'?'selected':''}>Desaquecimento</option></select></label>
        <label>Alvo<select data-e-mode><option value="time" ${!isDist?'selected':''}>Tempo</option><option value="distance" ${isDist?'selected':''}>Distância</option></select></label>
        <label>Zona<input data-e-zone value="${esc(b.zone||'')}" placeholder="Z2"></label>
        <label>Tempo (min)<input data-e-min type="number" step="0.01" value="${isDist?'':esc(b.plannedDurationMin||'')}"></label>
        <label>Distância (km)<input data-e-distance type="number" step="0.01" value="${esc(isDist?(b.targetDistanceKm||b.plannedDistanceKm||''):(b.plannedDistanceKm||''))}"></label>
        <label>Ritmo mín. (min/km)<input data-e-pace1 value="${esc(paceClock(b.plannedPaceMinKm)||'')}" placeholder="09:16"></label>
        <label>Ritmo máx. (min/km)<input data-e-pace2 value="${esc(paceClock(b.plannedPaceMaxMinKm)||'')}" placeholder="10:25"></label>
        <label>Vel. mín. (km/h)<input data-e-speed1 type="number" step="0.01" value="${esc(b.plannedSpeedMinKmh||'')}"></label>
        <label>Vel. máx. (km/h)<input data-e-speed2 type="number" step="0.01" value="${esc(b.plannedSpeedMaxKmh||'')}"></label>
        <label>Dist. mín. (km)<input data-e-dmin type="number" step="0.01" value="${esc(b.plannedDistanceMinKm||'')}"></label>
        <label>Dist. máx. (km)<input data-e-dmax type="number" step="0.01" value="${esc(b.plannedDistanceMaxKm||'')}"></label>
        <label>Tempo est. mín.<input data-e-tmin value="${esc(durationLow(b)?durClock(durationLow(b),true):'')}" placeholder="1:04:53"></label>
        <label>Tempo est. máx.<input data-e-tmax value="${esc(durationHigh(b)?durClock(durationHigh(b),true):'')}" placeholder="1:12:53"></label>
      </div>
    </div>`;
  }

  treinusPreviewHtml=function(blocks){
    if(!blocks.length)return '<div class="card empty">Nenhuma etapa reconhecida. Confira o texto colado.</div>';
    const total=blocks.reduce((a,b)=>{
      const lo=durationLow(b),hi=durationHigh(b);a.tmin+=lo;a.tmax+=hi;
      a.dmin+=Number(b.plannedDistanceMinKm||b.plannedDistanceKm||0);a.dmax+=Number(b.plannedDistanceMaxKm||b.plannedDistanceKm||0);
      const mid=(lo+hi)/2||Number(b.plannedDurationMin||0);
      if(String(b.type).toLowerCase().includes('caminh'))a.walk+=mid;
      if(String(b.zone).toUpperCase()==='Z2')a.z2+=mid;if(String(b.zone).toUpperCase()==='Z3')a.z3+=mid;
      return a;
    },{tmin:0,tmax:0,dmin:0,dmax:0,walk:0,z2:0,z3:0});
    const us=units(blocks);
    const flow=us.map(u=>{
      if(u.kind==='single'){const b=u.block;return `<div class="flow-chip ${String(b.type).toLowerCase().includes('caminh')?'walk':''}"><strong>${esc(b.type)}${b.zone?' '+esc(b.zone):''}</strong><span>${esc(stageMetric(b))}</span></div>`}
      const sequence=u.templates.map(b=>`${stageMetric(b)} ${b.zone||b.type}`).join(' → ');
      return `<div class="flow-chip repeat-flow"><strong>${u.count}× repetição</strong><span>${esc(sequence)}</span></div>`;
    }).join('<span class="flow-arrow">→</span>');
    let editIndex=0;
    const editor=us.map((u,unitIndex)=>{
      if(u.kind==='single')return `<div data-edit-unit="single">${editCard(u.block,editIndex++)}</div>`;
      return `<div class="treinus-repeat-edit" data-edit-unit="repeat" data-repeat-group="${esc(u.group)}"><div class="repeat-edit-head"><strong>Repetir</strong><label><input data-repeat-count-input type="number" min="1" value="${u.count}"> vezes</label></div>${u.templates.map(b=>editCard(b,editIndex++,true)).join('')}</div>`;
    }).join('');
    const details=us.map((u,idx)=>{
      if(u.kind==='single'){const b=u.block;return `<article class="treinus-stage-card"><div class="stage-num">${idx+1}</div><div><strong>${esc(b.type)}${b.zone?' '+esc(b.zone):''}</strong><span>${esc(stageMetric(b))}</span><small>${esc(stageDetails(b))}</small></div></article>`}
      return `<article class="treinus-stage-card repeat-card"><div class="stage-num">${idx+1}</div><div><strong>Repetir ${u.count}×</strong>${u.templates.map(b=>`<span>${esc(stageMetric(b))} ${esc(b.type)}${b.zone?' '+esc(b.zone):''}</span><small>${esc(stageDetails(b))}</small>`).join('')}</div></article>`;
    }).join('');
    return `<div class="parser-summary"><span><strong>${rangeLabel(total.tmin,total.tmax,x=>durClock(x,true))}</strong>tempo total</span><span><strong>${rangeLabel(total.dmin,total.dmax,x=>km(x)+' km')}</strong>distância</span><span><strong>${durClock(total.z2)}</strong>Z2</span><span><strong>${durClock(total.z3)}</strong>Z3</span><span><strong>${durClock(total.walk)}</strong>caminhada</span></div><div class="treinus-flow">${flow}</div><div class="treinus-stage-list">${details}</div><details class="treinus-edit-details"><summary>Editar etapas interpretadas</summary><div id="treinusCompactEditor">${editor}</div></details>`;
  };

  interpretTreinusPaste=function(){
    const text=document.getElementById('treinusPaste')?.value||'';
    pendingTreinusParsed=parseTreinusText(text);
    const box=document.getElementById('treinusPastePreview');if(box)box.innerHTML=treinusPreviewHtml(pendingTreinusParsed);
    const apply=document.getElementById('applyTreinusParsed');if(apply)apply.disabled=!pendingTreinusParsed.length;
  };

  function readEditCard(row,base={}){
    const mode=row.querySelector('[data-e-mode]')?.value||base.targetMode||'time';
    const pace1=paceDec(row.querySelector('[data-e-pace1]')?.value),pace2=paceDec(row.querySelector('[data-e-pace2]')?.value);
    let pmin=pace1&&pace2?Math.min(pace1,pace2):(pace1||pace2),pmax=pace1&&pace2?Math.max(pace1,pace2):(pace1||pace2);
    let smin=tNum(row.querySelector('[data-e-speed1]')?.value),smax=tNum(row.querySelector('[data-e-speed2]')?.value);if(smin&&smax&&smin>smax){const q=smin;smin=smax;smax=q}
    let dmin=tNum(row.querySelector('[data-e-dmin]')?.value),dmax=tNum(row.querySelector('[data-e-dmax]')?.value);if(dmin&&dmax&&dmin>dmax){const q=dmin;dmin=dmax;dmax=q}
    const dist=tNum(row.querySelector('[data-e-distance]')?.value),fixed=tNum(row.querySelector('[data-e-min]')?.value);
    let tmin=clockMinutes(row.querySelector('[data-e-tmin]')?.value),tmax=clockMinutes(row.querySelector('[data-e-tmax]')?.value);
    if(mode==='time'){tmin=tmax=fixed;if(!dmin&&!dmax&&fixed&&pmin&&pmax){dmin=fixed/pmax;dmax=fixed/pmin}}
    else {dmin=dmax=dist;if(!tmin&&!tmax&&dist&&pmin&&pmax){tmin=dist*pmin;tmax=dist*pmax}}
    if(!smin&&pmax)smin=60/pmax;if(!smax&&pmin)smax=60/pmin;
    const dur=(tmin&&tmax)?(tmin+tmax)/2:(tmin||tmax||fixed),pd=(dmin&&dmax)?(dmin+dmax)/2:(dmin||dmax||dist);
    const type=row.querySelector('[data-e-type]')?.value||base.type||'Corrida',zone=row.querySelector('[data-e-zone]')?.value.trim()||'';
    return {...clone(base),type,zone,targetMode:mode,targetDistanceKm:mode==='distance'?dist:0,plannedDurationMin:dur,plannedDurationMinEstimate:tmin,plannedDurationMaxEstimate:tmax,plannedDistanceKm:pd,plannedDistanceMinKm:dmin,plannedDistanceMaxKm:dmax,plannedPaceMinKm:pmin,plannedPaceMaxMinKm:pmax,plannedSpeedMinKmh:smin,plannedSpeedMaxKmh:smax,intensity:row.dataset.intensity||base.intensity||'',rawTreinus:row.dataset.raw||base.rawTreinus||base.raw||'',parsedFromTreinus:true};
  }

  applyTreinusParsed=function(){
    const editor=document.getElementById('treinusCompactEditor');
    if(editor){
      const rebuilt=[];let groupSeq=0;
      editor.querySelectorAll(':scope > [data-edit-unit]').forEach(unit=>{
        if(unit.dataset.editUnit==='single'){
          const row=unit.querySelector('[data-treinus-edit]');if(row)rebuilt.push(readEditCard(row,{}));
        }else{
          const count=Math.max(1,Math.round(tNum(unit.querySelector('[data-repeat-count-input]')?.value)||1)),group=unit.dataset.repeatGroup||('rep-edit-'+(++groupSeq));
          const templates=[...unit.querySelectorAll('[data-treinus-edit]')].map(r=>readEditCard(r,{}));
          for(let r=1;r<=count;r++)templates.forEach(t=>rebuilt.push({...clone(t),repeatGroup:group,repeatIndex:r,repeatCount:count,notes:[t.notes||'',`Repetição ${r}/${count}`].filter(Boolean).join(' • ')}));
        }
      });
      if(rebuilt.length)pendingTreinusParsed=rebuilt;
    }
    const box=document.getElementById('treinusBlocks');if(!box||!pendingTreinusParsed.length)return;
    box.innerHTML='';pendingTreinusParsed.forEach(b=>addTrainBlockRow(b));
    const low=pendingTreinusParsed.reduce((s,b)=>s+durationLow(b),0),high=pendingTreinusParsed.reduce((s,b)=>s+durationHigh(b),0);
    const minDist=pendingTreinusParsed.reduce((s,b)=>s+Number(b.plannedDistanceMinKm||b.plannedDistanceKm||0),0),maxDist=pendingTreinusParsed.reduce((s,b)=>s+Number(b.plannedDistanceMaxKm||b.plannedDistanceKm||0),0);
    const dur=document.getElementById('trPlannedDuration'),dist=document.getElementById('trPlannedDistance'),source=document.getElementById('trSource');
    if(dur)dur.value=((low+high)/2||low||high||0).toFixed(2).replace(/\.00$/,'');
    if(dist)dist.value=((minDist+maxDist)/2||minDist||maxDist||0).toFixed(2).replace(/\.00$/,'');
    if(source)source.value='Treinus';
    toast(`${pendingTreinusParsed.length} etapas aplicadas ao planejamento`);
  };

  blockEditorRow=function(b={},i=0){
    const pace1=paceClock(b.plannedPaceMinKm||b.paceMinKm),pace2=paceClock(b.plannedPaceMaxMinKm);
    const est=rangeLabel(durationLow(b),durationHigh(b),x=>durClock(x,true));
    return `<div class="treinus-block-card treinus-block-row" data-block-row data-zone="${esc(b.zone||'')}" data-intensity="${esc(b.intensity||'')}" data-speed-min="${esc(b.plannedSpeedMinKmh||'')}" data-speed-max="${esc(b.plannedSpeedMaxKmh||'')}" data-dist-min="${esc(b.plannedDistanceMinKm||'')}" data-dist-max="${esc(b.plannedDistanceMaxKm||'')}" data-repeat-group="${esc(b.repeatGroup||'')}" data-repeat-index="${esc(b.repeatIndex||'')}" data-repeat-count="${esc(b.repeatCount||'')}" data-parsed="${b.parsedFromTreinus?'1':'0'}" data-duration-min-est="${esc(b.plannedDurationMinEstimate||'')}" data-duration-max-est="${esc(b.plannedDurationMaxEstimate||'')}" data-target-mode="${esc(b.targetMode||'time')}" data-raw-treinus="${esc(b.rawTreinus||b.raw||'')}">
      <div class="block-card-head"><span class="block-order">${i+1}</span><select data-btype><option ${b.type==='Aquecimento'?'selected':''}>Aquecimento</option><option ${b.type==='Corrida'?'selected':''}>Corrida</option><option ${b.type==='Caminhada'?'selected':''}>Caminhada</option><option ${b.type==='Recuperação'?'selected':''}>Recuperação</option><option ${b.type==='Desaquecimento'?'selected':''}>Desaquecimento</option><option ${b.type==='Outro'?'selected':''}>Outro</option></select><span class="pill">${esc(b.zone||'Sem zona')}</span><button type="button" class="block-remove" data-remove-block>×</button></div>
      <div class="block-card-grid">
        <label>Tempo planejado<input data-bpmin type="number" step="0.01" value="${esc(b.plannedDurationMin||b.durationMin||'')}"></label>
        <label>Distância planejada<input data-bdist type="number" step="0.01" value="${esc(b.plannedDistanceKm||b.distanceKm||'')}"></label>
        <label>Ritmo mín.<input data-pace-visible="1" data-pace-hidden="bpace1" value="${esc(pace1)}" placeholder="09:16"><input data-bpace1 data-hidden-pace type="hidden" value="${esc(b.plannedPaceMinKm||b.paceMinKm||'')}"></label>
        <label>Ritmo máx.<input data-pace-visible="1" data-pace-hidden="bpace2" value="${esc(pace2)}" placeholder="10:25"><input data-bpace2 data-hidden-pace type="hidden" value="${esc(b.plannedPaceMaxMinKm||'')}"></label>
        <label>Executado (min)<input data-bemin type="number" step="0.1" value="${esc(b.executedDurationMin||'')}"></label>
        <label>Executado (km)<input data-bedist type="number" step="0.01" value="${esc(b.executedDistanceKm||'')}"></label>
        <label>Ritmo executado<input data-bepace type="number" step="0.01" value="${esc(b.executedPaceMinKm||'')}"></label>
        <label>FC média<input data-bhr type="number" value="${esc(b.avgHr||'')}"></label>
      </div>
      <div class="block-card-meta"><span>${b.plannedSpeedMinKmh?`${speed(b.plannedSpeedMinKmh)}–${speed(b.plannedSpeedMaxKmh||b.plannedSpeedMinKmh)} km/h`:''}</span><span>${b.plannedDistanceMinKm?`${km(b.plannedDistanceMinKm)}${b.plannedDistanceMaxKm&&Math.abs(b.plannedDistanceMaxKm-b.plannedDistanceMinKm)>.0001?'–'+km(b.plannedDistanceMaxKm):''} km`:''}</span><span>${est!=='—'?`tempo ${est}`:''}</span>${b.repeatCount?`<span>repetição ${b.repeatIndex}/${b.repeatCount}</span>`:''}</div>
      <label class="block-notes">Observação<input data-bnotes value="${esc(b.notes||'')}"></label>
    </div>`;
  };

  document.addEventListener('input',function(e){
    const el=e.target;if(!(el instanceof HTMLInputElement)||!el.matches('[data-pace-visible]'))return;
    const label=el.closest('label');const hidden=label?.querySelector('[data-hidden-pace]');if(hidden)hidden.value=paceDec(el.value)||'';
  });
})();

    window.AFPLUS_TRAINING_CONTROLLER_1130.components.push("treinus_fix_v55.js");
/* AF+ Treinos v5.6 — formulários por modalidade; corrida sempre estruturada em 1+ etapas */
(function(){
  const oldTrainingModal = trainingModal;
  const oldSaveTraining = saveTraining;

  function field(id){ return document.getElementById(id)?.closest('.field') || null; }
  function show(id,on){ const el=field(id); if(el) el.style.display=on?'':'none'; }
  function val(id){ return num(document.getElementById(id)?.value); }
  function setv(id,v){ const el=document.getElementById(id); if(el) el.value=(v===null||v===undefined||Number.isNaN(v))?'':v; }
  function sectionByHeading(text){
    return [...document.querySelectorAll('.train-modal-sections > section')].find(s=>s.querySelector('h4')?.textContent.trim()===text) || null;
  }
  function paceClock(v){
    v=Number(v||0); if(!v) return '—';
    let m=Math.floor(v), s=Math.round((v-m)*60); if(s===60){m++;s=0}
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}/km`;
  }
  function minuteClock(v){
    v=Number(v||0); if(!v) return '0 min';
    const sec=Math.round(v*60), h=Math.floor(sec/3600), m=Math.floor((sec%3600)/60), s=sec%60;
    if(h) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    if(s) return `${m}:${String(s).padStart(2,'0')}`;
    return `${m} min`;
  }
  function blockStats(){
    const rows=[...document.querySelectorAll('#treinusBlocks [data-block-row]')];
    let tmin=0,tmax=0,dmin=0,dmax=0,z1=0,z2=0,z3=0,z4=0,run=0,walk=0;
    rows.forEach(r=>{
      const type=(r.querySelector('[data-btype]')?.value||'').toLowerCase();
      const zone=String(r.dataset.zone||'').toUpperCase();
      const exact=valIn(r,'[data-bpmin]');
      const a=Number(r.dataset.durationMinEst||0)||exact;
      const b=Number(r.dataset.durationMaxEst||0)||exact;
      const dk=valIn(r,'[data-bdist]');
      const da=Number(r.dataset.distMin||0)||dk;
      const db=Number(r.dataset.distMax||0)||dk;
      tmin+=a; tmax+=b; dmin+=da; dmax+=db;
      const mid=(a+b)/2;
      if(zone==='Z1') z1+=mid; if(zone==='Z2') z2+=mid; if(zone==='Z3') z3+=mid; if(zone==='Z4') z4+=mid;
      if(type.includes('caminh')) walk+=mid; else if(type.includes('corr')) run+=mid;
    });
    return {rows,tmin,tmax,dmin,dmax,z1,z2,z3,z4,run,walk};
  }
  function valIn(r,sel){ return num(r.querySelector(sel)?.value); }
  function rangeText(a,b,fmt){
    if(!a&&!b) return '—'; if(!b||Math.abs(a-b)<0.005) return fmt(a||b); return `${fmt(a)}–${fmt(b)}`;
  }
  function updateStructuredSummary(){
    const box=document.getElementById('structuredRunSummary'); if(!box) return;
    const s=blockStats();
    box.innerHTML=`<div><span>Etapas</span><strong>${s.rows.length}</strong></div>`+
      `<div><span>Tempo planejado</span><strong>${rangeText(s.tmin,s.tmax,minuteClock)}</strong></div>`+
      `<div><span>Distância</span><strong>${rangeText(s.dmin,s.dmax,v=>fmt(v)+' km')}</strong></div>`+
      `<div><span>Z2</span><strong>${minuteClock(s.z2)}</strong></div>`+
      `<div><span>Z3</span><strong>${minuteClock(s.z3)}</strong></div>`+
      `<div><span>Caminhada</span><strong>${minuteClock(s.walk)}</strong></div>`;
  }
  function installSummaryObserver(){
    const box=document.getElementById('treinusBlocks'); if(!box) return;
    const obs=new MutationObserver(()=>updateStructuredSummary());
    obs.observe(box,{childList:true,subtree:true});
    box.addEventListener('input',updateStructuredSummary);
    box.addEventListener('change',updateStructuredSummary);
    updateStructuredSummary();
  }
  function ensureLegacyRunStage(){
    const box=document.getElementById('treinusBlocks'); if(!box || box.querySelector('[data-block-row]')) return;
    const pd=val('trPlannedDuration'), dist=val('trPlannedDistance'), p1=val('trPlannedPace'), p2=val('trPlannedPaceMax');
    if(pd||dist||p1||p2){
      addTrainBlockRow({type:'Corrida',plannedDurationMin:pd,plannedDistanceKm:dist,plannedPaceMinKm:p1,plannedPaceMaxMinKm:p2});
    }
  }
  function setExecVisibility(){
    const status=document.getElementById('trStatus')?.value||'planejado';
    const sec=sectionByHeading('Executado'); if(sec) sec.style.display=status==='executado'?'':'none';
    const runExtra=document.getElementById('runExecutionExtras'); if(runExtra) runExtra.style.display=status==='executado'?'':'none';
  }
  function configureModality(){
    const mod=document.getElementById('trModality')?.value||'Corrida';
    const isRun=mod==='Corrida', isGym=mod==='Academia', isPil=mod==='Pilates';
    const planned=sectionByHeading('Planejado');
    const run=document.getElementById('runFields');
    if(planned) planned.style.display=isRun?'none':'';
    if(run) run.style.display=isRun?'':'none';

    // Planejado não-corrida
    show('trPlannedDuration',!isRun);
    show('trPlannedDistance',false);
    show('trPlannedPace',false); show('trPlannedPaceMax',false);
    show('trPlannedHrMin',false); show('trPlannedHrMax',false);

    // Executado por modalidade
    show('trExecutedDuration',true);
    show('trExecutedDistance',isRun);
    show('trExecutedPace',isRun);
    show('trAvgHr',isRun||isGym);
    show('trMaxHr',isRun);
    show('trCalories',true);
    show('trEnvironment',isRun);
    show('trTreadmillSpeed',false); show('trTreadmillIncline',false);

    // Corrida: detalhes manuais de zona/tempo são calculados das etapas.
    ['trZ1','trZ2','trZ3','trZ4','trRunMin','trWalkMin'].forEach(id=>show(id,false));
    show('trElevation',isRun);
    show('trCadence',isRun);

    const idTreinus=field('trTreinusId'); if(idTreinus) idTreinus.style.display=isRun?'':'none';
    if(isRun){
      ensureLegacyRunStage();
      const h=run?.querySelector('h4'); if(h) h.textContent='Corrida estruturada';
      const firstGrid=run?.querySelector(':scope > .formgrid'); if(firstGrid) firstGrid.classList.add('run-execution-hidden-grid');
      if(run && !document.getElementById('structuredRunIntro')){
        const intro=document.createElement('div'); intro.id='structuredRunIntro'; intro.className='structured-run-intro';
        intro.innerHTML='<strong>Planejamento por etapas</strong><span>A corrida sempre tem pelo menos 1 etapa. Um treino simples é apenas uma etapa; treinos intervalados podem ter várias ou grupos de repetição.</span><div id="structuredRunSummary" class="structured-run-summary"></div>';
        run.insertBefore(intro, run.children[1]||null);
      }
      updateStructuredSummary();
    }
    setExecVisibility();
    updateTreadmillFields();
  }
  function updateTreadmillFields(){
    const run=document.getElementById('trModality')?.value==='Corrida';
    const exec=document.getElementById('trStatus')?.value==='executado';
    const treadmill=document.getElementById('trEnvironment')?.value==='Esteira';
    show('trTreadmillSpeed',run&&exec&&treadmill);
    show('trTreadmillIncline',run&&exec&&treadmill);
  }

  trainingModal=function(id='',preset={}){
    oldTrainingModal(id,preset);
    setTimeout(()=>{
      const mod=document.getElementById('trModality'), status=document.getElementById('trStatus'), env=document.getElementById('trEnvironment');
      mod?.addEventListener('change',configureModality);
      status?.addEventListener('change',()=>{setExecVisibility();updateTreadmillFields()});
      env?.addEventListener('change',updateTreadmillFields);
      configureModality();
      installSummaryObserver();
      document.getElementById('addTrainBlock')?.addEventListener('click',()=>setTimeout(updateStructuredSummary,0));
      document.getElementById('addWalkBlock')?.addEventListener('click',()=>setTimeout(updateStructuredSummary,0));
      document.getElementById('applyTreinusParsed')?.addEventListener('click',()=>setTimeout(updateStructuredSummary,0));
    },30);
  };

  saveTraining=async function(id=''){
    const mod=document.getElementById('trModality')?.value||'Corrida';
    if(mod==='Corrida'){
      const s=blockStats();
      if(!s.rows.length){ toast('Adicione pelo menos 1 etapa à corrida.'); return; }
      const tmid=(s.tmin+s.tmax)/2, dmid=(s.dmin+s.dmax)/2;
      setv('trPlannedDuration',tmid||0);
      setv('trPlannedDistance',dmid||0);
      setv('trPlannedPace',0); setv('trPlannedPaceMax',0);
      setv('trZ1',s.z1); setv('trZ2',s.z2); setv('trZ3',s.z3); setv('trZ4',s.z4);
      setv('trRunMin',s.run); setv('trWalkMin',s.walk);
    } else {
      // Evita carregar campos de corrida para outras modalidades.
      ['trPlannedPace','trPlannedPaceMax','trZ1','trZ2','trZ3','trZ4','trRunMin','trWalkMin','trTreadmillSpeed','trTreadmillIncline'].forEach(id=>setv(id,0));
      if(mod==='Academia'||mod==='Pilates') setv('trPlannedDistance',0);
      if(mod==='Academia'||mod==='Pilates'){ setv('trExecutedDistance',0); setv('trExecutedPace',0); }
      if(mod==='Pilates'){ setv('trAvgHr',0); setv('trMaxHr',0); }
      if(mod==='Academia') setv('trMaxHr',0);
    }
    return oldSaveTraining(id);
  };
})();

    window.AFPLUS_TRAINING_CONTROLLER_1130.components.push("training_form_v56.js");
  }
  if(phase==="after_finalization") {
/* AF+ Treinos v8.0.4 — ritmo executado calculado automaticamente por tempo / distância */
(function(){
  const oldTrainingModal = trainingModal;

  function n(v){ return Number(String(v ?? '').replace(',','.')) || 0; }
  function paceClock(v){
    v = n(v); if(!v) return '—';
    let m = Math.floor(v), s = Math.round((v-m)*60);
    if(s===60){ m++; s=0; }
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} min/km`;
  }
  function setAutoPaceField(){
    const pace = document.getElementById('trExecutedPace');
    if(!pace) return;
    const f = pace.closest('.field');
    if(!f) return;
    pace.style.display='none';
    let out=f.querySelector('[data-auto-pace-display]');
    if(!out){
      out=document.createElement('div');
      out.dataset.autoPaceDisplay='1';
      out.className='auto-pace-display';
      f.appendChild(out);
    }
    const duration=n(document.getElementById('trExecutedDuration')?.value);
    const distance=n(document.getElementById('trExecutedDistance')?.value);
    const modality=document.getElementById('trModality')?.value||'';
    const calc=(modality==='Corrida' && duration>0 && distance>0)?duration/distance:0;
    pace.value=calc?String(calc):'';
    out.innerHTML=`<strong>${paceClock(calc)}</strong><small>${calc?'Calculado automaticamente por tempo ÷ distância':'Informe tempo e distância executados'}</small>`;
  }
  function installMainPace(){
    ['trExecutedDuration','trExecutedDistance','trModality'].forEach(id=>{
      const el=document.getElementById(id);
      if(el && !el.dataset.autoPaceBound){
        el.dataset.autoPaceBound='1';
        el.addEventListener('input',setAutoPaceField);
        el.addEventListener('change',setAutoPaceField);
      }
    });
    setAutoPaceField();
  }
  function updateBlockPace(row){
    if(!row) return;
    const min=n(row.querySelector('[data-bemin]')?.value);
    const km=n(row.querySelector('[data-bedist]')?.value);
    const pace=row.querySelector('[data-bepace]');
    if(!pace) return;
    const calc=min>0&&km>0?min/km:0;
    pace.value=calc?String(calc):'';
    pace.style.display='none';
    let out=row.querySelector('[data-block-auto-pace]');
    if(!out){
      out=document.createElement('div');
      out.dataset.blockAutoPace='1';
      out.className='block-auto-pace';
      // Insert after hidden pace input, preserving grid position visually.
      pace.insertAdjacentElement('afterend',out);
    }
    out.textContent=calc?paceClock(calc):'—';
    out.title=calc?'Ritmo automático: tempo executado ÷ distância executada':'Preencha tempo e distância executados';
  }
  function bindBlock(row){
    if(!row || row.dataset.autoPaceBound==='1') return;
    row.dataset.autoPaceBound='1';
    ['[data-bemin]','[data-bedist]'].forEach(sel=>{
      const el=row.querySelector(sel);
      el?.addEventListener('input',()=>updateBlockPace(row));
      el?.addEventListener('change',()=>updateBlockPace(row));
    });
    updateBlockPace(row);
  }
  function installBlockPaces(){
    const box=document.getElementById('treinusBlocks'); if(!box) return;
    box.querySelectorAll('[data-block-row]').forEach(bindBlock);
    if(!box.dataset.autoPaceObserver){
      box.dataset.autoPaceObserver='1';
      new MutationObserver(()=>box.querySelectorAll('[data-block-row]').forEach(bindBlock)).observe(box,{childList:true,subtree:true});
    }
  }
  function install(){ installMainPace(); installBlockPaces(); }

  trainingModal=function(id='',preset={}){
    oldTrainingModal(id,preset);
    setTimeout(install,80);
  };
})();

    window.AFPLUS_TRAINING_CONTROLLER_1130.components.push("pace_auto_v804.js");
/* AF+ Treinos v8.0.5 — entrada de duração executada em h:mm:ss, preservando minutos decimais no XLSX */
(function(){
  const prevTrainingModal = trainingModal;
  const prevSaveTraining = saveTraining;

  function numLocal(v){ return Number(String(v ?? '').replace(',','.')) || 0; }
  function parseDuration(v){
    const s=String(v ?? '').trim();
    if(!s) return 0;
    if(!s.includes(':')) return numLocal(s);
    const p=s.split(':').map(x=>Number(String(x).replace(',','.')));
    if(p.some(Number.isNaN)) return 0;
    let sec=0;
    if(p.length===3) sec=(p[0]*3600)+(p[1]*60)+p[2];
    else if(p.length===2) sec=(p[0]*60)+p[1];
    else return numLocal(s);
    return sec/60;
  }
  function formatDuration(v){
    const min=numLocal(v); if(!min) return '';
    let sec=Math.round(min*60);
    const h=Math.floor(sec/3600); sec%=3600;
    const m=Math.floor(sec/60), s=sec%60;
    return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
  }
  function paceClock(v){
    v=numLocal(v); if(!v) return '—';
    let m=Math.floor(v), s=Math.round((v-m)*60); if(s===60){m++;s=0;}
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')} min/km`;
  }
  function calcMainPace(){
    const time=document.getElementById('trExecutedDuration');
    const dist=document.getElementById('trExecutedDistance');
    const pace=document.getElementById('trExecutedPace');
    if(!time||!dist||!pace) return;
    const min=parseDuration(time.value), km=numLocal(dist.value);
    const modality=document.getElementById('trModality')?.value||'';
    const calc=(modality==='Corrida'&&min>0&&km>0)?min/km:0;
    pace.value=calc?String(calc):'';
    const f=pace.closest('.field');
    const out=f?.querySelector('[data-auto-pace-display]');
    if(out) out.innerHTML=`<strong>${paceClock(calc)}</strong><small>${calc?'Calculado automaticamente por tempo ÷ distância':'Informe tempo e distância executados'}</small>`;
  }
  function calcBlockPace(row){
    if(!row) return;
    const time=row.querySelector('[data-bemin]'), dist=row.querySelector('[data-bedist]'), pace=row.querySelector('[data-bepace]');
    if(!time||!dist||!pace) return;
    const min=parseDuration(time.value), km=numLocal(dist.value), calc=(min>0&&km>0)?min/km:0;
    pace.value=calc?String(calc):'';
    const out=row.querySelector('[data-block-auto-pace]');
    if(out){out.textContent=calc?paceClock(calc):'—';out.title=calc?'Ritmo automático: tempo executado ÷ distância executada':'Preencha tempo e distância executados';}
  }
  function decorateDurationInput(el,labelText){
    if(!el||el.dataset.hmsReady==='1') return;
    const original=el.value;
    el.type='text';
    el.inputMode='numeric';
    el.placeholder='1:08:20';
    el.value=formatDuration(original);
    el.dataset.hmsReady='1';
    el.title='Digite como h:mm:ss (ex.: 1:08:20) ou mm:ss';
    const field=el.closest('.field');
    const label=field?.querySelector('label');
    if(label&&labelText) label.textContent=labelText;
  }
  function decorateBlock(row){
    if(!row) return;
    const el=row.querySelector('[data-bemin]');
    if(el&&!el.dataset.hmsReady){
      const original=el.value;
      el.type='text'; el.inputMode='numeric'; el.placeholder='1:08:20'; el.value=formatDuration(original); el.dataset.hmsReady='1';
      el.title='Tempo executado em h:mm:ss ou mm:ss';
      el.addEventListener('input',()=>calcBlockPace(row));
      el.addEventListener('change',()=>calcBlockPace(row));
    }
    calcBlockPace(row);
  }
  function install(){
    const main=document.getElementById('trExecutedDuration');
    decorateDurationInput(main,'Tempo executado (h:mm:ss)');
    main?.addEventListener('input',calcMainPace);
    main?.addEventListener('change',calcMainPace);
    document.getElementById('trExecutedDistance')?.addEventListener('input',calcMainPace);
    document.getElementById('trExecutedDistance')?.addEventListener('change',calcMainPace);
    document.querySelectorAll('#treinusBlocks [data-block-row]').forEach(decorateBlock);
    const box=document.getElementById('treinusBlocks');
    if(box&&!box.dataset.hmsObserver){
      box.dataset.hmsObserver='1';
      new MutationObserver(()=>box.querySelectorAll('[data-block-row]').forEach(decorateBlock)).observe(box,{childList:true,subtree:true});
    }
    calcMainPace();
  }
  function normalizeBeforeSave(){
    const main=document.getElementById('trExecutedDuration');
    if(main) main.value=String(parseDuration(main.value)||'');
    document.querySelectorAll('#treinusBlocks [data-block-row]').forEach(row=>{
      const el=row.querySelector('[data-bemin]'); if(el) el.value=String(parseDuration(el.value)||'');
      calcBlockPace(row);
    });
    calcMainPace();
  }

  trainingModal=function(id='',preset={}){
    prevTrainingModal(id,preset);
    setTimeout(install,120);
  };
  saveTraining=async function(id=''){
    normalizeBeforeSave();
    return prevSaveTraining(id);
  };
})();

    window.AFPLUS_TRAINING_CONTROLLER_1130.components.push("duration_hms_v805.js");
  }
  if(phase==="after_af_plus") {
/* AF+ Treinos v11.2.2 — Controlador consolidado de alto nível.
   Integra workflow, foco, planejador, comparação e auditoria mantendo a ordem funcional da v11.2.1. */
window.AFPLUS_TRAINING_CONTROLLER_1122={version:"11.2.2",loadedAt:new Date().toISOString(),components:[]};

/* ===== INTEGRADO: workflow_v905.js ===== */
(()=>{
  'use strict';
  const V='11.3.0';
  let batchImports=[];

  const statusKey=x=>String(x?.reviewStatus||'pendente').toLowerCase();
  const isReviewOpen=x=>['pendente','revisado_link','revisado_novo','revisado_ignorar'].includes(statusKey(x));
  const decisionLabel=x=>statusKey(x)==='revisado_link'?'Vincular ao planejado':statusKey(x)==='revisado_novo'?'Salvar como novo':statusKey(x)==='revisado_ignorar'?'Ignorar':'Escolha uma ação';
  function importedWorkoutName(x){
    if(String(x?.workoutName||'').trim())return String(x.workoutName).trim();
    try{
      const o=JSON.parse(String(x?.originalData||'{}'));
      const keys=['activity name','Activity Name','name','Name','title','Title','workout name','nome','nome da atividade','workoutName'];
      for(const k of keys){if(String(o?.[k]||'').trim())return String(o[k]).trim()}
      if(String(o?.workoutName||'').trim())return String(o.workoutName).trim();
      const fn=String(o?.fileName||x?.fileName||'').replace(/\.[^.]+$/,'').trim();
      if(fn && !/^\d+$/.test(fn) && !/^activity[_ -]?\d*$/i.test(fn) && !/^atividade[_ -]?\d*$/i.test(fn))return fn;
    }catch(_){ }
    return '';
  }

  async function parseOneImportFile(file,source){
    const ext=(file.name.split('.').pop()||'').toLowerCase();
    let activities=[];
    if(ext==='csv') activities=csvRows(await file.text()).map(o=>normalizeImportedActivity(o,source));
    else if(ext==='json'){
      const data=JSON.parse(await file.text());
      const arr=Array.isArray(data)?data:(data.activities||data.data||[]);
      activities=arr.map(o=>normalizeImportedActivity(o,source));
    } else if(ext==='gpx'||ext==='tcx') activities=parseTrackXml(await file.text(),source,file.name);
    else if(ext==='fit') activities=parseFitActivities(await file.arrayBuffer(),source,file.name);
    else throw new Error('Formato não suportado');
    activities.forEach(a=>{
      const m=suggestedTraining(a);
      a.suggestedTrainingId=m?.id||'';
      a.matchReason=m?'mesma data e modalidade compatível':'';
      a.duplicateStatus=isImportedDuplicate(a)?'possivel':'novo';
    });
    return {file,source,format:ext.toUpperCase(),activities};
  }

  async function previewTrainImportFiles(fileList){
    const files=[...fileList];
    const box=document.getElementById('trainImportPreview');
    const btn=document.getElementById('confirmTrainImport');
    const source=document.getElementById('trainImportSource')?.value||state.trainImportSource||'Garmin';
    state.trainImportSource=source;
    if(!files.length){batchImports=[];if(box)box.innerHTML='<span class="muted">Nenhum arquivo selecionado.</span>';if(btn)btn.disabled=true;return}
    if(box)box.innerHTML=`<strong>Lendo ${files.length} arquivo(s)...</strong>`;
    batchImports=[];
    for(const file of files){
      try{batchImports.push({...await parseOneImportFile(file,source),error:''})}
      catch(e){batchImports.push({file,source,format:(file.name.split('.').pop()||'').toUpperCase(),activities:[],error:String(e?.message||e)})}
    }
    const total=batchImports.reduce((s,x)=>s+x.activities.length,0);
    if(box)box.innerHTML=`<div class="batch-import-summary"><strong>${files.length} arquivo(s) selecionado(s) • ${total} atividade(s) detectada(s)</strong>${batchImports.map(x=>`<div class="batch-file-row ${x.error?'error':''}"><span>${esc(x.file.name)}</span><strong>${x.error?'Erro':`${x.activities.length} atividade(s)`}</strong>${x.error?`<small>${esc(x.error)}</small>`:''}</div>`).join('')}</div>`;
    if(btn){btn.disabled=total===0;btn.textContent=`Enviar ${total} atividade(s) para revisão`}
  }

  async function confirmTrainImportBatch(){
    const valid=batchImports.filter(x=>x.activities.length);
    if(!valid.length)return;
    const impHeaders=rows(FILES.training,'Importacoes')[0]?.map(String)||[];
    const inboxHeaders=rows(FILES.training,'Importacao_Atividades')[0]?.map(String)||[];
    const imps=trainingImportRows();
    const inbox=trainingImportInboxRows();
    const now=new Date().toISOString();
    let total=0;
    const seen=new Set(inbox.map(x=>String(x.fingerprint||'')));
    for(let fi=0;fi<valid.length;fi++){
      const entry=valid[fi],importId=`imp-${Date.now()}-${fi}`;
      let dups=0;
      entry.activities.forEach((a,ai)=>{
        if(seen.has(String(a.fingerprint||'')))a.duplicateStatus='possivel';
        if(a.duplicateStatus==='possivel')dups++;
        seen.add(String(a.fingerprint||''));
        inbox.push({id:a.id||`impact-${Date.now()}-${fi}-${ai}`,importId,date:a.date,source:entry.source,fileName:entry.file.name,format:entry.format,modality:a.modality,executedDurationMin:a.executedDurationMin,executedDistanceKm:a.executedDistanceKm,executedPaceMinKm:a.executedPaceMinKm,avgHr:a.avgHr,maxHr:a.maxHr,calories:a.calories,elevationM:a.elevationM,cadenceAvg:a.cadenceAvg,externalId:a.externalId,fingerprint:a.fingerprint,suggestedTrainingId:a.suggestedTrainingId,matchReason:a.matchReason,duplicateStatus:a.duplicateStatus,reviewStatus:'pendente',originalData:a.originalData,createdAt:now});
      });
      const dates=entry.activities.map(a=>a.date).filter(Boolean).sort();
      imps.push({id:importId,date:today(),source:entry.source,fileName:entry.file.name,format:entry.format,activityCount:entry.activities.length,status:'aguardando revisão',notes:'Atividades enviadas para caixa de revisão',importedAt:now,periodStart:dates[0]||'',periodEnd:dates.at(-1)||'',duplicatesDetected:dups,pendingReview:entry.activities.length});
      total+=entry.activities.length;
    }
    await saveSheet(FILES.training,'Importacoes',toRows(imps,impHeaders));
    await saveSheet(FILES.training,'Importacao_Atividades',toRows(inbox,inboxHeaders));
    batchImports=[];
    toast(`${total} atividade(s) enviada(s) para revisão`);
    render();
  }

  async function markReviewDecision(id,mode){
    const headers=rows(FILES.training,'Importacao_Atividades')[0]?.map(String)||[];
    const inbox=trainingImportInboxRows();
    const item=inbox.find(x=>String(x.id||'')===String(id));
    if(!item)return;
    item.reviewStatus=mode==='link'?'revisado_link':mode==='new'?'revisado_novo':'revisado_ignorar';
    await saveSheet(FILES.training,'Importacao_Atividades',toRows(inbox,headers));
    render();
  }

  async function finalizeTrainingReview(){
    const inboxHeaders=rows(FILES.training,'Importacao_Atividades')[0]?.map(String)||[];
    const trainHeaders=rows(FILES.training,'Treinos')[0]?.map(String)||[];
    const importHeaders=rows(FILES.training,'Importacoes')[0]?.map(String)||[];
    const inbox=trainingImportInboxRows();
    const tr=trainingRows();
    const imps=trainingImportRows();
    const chosen=inbox.filter(x=>['revisado_link','revisado_novo','revisado_ignorar'].includes(statusKey(x)));
    if(!chosen.length){toast('Escolha uma ação para pelo menos uma atividade');return}
    if(!confirm(`Finalizar ${chosen.length} atividade(s) revisada(s)?\n\nDepois disso elas serão gravadas no histórico ou ignoradas conforme sua escolha.`))return;
    let saved=0,ignored=0;
    chosen.forEach((item,i)=>{
      const st=statusKey(item);
      if(st==='revisado_ignorar'){item.reviewStatus='ignorado';ignored++;return}
      let target=st==='revisado_link'?tr.find(x=>String(x.id||'')===String(item.suggestedTrainingId||'')):null;
      if(!target){
        target={id:`tr-${Date.now()}-${i}`,userId:'local',date:item.date,weekday:DAYS[new Date(item.date+'T12:00:00').getDay()],modality:item.modality,status:'executado',source:item.source,workoutName:importedWorkoutName(item),createdAt:new Date().toISOString()};
        tr.push(target);
      }
      Object.assign(target,{status:'executado',source:item.source,workoutName:String(target.workoutName||'').trim()||importedWorkoutName(item),executedDurationMin:num(item.executedDurationMin),executedDistanceKm:num(item.executedDistanceKm),executedPaceMinKm:num(item.executedPaceMinKm),avgHr:num(item.avgHr),maxHr:num(item.maxHr),calories:num(item.calories),elevationM:num(item.elevationM),cadenceAvg:num(item.cadenceAvg),externalId:item.externalId,fingerprint:item.fingerprint,originalDurationMin:num(item.executedDurationMin),originalDistanceKm:num(item.executedDistanceKm),originalPaceMinKm:num(item.executedPaceMinKm),originalAvgHr:num(item.avgHr),originalMaxHr:num(item.maxHr),originalCalories:num(item.calories),manuallyAdjusted:false,updatedAt:new Date().toISOString()});
      item.reviewStatus=st==='revisado_link'?'vinculado':'novo';
      saved++;
    });
    imps.forEach(imp=>{
      const related=inbox.filter(x=>String(x.importId||'')===String(imp.id||''));
      const open=related.filter(isReviewOpen).length;
      imp.pendingReview=open;
      if(related.length&&!open){imp.status='revisão finalizada';imp.notes='Importação revisada e finalizada'}
    });
    await saveSheet(FILES.training,'Treinos',toRows(tr,trainHeaders));
    await saveSheet(FILES.training,'Importacao_Atividades',toRows(inbox,inboxHeaders));
    await saveSheet(FILES.training,'Importacoes',toRows(imps,importHeaders));
    toast(`${saved} atividade(s) salva(s) • ${ignored} ignorada(s)`);
    render();
  }

  const oldTrainImports=trainImports;
  trainImports=function(){
    const imp=trainingImportRows().slice().sort((a,b)=>String(b.importedAt||b.date).localeCompare(String(a.importedAt||a.date)));
    const inbox=trainingImportInboxRows().slice().sort((a,b)=>String(b.createdAt||b.date).localeCompare(String(a.createdAt||a.date)));
    const pending=inbox.filter(isReviewOpen);
    const ready=pending.filter(x=>statusKey(x)!=='pendente').length;
    return `<div class="import-layout"><section class="import-panel"><span class="body-kicker">Importação por arquivo</span><h3>Garmin, Strava ou Zepp</h3><p class="muted">Selecione um ou vários arquivos. Primeiro eles vão para a Caixa de revisão; depois você escolhe a ação de cada atividade e usa <strong>Finalizar revisão</strong>.</p><div class="formgrid"><div class="field"><label>Origem</label><select id="trainImportSource"><option ${state.trainImportSource==='Garmin'?'selected':''}>Garmin</option><option ${state.trainImportSource==='Strava'?'selected':''}>Strava</option><option ${state.trainImportSource==='Zepp'?'selected':''}>Zepp</option></select></div><div class="field"><label>Arquivos</label><input id="trainImportFile" type="file" multiple accept=".csv,.gpx,.tcx,.json,.fit,.FIT"></div></div><div id="trainImportPreview" class="import-preview"><span class="muted">Nenhum arquivo selecionado.</span></div><div class="actions"><button class="btn primary" id="confirmTrainImport" disabled>Enviar para revisão</button></div></section><section><div class="sectiontitle"><div><h3>Caixa de revisão</h3><span class="muted">${pending.length} pendente(s) • ${ready} preparado(s) para finalizar</span></div>${pending.length?`<button class="btn primary" id="finalizeTrainReview" ${ready?'':'disabled'}>Finalizar revisão (${ready})</button>`:''}</div><div class="train-history-list">${pending.map(x=>{const match=trainingRows().find(t=>String(t.id||'')===String(x.suggestedTrainingId||''));const st=statusKey(x);return `<article class="import-review-card ${st!=='pendente'?'review-ready':''}"><div><span class="body-kicker">${brDate(x.date)} • ${esc(x.source||'Arquivo')}</span><h3>${esc(importedWorkoutName(x)||x.modality||'Atividade')}</h3><div class="train-stats"><span>${durationText(x.executedDurationMin)}</span>${num(x.executedDistanceKm)?`<span>${fmt(x.executedDistanceKm)} km</span>`:''}${num(x.avgHr)?`<span>FC ${fmt(x.avgHr)}</span>`:''}${x.duplicateStatus==='possivel'?'<span>Possível duplicado</span>':''}</div>${match?`<small class="match-note">Planejado sugerido: ${esc(match.workoutName||trainModality(match))}</small>`:'<small class="muted">Nenhum planejado correspondente encontrado.</small>'}<div class="review-choice"><strong>Ação:</strong> ${esc(decisionLabel(x))}</div></div><div class="import-review-actions">${match?`<button class="btn ${st==='revisado_link'?'primary':''}" data-review-choice="link" data-import-id="${esc(x.id)}">Vincular ao planejado</button>`:''}<button class="btn ${st==='revisado_novo'?'primary':''}" data-review-choice="new" data-import-id="${esc(x.id)}">Salvar como novo</button><button class="btn ${st==='revisado_ignorar'?'danger':''}" data-review-choice="ignore" data-import-id="${esc(x.id)}">Ignorar</button></div></article>`}).join('')||'<div class="card empty">Nenhuma atividade aguardando revisão.</div>'}</div><div class="sectiontitle"><h3>Histórico de importações</h3></div><div class="train-history-list">${imp.map(x=>`<article class="train-history-card"><div><span class="body-kicker">${brDate(x.date||x.importedAt)}</span><h3>${esc(x.source||'Arquivo')}</h3><div class="train-stats"><span>${esc(x.fileName||'')}</span><span>${esc(x.format||'')}</span><span>${fmt(x.activityCount)} atividades</span>${num(x.duplicatesDetected)?`<span>${fmt(x.duplicatesDetected)} duplicadas</span>`:''}</div></div><span class="pill ${String(x.status).toLowerCase().includes('final')?'done':''}">${esc(x.status||'')}</span></article>`).join('')||'<div class="card empty">Nenhuma importação registrada.</div>'}</div></section></div>`;
  };

  async function deleteTrainingPlan(id){
    const item=trainingRows().find(x=>String(x.id||'')===String(id));
    if(!item)return;
    const label=trainStatus(item)==='executado'?'treino executado':'planejamento';
    if(!confirm(`Excluir este ${label}?\n\nAs etapas vinculadas também serão excluídas. Esta ação não remove arquivos de importação já registrados.`))return;
    const th=rows(FILES.training,'Treinos')[0]?.map(String)||[];
    const bh=rows(FILES.training,'Blocos')[0]?.map(String)||[];
    const ih=rows(FILES.training,'Importacao_Atividades')[0]?.map(String)||[];
    const t=trainingRows().filter(x=>String(x.id||'')!==String(id));
    const b=trainingBlockRows().filter(x=>String(x.trainingId||'')!==String(id));
    const inbox=trainingImportInboxRows();
    inbox.forEach(x=>{if(String(x.suggestedTrainingId||'')===String(id)){x.suggestedTrainingId='';x.matchReason='planejamento excluído'}});
    await saveSheet(FILES.training,'Treinos',toRows(t,th));
    await saveSheet(FILES.training,'Blocos',toRows(b,bh));
    await saveSheet(FILES.training,'Importacao_Atividades',toRows(inbox,ih));
    state.modal=null;toast('Planejamento excluído');render();
  }

  async function deleteNutritionPlanning(d,meal,planId){
    const plan=planRows().find(x=>String(x.id||'')===String(planId));
    if(!plan)return;
    const linked=consumptionRows().some(x=>String(x.sourcePlanId||'')===String(planId));
    const msg=linked?'Este planejamento já possui consumo registrado. O consumo histórico será mantido; apenas o planejamento e seus itens serão excluídos. Continuar?':'Excluir este planejamento e seus itens?';
    if(!confirm(msg))return;
    const ph=rows(FILES.nutrition,'Planejamento')[0]?.map(String)||[];
    const ih=rows(FILES.nutrition,'Planejamento_Itens')[0]?.map(String)||[];
    const plans=planRows().filter(x=>String(x.id||'')!==String(planId));
    const items=objRows(FILES.nutrition,'Planejamento_Itens').filter(x=>String(x.planId||'')!==String(planId));
    await saveSheet(FILES.nutrition,'Planejamento_Itens',toRows(items,ih));
    await saveSheet(FILES.nutrition,'Planejamento',toRows(plans,ph));
    state.modal=null;toast('Planejamento excluído');render();
  }

  const oldTrainingModal=trainingModal;
  trainingModal=function(id='',preset={}){
    oldTrainingModal(id,preset);
    if(id)setTimeout(()=>{
      const actions=document.querySelector('#modalback .actions');
      if(actions&&!document.getElementById('deleteTrainingPlan905')){
        const b=document.createElement('button');b.className='btn danger';b.id='deleteTrainingPlan905';b.textContent='Excluir treino';b.onclick=()=>deleteTrainingPlan(id);actions.prepend(b);
      }
    },30);
  };

  const oldPlanModal=planModal;
  planModal=function(d,meal){
    const current=pickPlan(d,meal);
    oldPlanModal(d,meal);
    if(current?.id)setTimeout(()=>{
      const actions=document.querySelector('#modalback .plan-save-actions');
      if(actions&&!document.getElementById('deleteNutritionPlan905')){
        const b=document.createElement('button');b.className='btn danger';b.id='deleteNutritionPlan905';b.textContent='Excluir planejamento';b.onclick=()=>deleteNutritionPlanning(d,meal,current.id);actions.prepend(b);
      }
    },30);
  };

  const oldBind=bind;
  bind=function(){
    oldBind();
    const oldInp=document.getElementById('trainImportFile');
    if(oldInp){const inp=oldInp.cloneNode(true);oldInp.replaceWith(inp);inp.addEventListener('change',e=>previewTrainImportFiles(e.target.files||[]))}
    const oldConfirm=document.getElementById('confirmTrainImport');
    if(oldConfirm){const confirmBtn=oldConfirm.cloneNode(true);oldConfirm.replaceWith(confirmBtn);confirmBtn.addEventListener('click',confirmTrainImportBatch)}
    document.querySelectorAll('[data-review-choice]').forEach(b=>b.onclick=()=>markReviewDecision(b.dataset.importId,b.dataset.reviewChoice));
    document.getElementById('finalizeTrainReview')?.addEventListener('click',finalizeTrainingReview);
  };

  window.AFPLUS_WORKFLOW_905={version:V,previewTrainImportFiles,confirmTrainImportBatch,finalizeTrainingReview,deleteTrainingPlan,deleteNutritionPlanning};
})();

window.AFPLUS_TRAINING_CONTROLLER_1122.components.push("workflow_v905.js");

/* ===== INTEGRADO: training_focus_v1010.js ===== */
/* AF+ 10.1.1 — Treinos focados
   Corrida = única modalidade planejável.
   Academia/Pilates = somente executados/importados.
   Corrida planejada pode ser executada em Rua ou Esteira.
*/
(()=>{
  'use strict';
  const V='11.2.1';
  const ACTIVE=['Corrida','Academia','Pilates'];
  const norm=s=>String(s||'').trim().toLowerCase();
  const activeMod=x=>ACTIVE.includes(trainModality(x));
  const isRun=x=>norm(trainModality(x)).includes('corr');
  const isPlannedRun=x=>isRun(x)&&trainStatus(x)!=='executado'&&trainStatus(x)!=='cancelado';
  const isExecutedActive=x=>activeMod(x)&&trainStatus(x)==='executado';
  const activeVisibleRows=()=>trainingRows().filter(x=>!String(x.archived||'').toLowerCase().includes('sim')&&activeMod(x));

  // Mapear apenas as modalidades realmente usadas.
  const oldNormalizeImportedActivity=typeof normalizeImportedActivity==='function'?normalizeImportedActivity:null;
  if(oldNormalizeImportedActivity){
    normalizeImportedActivity=function(o,source){
      const a=oldNormalizeImportedActivity(o,source);
      const raw=norm(a.modality);
      if(raw.includes('run')||raw.includes('corr')||raw.includes('treadmill')) a.modality='Corrida';
      else if(raw.includes('pilat')) a.modality='Pilates';
      else if(raw.includes('strength')||raw.includes('weight')||raw.includes('gym')||raw.includes('academ')) a.modality='Academia';
      else if(raw.includes('cycl')||raw.includes('cicl')||raw.includes('bike')) a.modality='Atividade não identificada';
      a.fingerprint=trainingFingerprint(a);
      return a;
    };
  }
  if(typeof fitSportName==='function'){
    fitSportName=function(sport,subSport,name=''){
      const n=String(name||'').trim().toLowerCase();
      if(n.includes('pilat'))return 'Pilates';
      if(n.includes('run')||n.includes('corr')||n.includes('treadmill'))return 'Corrida';
      if(n.includes('strength')||n.includes('gym')||n.includes('academ'))return 'Academia';
      const sub=Number(subSport),sp=Number(sport);
      if(sub===44)return 'Pilates';
      if(sp===1)return 'Corrida';
      if(sp===4||sp===10)return 'Academia';
      if(sp===2)return 'Atividade não identificada';
      return 'Atividade não identificada';
    };
  }

  // Somente corrida pode procurar um planejamento correspondente.
  suggestedTraining=function(a){
    if(!isRun(a))return null;
    const c=trainingRows().filter(x=>String(x.date||'')===String(a.date||'')&&isPlannedRun(x));
    if(!c.length)return null;
    const score=x=>{
      let s=0;
      const dd=Math.abs(num(x.plannedDurationMin)-num(a.executedDurationMin));
      if(dd<=2)s+=30;else if(dd<=5)s+=20;else if(dd<=10)s+=10;
      const dist=Math.abs(num(x.plannedDistanceKm)-num(a.executedDistanceKm));
      if(dist<=.25)s+=30;else if(dist<=.75)s+=20;else if(dist<=1.5)s+=10;
      return s;
    };
    return c.slice().sort((x,y)=>score(y)-score(x))[0]||c[0];
  };

  // ---------- Views ----------
  training=function(){
    const defs=[['today','Hoje'],['week','Planejamento'],['history','Histórico'],['run','Corrida'],['activities','Academia e Pilates'],['evo','Evolução'],['templates','Modelos de corrida'],['imports','Importações']];
    if(!defs.some(x=>x[0]===state.trainTab))state.trainTab='today';
    let c=hero('TREINOS','Corrida com planejamento. Academia e Pilates entram somente como atividades executadas. A corrida pode ser feita na rua ou na esteira.')+tabs(defs,state.trainTab,'data-ttab');
    if(state.trainTab==='today')c+=trainToday();
    if(state.trainTab==='week')c+=trainWeek();
    if(state.trainTab==='history')c+=trainHistory();
    if(state.trainTab==='run')c+=trainRun();
    if(state.trainTab==='activities')c+=trainActivities();
    if(state.trainTab==='evo')c+=trainEvolution();
    if(state.trainTab==='templates')c+=trainTemplates();
    if(state.trainTab==='imports')c+=trainImports();
    return shell(c,'Treinos');
  };

  trainToday=function(){
    const list=activeVisibleRows().filter(x=>String(x.date||'')===today()).sort((a,b)=>(trainStatus(a)==='executado'?1:0)-(trainStatus(b)==='executado'?1:0));
    const planned=list.filter(isPlannedRun),done=list.filter(isExecutedActive);
    return `<div class="sectiontitle"><div><h3>Hoje</h3><span class="muted">Planejamento somente de corrida</span></div><div class="actions"><button class="btn primary" data-train-new="${today()}">+ Planejar corrida</button><button class="btn" id="newActivityTraining">+ Registrar Academia/Pilates</button></div></div>`+
      `<div class="grid smart-kpis">${card('Corridas planejadas',planned.length)}${card('Atividades executadas',done.length)}${card('Corrida',done.filter(isRun).length)}${card('Academia + Pilates',done.filter(x=>!isRun(x)).length)}</div>`+
      `<div class="today-training-list">${list.map(trainingCard).join('')||'<div class="card empty">Nenhuma atividade registrada para hoje.</div>'}</div>`;
  };

  trainWeek=function(){
    const dates=weekDates(state.trainWeekOffset);
    const all=activeVisibleRows();
    return `<div class="train-week-head"><button class="btn" id="prevTrainWeek">← Semana anterior</button><div><strong>${brDate(dates[0])} — ${brDate(dates[6])}</strong><div class="muted">DOM–SÁB • + cria planejamento de corrida</div></div><button class="btn" id="nextTrainWeek">Próxima semana →</button></div>`+
      `<div class="train-week-grid">${dates.map((date,i)=>{const list=all.filter(x=>String(x.date||'')===date&&(isPlannedRun(x)||isExecutedActive(x)));return `<section class="train-day ${date===today()?'today':''}"><div class="train-day-head"><div><span>${DAYS[i]}</span><strong>${brDate(date).slice(0,5)}</strong></div><button class="miniadd" data-train-new="${date}" title="Planejar corrida">+</button></div><div class="train-day-list">${list.map(trainingCard).join('')||'<div class="train-empty">Sem registro</div>'}</div></section>`}).join('')}</div>`+
      `<div class="sectiontitle"><h3>Resumo da semana</h3></div>${trainWeekSummary(dates)}`;
  };

  trainWeekSummary=function(dates){
    const list=activeVisibleRows().filter(x=>dates.includes(String(x.date||'')));
    const planned=list.filter(isPlannedRun),done=list.filter(isExecutedActive);
    const runs=done.filter(isRun),gym=done.filter(x=>trainModality(x)==='Academia'),pil=done.filter(x=>trainModality(x)==='Pilates');
    return `<div class="grid">${card('Corridas planejadas',planned.length,`${durationText(planned.reduce((s,x)=>s+num(x.plannedDurationMin),0))} previstos`)}${card('Corridas executadas',runs.length,`${fmt(runs.reduce((s,x)=>s+num(x.executedDistanceKm),0))} km`)}${card('Academia',gym.length,`${durationText(gym.reduce((s,x)=>s+num(x.executedDurationMin),0))}`)}${card('Pilates',pil.length,`${durationText(pil.reduce((s,x)=>s+num(x.executedDurationMin),0))}`)}</div>`;
  };

  trainHistory=function(){
    const all=activeVisibleRows().slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const mods=['all',...ACTIVE];
    const sources=['all',...new Set(all.map(x=>x.source).filter(Boolean))];
    let list=state.trainHistoryFilter==='all'?all:all.filter(x=>trainModality(x)===state.trainHistoryFilter);
    if(state.trainHistorySource!=='all')list=list.filter(x=>String(x.source||'')===state.trainHistorySource);
    return `<div class="train-toolbar"><div><h3>Histórico</h3><span class="muted">${list.length} registros • somente Corrida, Academia e Pilates</span></div><div><select id="trainHistoryFilter">${mods.map(m=>`<option value="${esc(m)}" ${state.trainHistoryFilter===m?'selected':''}>${m==='all'?'Todas as modalidades':esc(m)}</option>`).join('')}</select><select id="trainHistorySource">${sources.map(m=>`<option value="${esc(m)}" ${state.trainHistorySource===m?'selected':''}>${m==='all'?'Todas as origens':esc(m)}</option>`).join('')}</select><button class="btn primary" id="newTraining">+ Registrar atividade</button></div></div>`+
      `<div class="train-history-list">${list.map(x=>`<article class="train-history-card"><div><span class="body-kicker">${brDate(x.date)} • ${esc(x.source||'Manual')}</span><h3>${esc(x.workoutName||trainModality(x))}</h3><div class="train-stats"><span>${durationText(trainDuration(x))}</span>${trainDistance(x)?`<span>${fmt(trainDistance(x))} km</span>`:''}${trainPace(x)?`<span>${paceText(trainPace(x))}</span>`:''}${num(x.avgHr)?`<span>FC ${fmt(x.avgHr)} bpm</span>`:''}${num(x.calories)?`<span>${fmt(x.calories)} kcal</span>`:''}${isRun(x)&&trainingBlocks(x.id).length?`<span>${trainingBlocks(x.id).length} etapas</span>`:''}</div></div><div class="train-history-actions"><span class="pill ${trainStatus(x)==='executado'?'done':''}">${esc(trainStatus(x)==='executado'?'Executado':'Planejado')}</span>${isRun(x)?`<button class="btn" data-save-template="${esc(x.id||'')}">Salvar como modelo</button>`:''}<button class="btn" data-train-edit="${esc(x.id||'')}">Detalhes</button></div></article>`).join('')||'<div class="card empty">Nenhuma atividade registrada.</div>'}</div>`;
  };

  trainRun=function(){
    const runs=activeVisibleRows().filter(isRun).sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const planned=runs.filter(isPlannedRun),done=runs.filter(isExecutedActive);
    const renderRun=x=>`<article class="run-card"><div class="body-card-head"><div><span class="body-kicker">${brDate(x.date)}${trainStatus(x)==='executado'&&x.environment?` • ${esc(x.environment)}`:''}</span><h3>${esc(x.workoutName||'Corrida')}</h3><small class="muted">${esc([x.objective,x.source].filter(Boolean).join(' • '))}</small></div><button class="btn" data-train-edit="${esc(x.id||'')}">Editar</button></div>${plannedExecutedSummary(x)}${trainStatus(x)==='executado'?`<div class="run-kpis"><div><span>Ambiente</span><strong>${esc(x.environment||'—')}</strong></div><div><span>FC média</span><strong>${num(x.avgHr)?fmt(x.avgHr)+' bpm':'—'}</strong></div><div><span>FC máxima</span><strong>${num(x.maxHr)?fmt(x.maxHr)+' bpm':'—'}</strong></div><div><span>Calorias</span><strong>${num(x.calories)?fmt(x.calories)+' kcal':'—'}</strong></div><div><span>Cadência</span><strong>${num(x.cadenceAvg)?fmt(x.cadenceAvg):'—'}</strong></div><div><span>Esteira</span><strong>${x.environment==='Esteira'&&num(x.treadmillSpeedKmh)?fmt(x.treadmillSpeedKmh)+' km/h':'—'}</strong></div></div>`:''}${runBlockCards(x.id)}</article>`;
    return `<div class="sectiontitle"><div><h3>Corrida</h3><span class="muted">O ambiente só é definido quando a corrida é executada.</span></div><div class="actions"><button class="btn primary" id="newPlannedRun">+ Planejar corrida</button><button class="btn" id="newRunTraining">+ Registrar corrida executada</button></div></div>`+
      `<div class="sectiontitle"><h3>Planejadas</h3><span class="muted">${planned.length}</span></div><div class="run-cards">${planned.map(renderRun).join('')||'<div class="card empty">Nenhuma corrida planejada.</div>'}</div>`+
      `<div class="sectiontitle"><h3>Executadas</h3><span class="muted">${done.length}</span></div><div class="run-cards">${done.map(renderRun).join('')||'<div class="card empty">Nenhuma corrida executada.</div>'}</div>`;
  };

  trainActivities=function(){
    const list=activeVisibleRows().filter(x=>!isRun(x)&&trainStatus(x)==='executado').sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const groups=['Academia','Pilates'];
    return `<div class="sectiontitle"><div><h3>Academia e Pilates</h3><span class="muted">Somente atividades executadas. Não existe planejamento para estas modalidades.</span></div><button class="btn primary" id="newActivityTraining">+ Registrar atividade</button></div><div class="activity-grid">${groups.map(g=>{const rr=list.filter(x=>trainModality(x)===g),latest=rr[0];return `<article class="activity-card"><span class="body-kicker">${g}</span><strong>${rr.length}</strong><span>registros</span>${latest?`<small>Último: ${brDate(latest.date)} • ${durationText(trainDuration(latest))}</small>`:'<small>Sem registros</small>'}</article>`}).join('')}</div><div class="train-history-list">${list.map(x=>`<article class="train-history-card"><div><span class="body-kicker">${brDate(x.date)} • ${esc(x.source||'Manual')}</span><h3>${esc(x.workoutName||trainModality(x))}</h3><div class="train-stats"><span>${durationText(trainDuration(x))}</span>${num(x.calories)?`<span>${fmt(x.calories)} kcal</span>`:''}${num(x.avgHr)?`<span>FC ${fmt(x.avgHr)} bpm</span>`:''}</div></div><button class="btn" data-train-edit="${esc(x.id||'')}">Detalhes</button></article>`).join('')||'<div class="card empty">Nenhuma atividade registrada.</div>'}</div>`;
  };

  trainTemplates=function(){
    const t=trainingTemplateRows().filter(x=>norm(x.modality).includes('corr'));
    return `<div class="train-toolbar"><div><h3>Modelos de corrida</h3><span class="muted">Modelos são usados somente para planejamento de corrida.</span></div></div><div class="run-cards">${t.map(x=>`<article class="run-card"><div class="body-card-head"><div><span class="body-kicker">Corrida</span><h3>${esc(x.name)}</h3><small>${esc(x.objective||'')}</small></div><span class="pill">Modelo</span></div><div class="train-stats"><span>${(()=>{try{return JSON.parse(x.blocksJson||'[]').length}catch(e){return 0}})()} etapas</span></div><div class="actions"><button class="btn primary" data-use-template="${esc(x.id)}">Usar modelo</button></div></article>`).join('')||'<div class="card empty">Nenhum modelo de corrida salvo.</div>'}</div>`;
  };

  // ---------- Modal ----------
  const modalBase=trainingModal;
  trainingModal=function(id='',preset={}){
    const existing=id?trainingRows().find(x=>String(x.id||'')===String(id)):null;
    const p={...preset};
    if(!id&&String(p.status||'').toLowerCase()==='planejado')p.modality='Corrida';
    if(!id&&!p.modality)p.modality='Academia';
    if(!id&&p.modality!=='Corrida')p.status='executado';
    modalBase(id,p);
    setTimeout(()=>{
      const mod=document.getElementById('trModality');
      const status=document.getElementById('trStatus');
      const env=document.getElementById('trEnvironment');
      if(mod){
        const current=ACTIVE.includes(mod.value)?mod.value:(ACTIVE.includes(existing?.modality)?existing.modality:(p.modality||'Academia'));
        mod.innerHTML=ACTIVE.map(m=>`<option ${m===current?'selected':''}>${m}</option>`).join('');
        mod.value=current;
      }
      if(env){
        const cur=['Rua','Esteira'].includes(env.value)?env.value:'';
        env.innerHTML=`<option value=""></option><option ${cur==='Rua'?'selected':''}>Rua</option><option ${cur==='Esteira'?'selected':''}>Esteira</option>`;
        env.value=cur;
      }
      const apply=()=>{
        const m=mod?.value||'Academia',run=m==='Corrida';
        const plannedSection=[...document.querySelectorAll('.train-modal-sections > section')].find(s=>s.querySelector('h4')?.textContent.trim()==='Planejado');
        const runFields=document.getElementById('runFields');
        const source=document.getElementById('trSource');
        if(!run){
          if(status){status.value='executado';status.disabled=true;}
          if(plannedSection)plannedSection.style.display='none';
          if(runFields)runFields.style.display='none';
          if(env?.closest('.field'))env.closest('.field').style.display='none';
          ['trTreadmillSpeed','trTreadmillIncline','trTreinusId'].forEach(k=>{const e=document.getElementById(k)?.closest('.field');if(e)e.style.display='none'});
        }else{
          if(status)status.disabled=false;
          if(runFields)runFields.style.display='';
          // Em corrida planejada, ambiente ainda não existe; na execução o usuário escolhe Rua/Esteira.
          if(env?.closest('.field'))env.closest('.field').style.display=status?.value==='executado'?'':'none';
          if(status?.value!=='executado')env.value='';
        }
        const note=document.getElementById('trainingPolicyNote1010')||document.createElement('div');
        if(!note.id){note.id='trainingPolicyNote1010';note.className='v1010-policy-note';const grid=document.querySelector('#modalback .formgrid');grid?.insertAdjacentElement('afterend',note)}
        note.innerHTML=run?'<strong>Corrida</strong><span>Você pode planejar normalmente. Rua ou Esteira é escolhida somente na execução.</span>':'<strong>Atividade executada</strong><span>Academia e Pilates não possuem planejamento no AF+.</span>';
      };
      mod?.addEventListener('change',apply);
      status?.addEventListener('change',apply);
      apply();
    },60);
  };

  const saveBase=saveTraining;
  saveTraining=async function(id=''){
    const mod=document.getElementById('trModality')?.value||'Academia';
    const status=document.getElementById('trStatus');
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v};
    if(mod!=='Corrida'){
      if(status){status.disabled=false;status.value='executado'}
      ['trPlannedDuration','trPlannedDistance','trPlannedPace','trPlannedPaceMax','trPlannedHrMin','trPlannedHrMax','trZ1','trZ2','trZ3','trZ4','trRunMin','trWalkMin','trTreadmillSpeed','trTreadmillIncline'].forEach(k=>set(k,0));
      set('trEnvironment','');
      const box=document.getElementById('treinusBlocks');if(box)box.innerHTML='';
    }else if(status?.value==='planejado'){
      set('trEnvironment','');set('trTreadmillSpeed',0);set('trTreadmillIncline',0);
    }
    return saveBase(id);
  };

  // ---------- Import review with modality correction ----------
  const importsBase=trainImports;
  trainImports=function(){
    const html=importsBase();
    // The DOM pass below adds the modality selectors because the original renderer is intentionally preserved.
    setTimeout(()=>installReviewSelectors(),0);
    return html;
  };

  async function setReviewModality(id,modality){
    const headers=rows(FILES.training,'Importacao_Atividades')[0]?.map(String)||[];
    const inbox=trainingImportInboxRows();
    const x=inbox.find(r=>String(r.id||'')===String(id));
    if(!x)return;
    x.modality=modality;
    const m=suggestedTraining(x);
    x.suggestedTrainingId=m?.id||'';
    x.matchReason=m?'corrida planejada na mesma data':'';
    x.reviewStatus='pendente';
    x.fingerprint=trainingFingerprint(x);
    await saveSheet(FILES.training,'Importacao_Atividades',toRows(inbox,headers));
    render();
  }
  function installReviewSelectors(){
    document.querySelectorAll('.import-review-card').forEach(card=>{
      const action=card.querySelector('[data-import-id]');if(!action||card.querySelector('[data-review-modality-1010]'))return;
      const id=action.dataset.importId;
      const item=trainingImportInboxRows().find(x=>String(x.id||'')===String(id));if(!item)return;
      const current=ACTIVE.includes(item.modality)?item.modality:'';
      const host=card.querySelector('.train-stats')?.parentElement||card.firstElementChild;
      const wrap=document.createElement('div');wrap.className='review-modality-1010';
      wrap.innerHTML=`<label>Modalidade<select data-review-modality-1010="${esc(id)}"><option value="" ${current?'':'selected'}>Revisar modalidade</option>${ACTIVE.map(m=>`<option ${m===current?'selected':''}>${m}</option>`).join('')}</select></label>${current?'':'<small>Escolha Corrida, Academia ou Pilates antes de salvar como novo.</small>'}`;
      host?.appendChild(wrap);
      const newBtn=card.querySelector('[data-review-choice="new"]');if(newBtn&&!current)newBtn.disabled=true;
    });
    document.querySelectorAll('[data-review-modality-1010]').forEach(s=>s.onchange=()=>setReviewModality(s.getAttribute('data-review-modality-1010'),s.value));
  }

  // ---------- Bind ----------
  const bindBase=bind;
  bind=function(){
    bindBase();
    document.getElementById('newPlannedRun')?.addEventListener('click',()=>trainingModal('',{date:today(),modality:'Corrida',status:'planejado'}));
    // Os listeners originais continuam válidos: trainingModal agora força as regras de modalidade/status.
    installReviewSelectors();
  };

  // Agenda should consider only corrida as a planning layer in future renderers that consult this helper.
  window.AFPLUS_TRAINING_FOCUS_1010={version:V,activeModalities:ACTIVE,planningModality:'Corrida',executionEnvironments:['Rua','Esteira']};
})();

window.AFPLUS_TRAINING_CONTROLLER_1122.components.push("training_focus_v1010.js");

/* ===== INTEGRADO: run_planner_v1110.js ===== */
/* AF+ Treinos v11.1.1 — Planejamento de Corrida reestruturado
   - Um único fluxo: colar Treinus -> interpretar e montar etapas -> editar -> salvar.
   - Não usa a cadeia antiga Interpretar -> Aplicar -> Salvar.
   - Grava diretamente Treinos + Blocos, preservando DADOS existente.
*/
(function(){
  'use strict';
  const previousTrainingModal = window.trainingModal;
  const previousSaveTraining = window.saveTraining;
  const previousAddTrainBlockRow = window.addTrainBlockRow;
  const RP = { active:false, id:'', parsed:[] };

  const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
  const s=v=>String(v??'');
  const h=v=>typeof esc==='function'?esc(s(v)):s(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paceDec=v=>{const z=s(v).trim();if(!z)return 0;if(z.includes(':')){const [m,sec='0']=z.split(':');return n(m)+n(sec)/60}return n(z)};
  const paceClock=v=>{v=n(v);if(!v)return '';let m=Math.floor(v),sec=Math.round((v-m)*60);if(sec===60){m++;sec=0}return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`};
  const durLow=b=>n(b?.plannedDurationMinEstimate||b?.plannedDurationMin);
  const durHigh=b=>n(b?.plannedDurationMaxEstimate||b?.plannedDurationMin);
  const distLow=b=>n(b?.plannedDistanceMinKm||b?.plannedDistanceKm);
  const distHigh=b=>n(b?.plannedDistanceMaxKm||b?.plannedDistanceKm);

  function injectStyle(){
    if(document.getElementById('runPlannerV1110Style'))return;
    const st=document.createElement('style');st.id='runPlannerV1110Style';st.textContent=`
      .rp-modal{width:min(980px,96vw)!important}.rp-headnote{margin-top:4px}.rp-section{border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:14px;background:#fff}.rp-section h4{margin:0 0 10px;font:700 15px Montserrat,system-ui}.rp-treinus textarea{width:100%;min-height:150px;border:1px solid var(--line);border-radius:12px;padding:12px;font:inherit;resize:vertical}.rp-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:10px 0}.rp-preview{background:#f7f8fc;border-radius:12px;padding:12px;min-height:44px}.rp-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.rp-summary div{background:#f7f8fc;border-radius:10px;padding:10px}.rp-summary span{display:block;font-size:11px;color:var(--muted)}.rp-summary strong{display:block;margin-top:3px}.rp-stages{display:grid;gap:10px}.rp-stage{border:1px solid var(--line);border-radius:12px;padding:12px;background:#fbfcff}.rp-stage-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}.rp-order{width:28px;height:28px;border-radius:50%;background:#eef1fb;color:var(--blue);display:grid;place-items:center;font-weight:700}.rp-stage-head select{min-width:160px}.rp-remove{margin-left:auto;border:0;background:#fff1f1;color:#a12828;border-radius:8px;width:32px;height:32px;cursor:pointer}.rp-stage-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.rp-stage-grid label,.rp-stage-notes{font-size:11px;color:var(--muted)}.rp-stage-grid input,.rp-stage-grid select,.rp-stage-notes input{display:block;width:100%;margin-top:4px;border:1px solid var(--line);border-radius:8px;padding:8px;background:#fff;color:var(--text)}.rp-actions{position:sticky;bottom:-20px;background:#fff;padding:12px 0 0;margin-top:16px;border-top:1px solid var(--line);z-index:2}.rp-status{font-size:12px;color:var(--muted);margin-right:auto}.rp-empty{padding:20px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:12px}@media(max-width:760px){.rp-summary{grid-template-columns:repeat(2,1fr)}.rp-stage-grid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(st);
  }

  function isPlannedRun(id,preset={}){
    // Edição: só intercepta corridas ainda planejadas.
    if(id){
      const x=trainingRows().find(r=>s(r.id)===s(id));
      return !!x && s(x.modality)==='Corrida' && !['executado','cancelado'].includes(s(x.status||'planejado').toLowerCase());
    }
    // Novo registro vindo do calendário/Hoje: o botão + é exclusivamente "Planejar corrida".
    // O listener legado pode enviar apenas {date}; nesse caso também devemos abrir o novo planejador.
    const mod=s(preset?.modality);
    const status=s(preset?.status||'planejado').toLowerCase();
    if(status==='executado') return false;
    if(mod && mod!=='Corrida') return false;
    return true;
  }

  function existingRun(id,preset){return (id?trainingRows().find(r=>s(r.id)===s(id)):null)||preset||{}}
  function currentBlocks(id){return id?trainingBlocks(id).map(b=>({...b})):[]}

  function stageHtml(b={},i=0){
    return `<div class="rp-stage" data-rp-stage
      data-zone="${h(b.zone||'')}" data-intensity="${h(b.intensity||'')}"
      data-speed-min="${h(b.plannedSpeedMinKmh||'')}" data-speed-max="${h(b.plannedSpeedMaxKmh||'')}"
      data-dist-min="${h(b.plannedDistanceMinKm||'')}" data-dist-max="${h(b.plannedDistanceMaxKm||'')}"
      data-repeat-group="${h(b.repeatGroup||'')}" data-repeat-index="${h(b.repeatIndex||'')}" data-repeat-count="${h(b.repeatCount||'')}"
      data-parsed="${b.parsedFromTreinus?'1':'0'}" data-duration-min-est="${h(b.plannedDurationMinEstimate||'')}" data-duration-max-est="${h(b.plannedDurationMaxEstimate||'')}"
      data-target-mode="${h(b.targetMode||'time')}" data-raw-treinus="${h(b.rawTreinus||b.raw||'')}">
      <div class="rp-stage-head"><span class="rp-order">${i+1}</span>
        <select data-rp-type><option ${b.type==='Aquecimento'?'selected':''}>Aquecimento</option><option ${b.type==='Corrida'?'selected':''}>Corrida</option><option ${b.type==='Caminhada'?'selected':''}>Caminhada</option><option ${b.type==='Recuperação'?'selected':''}>Recuperação</option><option ${b.type==='Desaquecimento'?'selected':''}>Desaquecimento</option><option ${b.type==='Outro'?'selected':''}>Outro</option></select>
        <span class="pill">${h(b.zone||'Sem zona')}</span><button type="button" class="rp-remove" data-rp-remove title="Excluir etapa">×</button></div>
      <div class="rp-stage-grid">
        <label>Tempo planejado (min)<input data-rp-min type="number" step="0.01" value="${h(b.plannedDurationMin||'')}"></label>
        <label>Distância (km)<input data-rp-km type="number" step="0.01" value="${h(b.plannedDistanceKm||'')}"></label>
        <label>Ritmo mais rápido<input data-rp-pace1 value="${h(paceClock(b.plannedPaceMinKm))}" placeholder="09:16"></label>
        <label>Ritmo mais lento<input data-rp-pace2 value="${h(paceClock(b.plannedPaceMaxMinKm))}" placeholder="10:25"></label>
      </div>
      <label class="rp-stage-notes">Observação<input data-rp-notes value="${h(b.notes||'')}"></label>
    </div>`;
  }

  function renumber(){document.querySelectorAll('#rpStages [data-rp-stage]').forEach((r,i)=>{const o=r.querySelector('.rp-order');if(o)o.textContent=String(i+1)});updateSummary()}
  function addStage(b={type:'Corrida'}){const box=document.getElementById('rpStages');if(!box)return;const empty=box.querySelector('.rp-empty');if(empty)empty.remove();box.insertAdjacentHTML('beforeend',stageHtml(b,box.querySelectorAll('[data-rp-stage]').length));renumber()}

  function readStage(row){
    const type=row.querySelector('[data-rp-type]')?.value||'Corrida';
    const p1=paceDec(row.querySelector('[data-rp-pace1]')?.value),p2=paceDec(row.querySelector('[data-rp-pace2]')?.value);
    let pmin=p1&&p2?Math.min(p1,p2):(p1||p2),pmax=p1&&p2?Math.max(p1,p2):(p1||p2);
    const min=n(row.querySelector('[data-rp-min]')?.value),km=n(row.querySelector('[data-rp-km]')?.value);
    let dmin=n(row.dataset.distMin)||km,dmax=n(row.dataset.distMax)||km;
    let tmin=n(row.dataset.durationMinEst)||min,tmax=n(row.dataset.durationMaxEst)||min;
    if(km&&!dmin&&!dmax)dmin=dmax=km;if(min&&!tmin&&!tmax)tmin=tmax=min;
    return {type,plannedDurationMin:min||((tmin+tmax)/2)||tmin||tmax,plannedDistanceKm:km||((dmin+dmax)/2)||dmin||dmax,
      plannedPaceMinKm:pmin,plannedPaceMaxMinKm:pmax,notes:row.querySelector('[data-rp-notes]')?.value.trim()||'',zone:row.dataset.zone||'',intensity:row.dataset.intensity||'',
      plannedSpeedMinKmh:n(row.dataset.speedMin),plannedSpeedMaxKmh:n(row.dataset.speedMax),plannedDistanceMinKm:dmin,plannedDistanceMaxKm:dmax,
      repeatGroup:row.dataset.repeatGroup||'',repeatIndex:n(row.dataset.repeatIndex),repeatCount:n(row.dataset.repeatCount),parsedFromTreinus:row.dataset.parsed==='1',
      plannedDurationMinEstimate:tmin,plannedDurationMaxEstimate:tmax,targetMode:row.dataset.targetMode||'time',rawTreinus:row.dataset.rawTreinus||''};
  }

  function allStages(){return [...document.querySelectorAll('#rpStages [data-rp-stage]')].map(readStage)}
  function totals(bs){
    return bs.reduce((a,b)=>{const lo=durLow(b),hi=durHigh(b),dl=distLow(b),dh=distHigh(b),mid=(lo+hi)/2||lo||hi||n(b.plannedDurationMin);a.tmin+=lo||n(b.plannedDurationMin);a.tmax+=hi||n(b.plannedDurationMin);a.dmin+=dl||n(b.plannedDistanceKm);a.dmax+=dh||n(b.plannedDistanceKm);if(s(b.zone).toUpperCase()==='Z1')a.z1+=mid;if(s(b.zone).toUpperCase()==='Z2')a.z2+=mid;if(s(b.zone).toUpperCase()==='Z3')a.z3+=mid;if(s(b.zone).toUpperCase()==='Z4')a.z4+=mid;if(s(b.type).toLowerCase().includes('caminh'))a.walk+=mid;else if(['corrida','aquecimento','desaquecimento','recuperação'].includes(s(b.type).toLowerCase()))a.run+=mid;return a},{tmin:0,tmax:0,dmin:0,dmax:0,z1:0,z2:0,z3:0,z4:0,run:0,walk:0});
  }
  function minLabel(v){v=n(v);if(!v)return '0 min';const sec=Math.round(v*60),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),ss=sec%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`:`${m}:${String(ss).padStart(2,'0')}`}
  function rangeLabel(a,b,unit=''){a=n(a);b=n(b);if(!a&&!b)return '—';if(!a)a=b;if(!b)b=a;return Math.abs(a-b)<.01?`${fmt(a)}${unit}`:`${fmt(Math.min(a,b))}–${fmt(Math.max(a,b))}${unit}`}
  function updateSummary(){const box=document.getElementById('rpSummary');if(!box)return;const bs=allStages(),t=totals(bs);box.innerHTML=`<div><span>Etapas</span><strong>${bs.length}</strong></div><div><span>Tempo estimado</span><strong>${t.tmin||t.tmax?`${minLabel(t.tmin)}${Math.abs(t.tmax-t.tmin)>.01?' – '+minLabel(t.tmax):''}`:'—'}</strong></div><div><span>Distância</span><strong>${rangeLabel(t.dmin,t.dmax,' km')}</strong></div><div><span>Caminhada</span><strong>${minLabel(t.walk)}</strong></div>`}

  function previewParsed(bs){
    const t=totals(bs);return `<div class="rp-summary"><div><span>Etapas reconhecidas</span><strong>${bs.length}</strong></div><div><span>Tempo</span><strong>${t.tmin||t.tmax?`${minLabel(t.tmin)}${Math.abs(t.tmax-t.tmin)>.01?' – '+minLabel(t.tmax):''}`:'—'}</strong></div><div><span>Distância</span><strong>${rangeLabel(t.dmin,t.dmax,' km')}</strong></div><div><span>Caminhada</span><strong>${minLabel(t.walk)}</strong></div></div><div class="muted">${bs.map((b,i)=>`${i+1}. ${h(b.type)}${b.zone?' '+h(b.zone):''}`).join(' • ')}</div>`;
  }

  function interpretAndBuild(){
    const btn=document.getElementById('rpInterpret'),text=document.getElementById('rpTreinus')?.value||'',preview=document.getElementById('rpPreview');
    if(!text.trim()){toast('Cole o treino do Treinus primeiro');return}
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Interpretando...'}
    try{
      if(typeof parseTreinusText!=='function')throw new Error('Parser do Treinus não carregado');
      const parsed=parseTreinusText(text)||[];RP.parsed=parsed.map(x=>({...x}));
      if(!RP.parsed.length){if(preview)preview.innerHTML='<span class="muted">Nenhuma etapa foi reconhecida. Revise o texto colado.</span>';toast('Nenhuma etapa reconhecida');return}
      if(preview)preview.innerHTML=previewParsed(RP.parsed);
      const box=document.getElementById('rpStages');if(box){box.innerHTML=RP.parsed.map(stageHtml).join('');renumber()}
      const src=document.getElementById('rpSource');if(src)src.value='Treinus';
      toast(`${RP.parsed.length} etapas montadas`);
    }catch(err){console.error('Run Planner 11.1.1 interpret:',err);if(preview)preview.innerHTML='<span class="muted">Não foi possível interpretar este texto.</span>';toast('Erro ao interpretar o Treinus')}
    finally{if(btn){btn.disabled=false;btn.textContent=old||'Interpretar e montar etapas'}}
  }

  function plannerModal(id='',preset={}){
    injectStyle();RP.active=true;RP.id=id||'';RP.parsed=[];
    const x=existingRun(id,preset),bs=currentBlocks(id);
    state.modal=`<div class="modalhead"><div><h3>${id?'Editar planejamento de corrida':'Planejar corrida'}</h3><div class="muted rp-headnote">Fluxo simples: dados → Treinus/etapas → salvar.</div></div><button class="x" data-close>×</button></div>
      <div class="rp-section"><h4>1. Dados da corrida</h4><div class="formgrid"><div class="field"><label>Data</label><input id="rpDate" type="date" value="${h(x.date||today())}"></div><div class="field"><label>Nome do treino</label><input id="rpName" value="${h(x.workoutName||'')}"></div><div class="field"><label>Objetivo</label><input id="rpObjective" value="${h(x.objective||'')}"></div><div class="field"><label>Origem</label><select id="rpSource"><option ${s(x.source)==='Manual'?'selected':''}>Manual</option><option ${s(x.source)==='Treinus'?'selected':''}>Treinus</option></select></div><div class="field"><label>ID Treinus (opcional)</label><input id="rpTreinusId" value="${h(x.treinusId||'')}"></div></div></div>
      <div class="rp-section rp-treinus"><h4>2. Importar do Treinus</h4><textarea id="rpTreinus" placeholder="Cole aqui o texto completo do treino do Treinus"></textarea><div class="rp-toolbar"><span class="muted">O botão já interpreta e monta as etapas. Não existe mais a etapa Aplicar.</span><button type="button" class="btn primary" id="rpInterpret">Interpretar e montar etapas</button></div><div id="rpPreview" class="rp-preview"><span class="muted">A prévia aparecerá aqui.</span></div></div>
      <div class="rp-section"><div class="rp-toolbar"><div><h4 style="margin:0">3. Etapas do treino</h4><span class="muted">Edite antes de salvar, se necessário.</span></div><div><button type="button" class="btn" id="rpAddWalk">+ Caminhada 10:26–12:30</button> <button type="button" class="btn primary" id="rpAddStage">+ Etapa</button></div></div><div id="rpSummary" class="rp-summary"></div><div id="rpStages" class="rp-stages">${bs.length?bs.map(stageHtml).join(''):'<div class="rp-empty">Nenhuma etapa ainda. Cole o Treinus ou adicione uma etapa manualmente.</div>'}</div></div>
      <div class="rp-section"><h4>4. Observações</h4><div class="field"><input id="rpNotes" value="${h(x.notes||'')}" placeholder="Observações opcionais"></div></div>
      <div class="actions rp-actions"><span id="rpSaveStatus" class="rp-status"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="rpSave">Salvar planejamento</button></div>`;
    render();
    const modal=document.querySelector('#modalback .modal');if(modal)modal.classList.add('rp-modal');
    setTimeout(()=>{
      document.getElementById('rpInterpret')?.addEventListener('click',interpretAndBuild);
      document.getElementById('rpAddStage')?.addEventListener('click',()=>addStage({type:'Corrida'}));
      document.getElementById('rpAddWalk')?.addEventListener('click',()=>addStage({type:'Caminhada',plannedPaceMinKm:10+26/60,plannedPaceMaxMinKm:12.5,plannedSpeedMinKmh:4.8,plannedSpeedMaxKmh:60/(10+26/60)}));
      document.getElementById('rpStages')?.addEventListener('click',e=>{const b=e.target.closest('[data-rp-remove]');if(!b)return;b.closest('[data-rp-stage]')?.remove();const box=document.getElementById('rpStages');if(box&&!box.querySelector('[data-rp-stage]'))box.innerHTML='<div class="rp-empty">Nenhuma etapa ainda.</div>';renumber()});
      document.getElementById('rpStages')?.addEventListener('input',updateSummary);
      document.getElementById('rpStages')?.addEventListener('change',updateSummary);
      document.getElementById('rpSave')?.addEventListener('click',()=>savePlanner(id));
      updateSummary();
    },0);
  }

  async function savePlanner(id=''){
    const btn=document.getElementById('rpSave'),status=document.getElementById('rpSaveStatus');
    const bs=allStages();if(!bs.length){toast('Adicione pelo menos 1 etapa à corrida');return}
    const date=document.getElementById('rpDate')?.value;if(!date){toast('Informe a data');return}
    const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Salvando...'}if(status)status.textContent='Gravando planejamento e etapas...';
    try{
      const trainHeaders=rows(FILES.training,'Treinos')[0]?.map(String)||[];
      const blockHeaders=rows(FILES.training,'Blocos')[0]?.map(String)||[];
      const all=trainingRows();let x=id?all.find(r=>s(r.id)===s(id)):null;
      if(!x){x={id:'tr-'+Date.now(),userId:'local',createdAt:new Date().toISOString()};all.push(x)}
      const t=totals(bs),avgDur=((t.tmin+t.tmax)/2)||t.tmin||t.tmax,avgDist=((t.dmin+t.dmax)/2)||t.dmin||t.dmax;
      Object.assign(x,{date,weekday:DAYS[new Date(date+'T12:00:00').getDay()],modality:'Corrida',status:'planejado',source:document.getElementById('rpSource')?.value||'Manual',workoutName:document.getElementById('rpName')?.value.trim()||'',objective:document.getElementById('rpObjective')?.value.trim()||'',treinusId:document.getElementById('rpTreinusId')?.value.trim()||'',plannedDurationMin:avgDur,plannedDistanceKm:avgDist,plannedPaceMinKm:0,plannedPaceMaxMinKm:0,plannedHrMin:0,plannedHrMax:0,environment:'',treadmillSpeedKmh:0,treadmillInclinePct:0,z1Min:t.z1,z2Min:t.z2,z3Min:t.z3,z4Min:t.z4,runMin:t.run,walkMin:t.walk,notes:document.getElementById('rpNotes')?.value.trim()||'',updatedAt:new Date().toISOString()});
      x.fingerprint=trainingFingerprint(x);
      await saveSheet(FILES.training,'Treinos',toRows(all,trainHeaders));
      const keep=trainingBlockRows().filter(b=>s(b.trainingId)!==s(x.id));
      const blockRows=bs.map((b,i)=>({id:`blk-${x.id}-${i+1}`,trainingId:x.id,order:i+1,type:b.type,plannedDurationMin:n(b.plannedDurationMin),plannedDistanceKm:n(b.plannedDistanceKm),plannedPaceMinKm:n(b.plannedPaceMinKm),plannedPaceMaxMinKm:n(b.plannedPaceMaxMinKm),executedDurationMin:0,executedDistanceKm:0,executedPaceMinKm:0,avgHr:0,notes:b.notes||'',source:x.source||'Manual',zone:b.zone||'',intensity:b.intensity||'',plannedSpeedMinKmh:n(b.plannedSpeedMinKmh),plannedSpeedMaxKmh:n(b.plannedSpeedMaxKmh),plannedDistanceMinKm:n(b.plannedDistanceMinKm),plannedDistanceMaxKm:n(b.plannedDistanceMaxKm),repeatGroup:b.repeatGroup||'',repeatIndex:n(b.repeatIndex),repeatCount:n(b.repeatCount),parsedFromTreinus:!!b.parsedFromTreinus,plannedDurationMinEstimate:n(b.plannedDurationMinEstimate),plannedDurationMaxEstimate:n(b.plannedDurationMaxEstimate),targetMode:b.targetMode||'time',rawTreinus:b.rawTreinus||''}));
      await saveSheet(FILES.training,'Blocos',toRows(keep.concat(blockRows),blockHeaders));
      RP.active=false;RP.id='';RP.parsed=[];state.modal=null;toast('Planejamento de corrida salvo');render();
    }catch(err){console.error('Run Planner 11.1.1 save:',err);if(status)status.textContent='Não foi possível salvar.';toast('Erro ao salvar o planejamento de corrida')}
    finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent=old||'Salvar planejamento'}}
  }

  window.trainingModal=function(id='',preset={}){
    if(isPlannedRun(id,preset))return plannerModal(id,preset);
    RP.active=false;return previousTrainingModal(id,preset);
  };

  window.saveTraining=async function(id=''){
    if(RP.active)return savePlanner(id||RP.id);
    return previousSaveTraining(id);
  };

  window.addTrainBlockRow=function(b={}){
    if(RP.active&&document.getElementById('rpStages'))return addStage(b);
    return typeof previousAddTrainBlockRow==='function'?previousAddTrainBlockRow(b):undefined;
  };

  // O fluxo antigo de Aplicar deixa de participar do planejador novo.
  window.applyTreinusParsed=function(){if(RP.active){toast('No planejador novo, Interpretar já monta as etapas.');return} };
})();

window.AFPLUS_TRAINING_CONTROLLER_1122.components.push("run_planner_v1110.js");

/* ===== INTEGRADO: run_compare_cards_v1115.js ===== */
/* AF+ Treinos 11.1.5 — comparação também quando planejado e executado estão no mesmo registro */
(()=>{
  'use strict';

  const n=v=>Number(v)||0;
  const low=(a,b)=>Math.min(n(a)||Infinity,n(b)||Infinity)===Infinity?0:Math.min(n(a)||Infinity,n(b)||Infinity);
  const high=(a,b)=>Math.max(n(a),n(b));

  function durClock(min){
    min=n(min); if(!min) return '—';
    let sec=Math.round(min*60), h=Math.floor(sec/3600); sec%=3600;
    const m=Math.floor(sec/60), s=sec%60;
    if(h) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return s?`${m}:${String(s).padStart(2,'0')}`:`${m} min`;
  }
  function paceClock(v){
    v=n(v); if(!v) return '—';
    let m=Math.floor(v), s=Math.round((v-m)*60); if(s===60){m++;s=0;}
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}/km`;
  }
  function rangeText(a,b,fn){
    a=n(a); b=n(b);
    if(!a&&!b) return '—';
    if(!a)a=b; if(!b)b=a;
    return Math.abs(a-b)<0.005?fn(a):`${fn(Math.min(a,b))}–${fn(Math.max(a,b))}`;
  }
  function blocksFor(x){ try{return trainingBlocks(x.id)||[];}catch(_){return [];} }
  function isRunRow(x){ return String(trainModality(x)||'').toLowerCase().includes('corr'); }
  function isDone(x){ return trainStatus(x)==='executado'; }

  function plannedStats(x){
    const bs=blocksFor(x);
    const dmins=bs.map(b=>n(b.plannedDistanceMinKm||b.plannedDistanceKm));
    const dmaxs=bs.map(b=>n(b.plannedDistanceMaxKm||b.plannedDistanceKm));
    const tmins=bs.map(b=>n(b.plannedDurationMinEstimate||b.plannedDurationMin));
    const tmaxs=bs.map(b=>n(b.plannedDurationMaxEstimate||b.plannedDurationMin));
    const pmins=bs.map(b=>n(b.plannedPaceMinKm)).filter(Boolean);
    const pmaxs=bs.map(b=>n(b.plannedPaceMaxMinKm||b.plannedPaceMinKm)).filter(Boolean);
    let dmin=dmins.reduce((s,v)=>s+v,0), dmax=dmaxs.reduce((s,v)=>s+v,0);
    let tmin=tmins.reduce((s,v)=>s+v,0), tmax=tmaxs.reduce((s,v)=>s+v,0);
    if(!dmin&&!dmax){dmin=dmax=n(x.plannedDistanceKm);}
    if(!tmin&&!tmax){tmin=tmax=n(x.plannedDurationMin);}
    const pmin=pmins.length?Math.min(...pmins):n(x.plannedPaceMinKm);
    const pmax=pmaxs.length?Math.max(...pmaxs):n(x.plannedPaceMaxMinKm||x.plannedPaceMinKm);
    const zones=[...new Set(bs.map(b=>String(b.zone||'').trim()).filter(Boolean))];
    return {bs,dmin,dmax,tmin,tmax,pmin,pmax,zones};
  }

  function plannedTitle(x){
    if(x.workoutName) return x.workoutName;
    const p=plannedStats(x);
    if(p.bs.length===1 && p.zones.length===1) return `Corrida ${p.zones[0]}`;
    if(p.bs.length>1 && p.zones.length) return `Corrida estruturada ${p.zones.join('/')}`;
    if(p.bs.length>1) return 'Corrida estruturada';
    return 'Corrida';
  }

  function scorePair(plan,done){
    if(String(plan.date||'')!==String(done.date||'')) return -9999;
    let s=100;
    const p=plannedStats(plan);
    const pd=(p.dmin+p.dmax)/2||n(plan.plannedDistanceKm);
    const dd=n(done.executedDistanceKm);
    if(pd&&dd) s-=Math.abs(pd-dd)*20;
    const pt=(p.tmin+p.tmax)/2||n(plan.plannedDurationMin);
    const dt=n(done.executedDurationMin);
    if(pt&&dt) s-=Math.abs(pt-dt)*0.5;
    return s;
  }

  function hasEmbeddedPlan(x){
    if(!x||!isRunRow(x)) return false;
    const bs=blocksFor(x);
    const hasBlockPlan=bs.some(b=>n(b.plannedDurationMin)||n(b.plannedDurationMinEstimate)||n(b.plannedDistanceKm)||n(b.plannedDistanceMinKm)||n(b.plannedPaceMinKm)||String(b.zone||'').trim());
    return hasBlockPlan||n(x.plannedDurationMin)||n(x.plannedDistanceKm)||n(x.plannedPaceMinKm)||n(x.plannedPaceMaxMinKm);
  }

  function pairRuns(rows){
    const plans=rows.filter(x=>isRunRow(x)&&!isDone(x));
    const done=rows.filter(x=>isRunRow(x)&&isDone(x));
    const used=new Set(), pairs=[];
    plans.forEach(p=>{
      let best=null,bestScore=-9999;
      done.forEach(d=>{if(used.has(d.id))return;const sc=scorePair(p,d);if(sc>bestScore){bestScore=sc;best=d;}});
      if(best&&bestScore>0){used.add(best.id);pairs.push({plan:p,done:best,sameRecord:String(p.id)===String(best.id)});}
      else pairs.push({plan:p,done:null,sameRecord:false});
    });
    done.filter(d=>!used.has(d.id)).forEach(d=>{
      // Quando uma importação é vinculada a um planejamento, o mesmo registro passa
      // de planejado para executado e mantém os campos/blocos previstos. Compare nele mesmo.
      if(hasEmbeddedPlan(d)) pairs.push({plan:d,done:d,sameRecord:true});
      else pairs.push({plan:null,done:d,sameRecord:false});
    });
    return pairs;
  }

  function cmpRange(actual,min,max,tol,labels){
    actual=n(actual); min=n(min); max=n(max);
    if(!actual||(!min&&!max)) return {state:'na',label:'Sem comparação'};
    if(!min)min=max;if(!max)max=min;
    tol=Math.max(n(tol),0);
    if(actual<min-tol) return {state:'low',label:labels.low};
    if(actual>max+tol) return {state:'high',label:labels.high};
    return {state:'ok',label:labels.ok};
  }

  function comparison(plan,done){
    if(!plan||!done) return null;
    const p=plannedStats(plan);
    const ed=n(done.executedDistanceKm), et=n(done.executedDurationMin), ep=(ed>0&&et>0)?et/ed:n(done.executedPaceMinKm);
    const distMid=(p.dmin+p.dmax)/2||p.dmin||p.dmax;
    const distTol=Math.max(.15,distMid*.02);
    const timeMid=(p.tmin+p.tmax)/2||p.tmin||p.tmax;
    const timeTol=(p.tmin===p.tmax)?Math.max(1,timeMid*.03):0;
    const paceMid=(p.pmin+p.pmax)/2||p.pmin||p.pmax;
    const paceTol=(p.pmin===p.pmax)?Math.max(.08,paceMid*.02):0;
    const distance=cmpRange(ed,p.dmin,p.dmax,distTol,{low:'Distância abaixo',high:'Distância acima',ok:'Distância dentro'});
    const time=cmpRange(et,p.tmin,p.tmax,timeTol,{low:'Tempo abaixo',high:'Tempo acima',ok:'Tempo dentro'});
    // pace menor = mais rápido; maior = mais lento
    const pace=cmpRange(ep,p.pmin,p.pmax,paceTol,{low:'Mais rápido',high:'Mais lento',ok:'Ritmo dentro'});
    const available=[distance,time,pace].filter(x=>x.state!=='na');
    const overall=available.length&&available.every(x=>x.state==='ok')?'Dentro do previsto':available.length?'Fora do previsto':'Sem comparação suficiente';
    const okCount=available.filter(x=>x.state==='ok').length;
    return {distance,time,pace,overall,availableCount:available.length,okCount};
  }

  function statusClass(c){return c==='Dentro do previsto'?'run-cmp-ok':c==='Fora do previsto'?'run-cmp-warn':'run-cmp-neutral';}
  function metricChip(c){
    if(!c||c.state==='na')return '';
    const cls=c.state==='ok'?'ok':(c.state==='low'?'low':'high');
    return `<span class="run-cmp-chip ${cls}">${esc(c.label)}</span>`;
  }

  function planLine(plan){
    if(!plan) return '<span class="muted">Sem planejamento vinculado</span>';
    const p=plannedStats(plan);
    const dmin=p.dmin||p.dmax, dmax=p.dmax||p.dmin;
    const tmin=p.tmin||p.tmax, tmax=p.tmax||p.tmin;
    const pmin=p.pmin||p.pmax, pmax=p.pmax||p.pmin;
    return `<strong class="run-plan-title">${esc(plannedTitle(plan))}</strong>
      <div class="run-plan-limits">
        <div><small>Distância mínima</small><b>${dmin?fmt(dmin)+' km':'—'}</b></div>
        <div><small>Distância máxima</small><b>${dmax?fmt(dmax)+' km':'—'}</b></div>
        <div><small>Tempo mínimo</small><b>${tmin?durClock(tmin):'—'}</b></div>
        <div><small>Tempo máximo</small><b>${tmax?durClock(tmax):'—'}</b></div>
        <div><small>Pace mínimo</small><b>${pmin?paceClock(pmin):'—'}</b></div>
        <div><small>Pace máximo</small><b>${pmax?paceClock(pmax):'—'}</b></div>
      </div>
      ${p.zones.length?`<small class="run-plan-zone">Zona: ${esc(p.zones.join(' / '))}</small>`:''}`;
  }
  function doneLine(done){
    if(!done) return '<span class="muted">Ainda não executado</span>';
    const dist=n(done.executedDistanceKm),dur=n(done.executedDurationMin),pace=(dist>0&&dur>0)?dur/dist:n(done.executedPaceMinKm);
    return `<strong>${esc(done.workoutName||'Corrida realizada')}</strong>
      <div class="run-done-metrics">
        <div><small>Distância ativa</small><b>${dist?fmt(dist)+' km':'—'}</b></div>
        <div><small>Tempo ativo</small><b>${dur?durClock(dur):'—'}</b></div>
        <div><small>Pace médio</small><b>${pace?paceClock(pace):'—'}</b></div>
      </div>${n(done.avgHr)?`<small class="run-done-hr">FC média ${fmt(done.avgHr)} bpm${n(done.maxHr)?` · máx. ${fmt(done.maxHr)} bpm`:''}</small>`:''}`;
  }

  function pairCard(pair){
    const {plan,done,sameRecord}=pair, ref=done||plan, cmp=comparison(plan,done);
    const date=ref?.date||'';
    return `<article class="run-compare-card">
      <div class="run-compare-head">
        <div><span class="body-kicker">${brDate(date)}${plan&&done?' · PLANEJADO × REALIZADO':` · ${done?'REALIZADO':'PLANEJADO'}`}</span><h3>${esc(plan?plannedTitle(plan):(done?.workoutName||'Corrida'))}</h3></div>
        ${cmp?`<span class="run-cmp-status ${statusClass(cmp.overall)}">${esc(cmp.overall)}</span>`:`<span class="pill ${done?'done':''}">${done?'Executado':'Planejado'}</span>`}
      </div>
      <div class="run-plan-real-grid">
        <div class="run-plan-real-box"><small>Previsto</small>${planLine(plan)}</div>
        <div class="run-plan-real-box"><small>Realizado</small>${doneLine(done)}</div>
      </div>
      ${cmp?`<div class="run-compare-strip"><span class="run-compare-label">Comparação</span>${metricChip(cmp.distance)}${metricChip(cmp.time)}${metricChip(cmp.pace)}<small>${cmp.okCount}/${cmp.availableCount} indicador(es) dentro</small></div>`:''}
      <div class="run-compare-actions">
        ${plan&&!sameRecord?`<button class="btn" data-train-edit="${esc(plan.id||'')}">Plano</button>`:''}
        ${done?`<button class="btn primary" data-train-edit="${esc(done.id||'')}">Detalhes${sameRecord?'':' execução'}</button>`:''}
        ${plan?`<button class="btn" data-save-template="${esc(plan.id||'')}">Salvar como modelo</button>`:''}
      </div>
    </article>`;
  }

  function standardCard(x){
    return `<article class="train-history-card"><div><span class="body-kicker">${brDate(x.date)} • ${esc(x.source||'Manual')}</span><h3>${esc(x.workoutName||trainModality(x))}</h3><div class="train-stats"><span>${durationText(trainDuration(x))}</span>${trainDistance(x)?`<span>${fmt(trainDistance(x))} km</span>`:''}${trainPace(x)?`<span>${paceText(trainPace(x))}</span>`:''}${n(x.avgHr)?`<span>FC ${fmt(x.avgHr)} bpm</span>`:''}${n(x.calories)?`<span>${fmt(x.calories)} kcal</span>`:''}</div></div><div class="train-history-actions"><span class="pill ${isDone(x)?'done':''}">${isDone(x)?'Executado':'Planejado'}</span><button class="btn" data-train-edit="${esc(x.id||'')}">Detalhes</button></div></article>`;
  }

  const oldTrainHistory=window.trainHistory;
  window.trainHistory=function(){
    const all=trainingRows().filter(x=>!String(x.archived||'').toLowerCase().includes('sim')).slice().sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const mods=['all','Corrida','Academia','Pilates'];
    const sources=['all',...new Set(all.map(x=>x.source).filter(Boolean))];
    let filtered=state.trainHistoryFilter==='all'?all:all.filter(x=>trainModality(x)===state.trainHistoryFilter);
    if(state.trainHistorySource!=='all')filtered=filtered.filter(x=>String(x.source||'')===state.trainHistorySource);

    const runRows=filtered.filter(isRunRow), otherRows=filtered.filter(x=>!isRunRow(x));
    const pairs=pairRuns(runRows).sort((a,b)=>String((b.done||b.plan)?.date||'').localeCompare(String((a.done||a.plan)?.date||'')));
    const content=[...pairs.map(pairCard),...otherRows.map(standardCard)].join('');
    return `<div class="train-toolbar"><div><h3>Histórico</h3><span class="muted">${filtered.length} registros • planejado × realizado quando houver correspondência</span></div><div><select id="trainHistoryFilter">${mods.map(m=>`<option value="${esc(m)}" ${state.trainHistoryFilter===m?'selected':''}>${m==='all'?'Todas as modalidades':esc(m)}</option>`).join('')}</select><select id="trainHistorySource">${sources.map(m=>`<option value="${esc(m)}" ${state.trainHistorySource===m?'selected':''}>${m==='all'?'Todas as origens':esc(m)}</option>`).join('')}</select><button class="btn primary" id="newTraining">+ Registrar atividade</button></div></div><div class="run-compare-list">${content||'<div class="card empty">Nenhuma atividade registrada.</div>'}</div>`;
  };
  window.AFPLUS_RUN_COMPARE_1130={plannedStats,comparison,pairRuns,planLine,doneLine,pairCard};
})();

/* AF+ Treinos v11.2.0 — editor isolado para treinos importados
   Corrige travamento ao editar atividade importada executada.
   Não passa pelo fluxo de planejamento/Treinus e não exige etapas.
*/
(function(){
  'use strict';
  const previousTrainingModal1120 = window.trainingModal;
  const n1120=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
  const s1120=v=>String(v??'');
  const h1120=v=>typeof esc==='function'?esc(s1120(v)):s1120(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isImported1120=x=>!!x && String(x.status||'').toLowerCase()==='executado' && (
    ['garmin','strava','zepp','arquivo'].includes(String(x.source||'').toLowerCase()) ||
    !!x.externalId || !!x.originalData || !!x.fingerprint || n1120(x.originalDurationMin)>0 || n1120(x.originalDistanceKm)>0
  );
  function parseDuration1120(v){
    const raw=s1120(v).trim(); if(!raw)return 0;
    if(!raw.includes(':'))return n1120(raw);
    const p=raw.split(':').map(x=>Number(x)); if(p.some(Number.isNaN))return 0;
    let sec=0;
    if(p.length===3)sec=p[0]*3600+p[1]*60+p[2];
    else if(p.length===2)sec=p[0]*60+p[1];
    else return 0;
    return sec/60;
  }
  function durationClock1120(v){
    let sec=Math.round(n1120(v)*60); if(!sec)return '';
    const h=Math.floor(sec/3600);sec%=3600;const m=Math.floor(sec/60),s=sec%60;
    return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
  }
  function paceClock1120(v){
    v=n1120(v);if(!v)return '—';let m=Math.floor(v),sec=Math.round((v-m)*60);if(sec===60){m++;sec=0}
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}/km`;
  }
  function importedPlanSummary1120(x){
    const bs=typeof trainingBlocks==='function'?trainingBlocks(x.id):[];
    const hasPlan=n1120(x.plannedDurationMin)||n1120(x.plannedDistanceKm)||bs.length;
    if(!hasPlan)return '';
    let tmin=0,tmax=0,dmin=0,dmax=0;
    bs.forEach(b=>{
      const lo=n1120(b.plannedDurationMinEstimate||b.plannedDurationMin),hi=n1120(b.plannedDurationMaxEstimate||b.plannedDurationMin);
      const dlo=n1120(b.plannedDistanceMinKm||b.plannedDistanceKm),dhi=n1120(b.plannedDistanceMaxKm||b.plannedDistanceKm);
      tmin+=lo;tmax+=hi;dmin+=dlo;dmax+=dhi;
    });
    if(!bs.length){tmin=tmax=n1120(x.plannedDurationMin);dmin=dmax=n1120(x.plannedDistanceKm)}
    return `<div class="imported-edit-plan"><strong>Planejamento vinculado</strong><span>${dmin||dmax?`${fmt(dmin||dmax)}${dmax&&Math.abs(dmax-dmin)>.005?'–'+fmt(dmax):''} km`:'—'} · ${tmin||tmax?`${durationClock1120(tmin||tmax)}${tmax&&Math.abs(tmax-tmin)>.02?'–'+durationClock1120(tmax):''}`:'—'}</span><small>O planejamento e suas etapas serão preservados. Esta tela altera somente os dados realizados.</small></div>`;
  }
  function injectStyle1120(){
    if(document.getElementById('importedEditor1120Style'))return;
    const st=document.createElement('style');st.id='importedEditor1120Style';st.textContent=`
      .imported-edit-modal{width:min(780px,96vw)!important}.imported-edit-note{background:#eef3ff;border:1px solid #cdd8f6;border-radius:12px;padding:11px 12px;margin:10px 0 14px;color:var(--text)}
      .imported-edit-note strong,.imported-edit-plan strong{display:block}.imported-edit-note span,.imported-edit-plan span{display:block;margin-top:3px;font-size:12px}.imported-edit-note small,.imported-edit-plan small{display:block;margin-top:4px;color:var(--muted)}
      .imported-edit-plan{background:#f7f8fc;border:1px solid var(--line);border-radius:12px;padding:11px 12px;margin-bottom:14px}.imported-pace-box{background:#f7f8fc;border-radius:12px;padding:12px}.imported-pace-box small{display:block;color:var(--muted)}.imported-pace-box strong{font-size:18px}.imported-save-status{margin-right:auto;font-size:12px;color:var(--muted)}
    `;document.head.appendChild(st);
  }
  function updateImportedPace1120(){
    const min=parseDuration1120(document.getElementById('impEditDuration')?.value),km=n1120(document.getElementById('impEditDistance')?.value);
    const p=min>0&&km>0?min/km:0;
    const out=document.getElementById('impEditPace');if(out)out.textContent=paceClock1120(p);
    return p;
  }
  async function saveImported1120(id){
    const x=trainingRows().find(r=>s1120(r.id)===s1120(id));if(!x){toast('Treino não encontrado');return}
    const btn=document.getElementById('impEditSave'),status=document.getElementById('impEditSaveStatus');
    const date=document.getElementById('impEditDate')?.value||x.date;
    const duration=parseDuration1120(document.getElementById('impEditDuration')?.value);
    const distance=n1120(document.getElementById('impEditDistance')?.value);
    const pace=duration>0&&distance>0?duration/distance:0;
    if(!date){toast('Informe a data');return}
    if(btn){btn.disabled=true;btn.textContent='Salvando...'} if(status)status.textContent='Gravando alterações...';
    try{
      const headers=rows(FILES.training,'Treinos')[0]?.map(String)||[];
      const all=trainingRows();const target=all.find(r=>s1120(r.id)===s1120(id));if(!target)throw new Error('Registro não encontrado');
      const origDur=n1120(target.originalDurationMin||target.executedDurationMin),origDist=n1120(target.originalDistanceKm||target.executedDistanceKm);
      Object.assign(target,{
        date,
        weekday:DAYS[new Date(date+'T12:00:00').getDay()],
        modality:document.getElementById('impEditModality')?.value||target.modality||'Corrida',
        status:'executado',
        workoutName:document.getElementById('impEditName')?.value.trim()||'',
        executedDurationMin:duration,
        executedDistanceKm:distance,
        executedPaceMinKm:pace,
        avgHr:n1120(document.getElementById('impEditAvgHr')?.value),
        maxHr:n1120(document.getElementById('impEditMaxHr')?.value),
        calories:n1120(document.getElementById('impEditCalories')?.value),
        environment:document.getElementById('impEditEnvironment')?.value||'',
        elevationM:n1120(document.getElementById('impEditElevation')?.value),
        cadenceAvg:n1120(document.getElementById('impEditCadence')?.value),
        notes:document.getElementById('impEditNotes')?.value.trim()||'',
        favorite:document.getElementById('impEditFavorite')?.value||target.favorite||'Não',
        archived:document.getElementById('impEditArchived')?.value||target.archived||'Não',
        tags:document.getElementById('impEditTags')?.value.trim()||'',
        manuallyAdjusted:(Math.abs(duration-origDur)>.0001||Math.abs(distance-origDist)>.0001),
        updatedAt:new Date().toISOString()
      });
      target.fingerprint=trainingFingerprint(target);
      await saveSheet(FILES.training,'Treinos',toRows(all,headers));
      state.modal=null;toast('Treino importado atualizado');render();
    }catch(err){console.error('Imported editor 11.2.0:',err);const msg=String(err?.message||err||'Erro ao salvar');if(status)status.textContent=msg.includes('Excel')?'Feche a planilha no Excel e tente novamente.':'Não foi possível salvar: '+msg;toast(msg.includes('Excel')?'Feche a planilha no Excel e tente novamente':'Erro ao salvar treino importado')}
    finally{if(btn&&document.body.contains(btn)){btn.disabled=false;btn.textContent='Salvar alterações'}}
  }
  function importedModal1120(x){
    injectStyle1120();
    state.modal=`<div class="modalhead"><div><h3>Editar treino importado</h3><div class="muted">Edição direta do realizado, sem passar pelo planejador de corrida.</div></div><button class="x" data-close>×</button></div>
      <div class="imported-edit-note"><strong>${h1120(x.source||'Arquivo')} · atividade importada</strong><span>Tempo e distância abaixo representam os valores ativos da atividade.</span><small>O pace é recalculado automaticamente por tempo ativo ÷ distância ativa.</small></div>
      ${importedPlanSummary1120(x)}
      <div class="formgrid">
        <div class="field"><label>Data</label><input id="impEditDate" type="date" value="${h1120(x.date||today())}"></div>
        <div class="field"><label>Modalidade</label><select id="impEditModality"><option ${x.modality==='Corrida'?'selected':''}>Corrida</option><option ${x.modality==='Academia'?'selected':''}>Academia</option><option ${x.modality==='Pilates'?'selected':''}>Pilates</option></select></div>
        <div class="field full"><label>Nome do treino</label><input id="impEditName" value="${h1120(x.workoutName||'')}" placeholder="Digite o nome do treino"><small class="muted">Você pode definir ou alterar o nome deste treino.</small></div>
        <div class="field"><label>Tempo ativo (h:mm:ss)</label><input id="impEditDuration" type="text" inputmode="numeric" value="${h1120(durationClock1120(x.executedDurationMin))}" placeholder="1:09:52"></div>
        <div class="field"><label>Distância ativa (km)</label><input id="impEditDistance" type="number" step="0.01" value="${h1120(x.executedDistanceKm||'')}"></div>
        <div class="field"><label>Pace médio calculado</label><div class="imported-pace-box"><strong id="impEditPace">${paceClock1120(n1120(x.executedDurationMin)&&n1120(x.executedDistanceKm)?n1120(x.executedDurationMin)/n1120(x.executedDistanceKm):n1120(x.executedPaceMinKm))}</strong><small>tempo ativo ÷ distância ativa</small></div></div>
        <div class="field"><label>Ambiente</label><select id="impEditEnvironment"><option value=""></option><option ${x.environment==='Rua'?'selected':''}>Rua</option><option ${x.environment==='Esteira'?'selected':''}>Esteira</option></select></div>
        <div class="field"><label>FC média</label><input id="impEditAvgHr" type="number" value="${h1120(x.avgHr||'')}"></div>
        <div class="field"><label>FC máxima</label><input id="impEditMaxHr" type="number" value="${h1120(x.maxHr||'')}"></div>
        <div class="field"><label>Calorias</label><input id="impEditCalories" type="number" value="${h1120(x.calories||'')}"></div>
        <div class="field"><label>Elevação (m)</label><input id="impEditElevation" type="number" step="1" value="${h1120(x.elevationM||'')}"></div>
        <div class="field"><label>Cadência média</label><input id="impEditCadence" type="number" step="1" value="${h1120(x.cadenceAvg||'')}"></div>
        <div class="field"><label>Favorito</label><select id="impEditFavorite"><option ${String(x.favorite)==='Sim'?'':'selected'}>Não</option><option ${String(x.favorite)==='Sim'?'selected':''}>Sim</option></select></div>
        <div class="field"><label>Arquivado</label><select id="impEditArchived"><option ${String(x.archived)==='Sim'?'':'selected'}>Não</option><option ${String(x.archived)==='Sim'?'selected':''}>Sim</option></select></div>
        <div class="field full"><label>Tags</label><input id="impEditTags" value="${h1120(x.tags||'')}"></div>
        <div class="field full"><label>Observações</label><input id="impEditNotes" value="${h1120(x.notes||'')}"></div>
      </div>
      <div class="actions" style="margin-top:16px"><span id="impEditSaveStatus" class="imported-save-status"></span><button class="btn" data-close>Cancelar</button><button class="btn primary" id="impEditSave">Salvar alterações</button></div>`;
    render();
    const modal=document.querySelector('#modalback .modal');if(modal)modal.classList.add('imported-edit-modal');
    setTimeout(()=>{
      ['impEditDuration','impEditDistance'].forEach(id=>{const el=document.getElementById(id);el?.addEventListener('input',updateImportedPace1120);el?.addEventListener('change',updateImportedPace1120)});
      document.getElementById('impEditSave')?.addEventListener('click',()=>saveImported1120(x.id));
      updateImportedPace1120();
    },0);
  }
  window.trainingModal=function(id='',preset={}){
    if(id){const x=trainingRows().find(r=>s1120(r.id)===s1120(id));if(isImported1120(x))return importedModal1120(x)}
    return previousTrainingModal1120(id,preset);
  };
  window.AFPLUS_IMPORTED_EDITOR_1130={version:'11.3.0',isImported:isImported1120,parseDuration:parseDuration1120,pace:(duration,distance)=>{const t=n1120(duration),d=n1120(distance);return t>0&&d>0?t/d:0}};
})();

window.AFPLUS_TRAINING_CONTROLLER_1122.components.push("run_compare_cards_v1115.js");

/* ===== INTEGRADO: training_audit_v1121.js ===== */
/* AF+ Treinos v11.2.1 — auditoria automática somente leitura.
   Não altera dados. Sinaliza pendências e inconsistências úteis antes de novas versões. */
(()=>{
  'use strict';
  const V='11.2.1';
  const low=v=>String(v??'').trim().toLowerCase();
  const isRun=x=>low(typeof trainModality==='function'?trainModality(x):x.modality).includes('corr');
  const isExec=x=>low(typeof trainStatus==='function'?trainStatus(x):x.status)==='executado';
  const isPlanned=x=>isRun(x)&&!['executado','cancelado'].includes(low(typeof trainStatus==='function'?trainStatus(x):x.status));
  const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
  const paceCalc=x=>{const d=n(x.executedDistanceKm),t=n(x.executedDurationMin);return d>0&&t>0?t/d:0};
  const fmtP=v=>{if(!v)return '—';let m=Math.floor(v),s=Math.round((v-m)*60);if(s===60){m++;s=0}return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}/km`};
  function audit(){
    const all=(typeof trainingRows==='function'?trainingRows():[]).filter(x=>!low(x.archived).includes('sim'));
    const todayIso=typeof today==='function'?today():new Date().toISOString().slice(0,10);
    const plannedPast=all.filter(x=>isPlanned(x)&&String(x.date||'')<todayIso);
    const unlinked=all.filter(x=>isExec(x)&&isRun(x)&&!n(x.plannedDistanceKm)&&!n(x.plannedDurationMin)&&!(typeof trainingBlocks==='function'&&trainingBlocks(x.id).length));
    const pendingImports=(typeof trainingImportInboxRows==='function'?trainingImportInboxRows():[]).filter(x=>low(x.reviewStatus||'pendente')==='pendente');
    const paceMismatch=all.filter(x=>{if(!isExec(x)||!isRun(x))return false;const c=paceCalc(x),p=n(x.executedPaceMinKm);return c&&p&&Math.abs(c-p)>(3/60)});
    const missing=all.filter(x=>{if(!isExec(x))return false;if(n(x.executedDurationMin)<=0)return true;if(isRun(x)&&n(x.executedDistanceKm)<=0)return true;return false});
    return {plannedPast,unlinked,pendingImports,paceMismatch,missing,total:plannedPast.length+unlinked.length+pendingImports.length+paceMismatch.length+missing.length};
  }
  function card(){
    const a=audit();
    const cls=a.total?'warn':'good';
    return `<section class="card af-training-audit"><div class="sectiontitle"><div><span class="body-kicker">AUDITORIA AUTOMÁTICA</span><h3>Saúde de Treinos</h3><span class="muted">Somente leitura • não altera seus registros</span></div><span class="af-status ${cls}">${a.total?`${a.total} revisar`:'OK'}</span></div><div class="grid smart-kpis">${
      typeof card==='function'?'': ''
    }<article class="card"><h3>Planejados vencidos</h3><div class="metric">${a.plannedPast.length}</div><div class="muted">sem execução/cancelamento</div></article><article class="card"><h3>Executados sem vínculo</h3><div class="metric">${a.unlinked.length}</div><div class="muted">corrida sem planejamento associado</div></article><article class="card"><h3>Imports pendentes</h3><div class="metric">${a.pendingImports.length}</div><div class="muted">na caixa de revisão</div></article><article class="card"><h3>Pace inconsistente</h3><div class="metric">${a.paceMismatch.length}</div><div class="muted">diferença &gt; 3 s/km</div></article><article class="card"><h3>Campos obrigatórios</h3><div class="metric">${a.missing.length}</div><div class="muted">tempo/distância ausente</div></article></div><div class="actions"><button class="btn" id="openTrainingAudit1121">Ver detalhes</button></div></section>`;
  }
  function details(){
    const a=audit();
    const rows=[];
    a.plannedPast.forEach(x=>rows.push(['Planejado vencido',x.date,x.workoutName||'Corrida','sem execução/cancelamento']));
    a.unlinked.forEach(x=>rows.push(['Sem vínculo',x.date,x.workoutName||'Corrida','executado sem planejamento associado']));
    a.pendingImports.forEach(x=>rows.push(['Importação',x.date,x.fileName||x.modality||'Arquivo','aguardando revisão']));
    a.paceMismatch.forEach(x=>rows.push(['Pace',x.date,x.workoutName||'Corrida',`salvo ${fmtP(n(x.executedPaceMinKm))} • calculado ${fmtP(paceCalc(x))}`]));
    a.missing.forEach(x=>rows.push(['Campos',x.date,x.workoutName||x.modality||'Treino','tempo/distância obrigatório ausente']));
    state.modal=`<div class="modalhead"><div><h3>Auditoria de Treinos</h3><div class="muted">Itens detectados automaticamente. Nenhum dado é corrigido sem sua ação.</div></div><button class="x" data-close>×</button></div><div class="train-history-list">${rows.map(r=>`<article class="train-history-card"><div><span class="body-kicker">${typeof esc==='function'?esc(r[0]):r[0]} • ${typeof brDate==='function'?brDate(r[1]):r[1]}</span><h3>${typeof esc==='function'?esc(r[2]):r[2]}</h3><div class="muted">${typeof esc==='function'?esc(r[3]):r[3]}</div></div></article>`).join('')||'<div class="card empty">Nenhuma inconsistência detectada.</div>'}</div><div class="modalactions"><button class="btn primary" data-close>Fechar</button></div>`;
    render();
  }
  const prevToday=window.trainToday;
  if(typeof prevToday==='function')window.trainToday=function(){return card()+prevToday()};
  const prevBind=window.bind;
  if(typeof prevBind==='function')window.bind=function(){prevBind();document.getElementById('openTrainingAudit1121')?.addEventListener('click',details)};
  window.AFPLUS_TRAINING_AUDIT_1130={version:V,audit};
})();

window.AFPLUS_TRAINING_CONTROLLER_1122.components.push("training_audit_v1121.js");

    window.AFPLUS_TRAINING_CONTROLLER_1130.components.push("training_controller_v1122.js");
  }
})();


/* ===== AF+ TREINOS 11.3.0 · HOMOLOGAÇÃO + UX FINAL ===== */
(()=>{
  'use strict';
  const VERSION='11.3.0';
  function ensureStyle(){
    if(document.getElementById('afTraining1130Style'))return;
    const st=document.createElement('style');st.id='afTraining1130Style';st.textContent=`
      .run-plan-limits,.run-done-metrics{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:8px;margin-top:9px}
      .run-plan-limits>div,.run-done-metrics>div{background:var(--surface-2,#f7f8fc);border:1px solid var(--line,#e6e8ef);border-radius:10px;padding:9px 10px;min-width:0}
      .run-plan-limits small,.run-done-metrics small{display:block;color:var(--muted);font-size:10px;margin-bottom:3px}
      .run-plan-limits b,.run-done-metrics b{display:block;font-size:13px;white-space:nowrap}
      .run-compare-strip{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:10px;padding:10px;border-radius:11px;background:var(--surface-2,#f7f8fc)}
      .run-compare-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.55px;color:var(--muted);margin-right:2px}
      .run-compare-strip small{margin-left:auto;color:var(--muted);font-size:10px}
      .run-cmp-chip{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:800}
      .run-cmp-chip.ok{background:#e7f5ec;color:#236b43}.run-cmp-chip.low{background:#eef3ff;color:#315a9a}.run-cmp-chip.high{background:#fff1df;color:#9a5b00}
      .run-cmp-status{display:inline-flex;align-items:center;padding:6px 9px;border-radius:999px;font-size:10px;font-weight:800}.run-cmp-ok{background:#e7f5ec;color:#236b43}.run-cmp-warn{background:#fff1df;color:#9a5b00}.run-cmp-neutral{background:#f1f2f5;color:#666}
      .run-done-hr,.run-plan-zone{display:block;margin-top:8px;color:var(--muted)}
      @media(max-width:720px){.run-plan-limits,.run-done-metrics{grid-template-columns:1fr 1fr}.run-compare-strip small{width:100%;margin-left:0}}
    `;document.head.appendChild(st);
  }
  ensureStyle();

  if(typeof window.trainingCard==='function'){
    const prior=window.trainingCard;
    window.trainingCard=function(x){return String(prior(x)).replace(/\b1 etapas\b/g,'1 etapa');};
  }

  if(typeof window.trainPace==='function'){
    const prior=window.trainPace;
    window.trainPace=function(x){
      const d=Number(x&&x.executedDistanceKm)||0,t=Number(x&&x.executedDurationMin)||0;
      if(d>0&&t>0)return t/d;
      return prior(x);
    };
  }

  function purePace(durationMin,distanceKm){
    const t=Number(durationMin)||0,d=Number(distanceKm)||0;return t>0&&d>0?t/d:0;
  }
  function approx(a,b,tol=.02){return Math.abs(Number(a)-Number(b))<=tol}
  function selfTest(){
    const results=[];
    const add=(name,ok,detail='')=>results.push({name,ok:!!ok,detail});
    try{
      const sample=`Correr 7km Z2 - LEVE/MODERADO (10:25 a 09:16/km) 5,76 a 6,47km/h completar entre 1h04'53" e 1h12'53"`;
      const blocks=typeof window.parseTreinusText==='function'?window.parseTreinusText(sample):[];
      const b=blocks[0]||{};
      add('Parser Treinus reconhece 1 etapa',blocks.length===1,`etapas=${blocks.length}`);
      add('Distância prevista 7 km',approx(b.plannedDistanceKm,7,.01),String(b.plannedDistanceKm||''));
      add('Tempo mínimo previsto',approx(b.plannedDurationMinEstimate,64+53/60,.03),String(b.plannedDurationMinEstimate||''));
      add('Tempo máximo previsto',approx(b.plannedDurationMaxEstimate,72+53/60,.03),String(b.plannedDurationMaxEstimate||''));
      add('Pace mínimo 09:16',approx(b.plannedPaceMinKm,9+16/60,.02),String(b.plannedPaceMinKm||''));
      add('Pace máximo 10:25',approx(b.plannedPaceMaxMinKm,10+25/60,.02),String(b.plannedPaceMaxMinKm||''));
      const p=purePace(69+52/60,7);
      add('Pace ativo 1:09:52 ÷ 7 km',approx(p,9+58.857/60,.02),String(p));
    }catch(err){add('Execução do self-test',false,String(err&&err.message||err))}
    return {version:VERSION,ok:results.every(x=>x.ok),passed:results.filter(x=>x.ok).length,total:results.length,results};
  }
  window.AFPLUS_TRAINING_HOMOLOGATION_1130={version:VERSION,selfTest,purePace};
})();

/* ===== AF+ 12.0.3 · RANKING DE CORRIDAS =====
   Somente corridas executadas. Métricas usam distância ativa e tempo ativo.
   Pace do ranking = tempo ativo / distância ativa; nunca usa elapsed bruto. */
(()=>{
  'use strict';
  const src=(document.currentScript&&document.currentScript.src)||'';
  const afPhase=new URL(src,location.href).searchParams.get('af_phase')||'after_af_plus';
  if(afPhase!=='after_af_plus'||window.AFPLUS_RUN_RANKING_12003)return;

  const VERSION='12.0.3';
  const n=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
  const low=v=>String(v??'').trim().toLowerCase();
  const fmtNum=(v,d=1)=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
  const paceClock=v=>{if(!(v>0))return '—';let m=Math.floor(v),s=Math.round((v-m)*60);if(s===60){m++;s=0}return `${m}:${String(s).padStart(2,'0')}/km`};
  const durationLong=min=>{const sec=Math.round(n(min)*60),h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h?`${h}h ${String(m).padStart(2,'0')}min`:`${m} min`};
  const escR=v=>typeof esc==='function'?esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const br=v=>typeof brDate==='function'?brDate(v):String(v||'');
  const nowParts=()=>{const d=new Date();return {year:d.getFullYear(),month:d.getMonth()+1,semester:d.getMonth()<6?1:2}};
  const dateParts=s=>{const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?{year:+m[1],month:+m[2],day:+m[3]}:null};
  const status=x=>low(typeof trainStatus==='function'?trainStatus(x):x.status);
  const modality=x=>low(typeof trainModality==='function'?trainModality(x):x.modality);
  const isRunR=x=>modality(x).includes('corr');
  const dist=x=>n(x.executedDistanceKm);
  const dur=x=>n(x.executedDurationMin);
  const pace=x=>dist(x)>0&&dur(x)>0?dur(x)/dist(x):0;
  const env=x=>String(x.environment||'').trim()||'Não informado';
  const allRows=()=>{
    const base=typeof activeVisibleRows==='function'?activeVisibleRows():(typeof trainingRows==='function'?trainingRows():[]);
    return base.filter(x=>isRunR(x)&&status(x)==='executado');
  };

  function defaults(){
    const p=nowParts();
    if(!state.trainRankPeriod)state.trainRankPeriod='month';
    if(!state.trainRankYear)state.trainRankYear=p.year;
    if(!state.trainRankMonth)state.trainRankMonth=p.month;
    if(!state.trainRankSemester)state.trainRankSemester=p.semester;
    if(!state.trainRankEnvironment)state.trainRankEnvironment='all';
    if(!state.trainRankOrder)state.trainRankOrder='distance';
  }
  function inPeriod(x){
    const d=dateParts(x.date);if(!d)return false;
    const year=Number(state.trainRankYear);
    if(d.year!==year)return false;
    if(state.trainRankPeriod==='month')return d.month===Number(state.trainRankMonth);
    if(state.trainRankPeriod==='semester')return Number(state.trainRankSemester)===1?d.month<=6:d.month>=7;
    return true;
  }
  function filtered(){
    defaults();
    return allRows().filter(inPeriod).filter(x=>state.trainRankEnvironment==='all'||env(x)===state.trainRankEnvironment);
  }
  function summary(list){
    const valid=list.filter(x=>dist(x)>0&&dur(x)>0);
    const totalDistance=valid.reduce((s,x)=>s+dist(x),0);
    const totalDuration=valid.reduce((s,x)=>s+dur(x),0);
    const longest=valid.slice().sort((a,b)=>dist(b)-dist(a))[0]||null;
    const fastest=valid.slice().sort((a,b)=>pace(a)-pace(b))[0]||null;
    return {count:list.length,totalDistance,totalDuration,avgPace:totalDistance>0?totalDuration/totalDistance:0,longest,fastest};
  }
  function periodLabel(){
    const months=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    if(state.trainRankPeriod==='month')return `${months[Number(state.trainRankMonth)]}/${state.trainRankYear}`;
    if(state.trainRankPeriod==='semester')return `${state.trainRankSemester}º semestre/${state.trainRankYear}`;
    return String(state.trainRankYear);
  }
  function sorted(list){
    const a=list.slice();
    if(state.trainRankOrder==='pace')return a.sort((x,y)=>(pace(x)||999)-(pace(y)||999)||dist(y)-dist(x));
    if(state.trainRankOrder==='duration')return a.sort((x,y)=>dur(y)-dur(x)||dist(y)-dist(x));
    if(state.trainRankOrder==='recent')return a.sort((x,y)=>String(y.date||'').localeCompare(String(x.date||'')));
    return a.sort((x,y)=>dist(y)-dist(x)||(pace(x)||999)-(pace(y)||999));
  }
  function years(){
    const ys=[...new Set(allRows().map(x=>dateParts(x.date)?.year).filter(Boolean))];
    const cy=nowParts().year;if(!ys.includes(cy))ys.push(cy);
    return ys.sort((a,b)=>b-a);
  }
  function envs(){return [...new Set(allRows().map(env).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'pt-BR'))}

  window.trainRanking12003=function(){
    defaults();
    const list=filtered(),sum=summary(list),ranked=sorted(list),ys=years(),es=envs();
    const monthOptions=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const k=(title,value,sub='')=>`<article class="card run-rank-kpi"><span>${escR(title)}</span><strong>${escR(value)}</strong>${sub?`<small>${escR(sub)}</small>`:''}</article>`;
    return `<section class="run-ranking-wrap">
      <div class="sectiontitle"><div><span class="body-kicker">RANKING DE CORRIDAS</span><h3>${escR(periodLabel())}</h3><span class="muted">Somente corridas executadas • tempo e distância ativos</span></div></div>
      <div class="run-ranking-controls">
        <div class="run-rank-segmented">
          <button class="btn ${state.trainRankPeriod==='month'?'primary':''}" data-rank-period="month">Mensal</button>
          <button class="btn ${state.trainRankPeriod==='semester'?'primary':''}" data-rank-period="semester">Semestral</button>
          <button class="btn ${state.trainRankPeriod==='year'?'primary':''}" data-rank-period="year">Anual</button>
        </div>
        <select id="trainRankYear">${ys.map(y=>`<option value="${y}" ${Number(state.trainRankYear)===y?'selected':''}>${y}</option>`).join('')}</select>
        ${state.trainRankPeriod==='month'?`<select id="trainRankMonth">${monthOptions.map((m,i)=>`<option value="${i+1}" ${Number(state.trainRankMonth)===i+1?'selected':''}>${m}</option>`).join('')}</select>`:''}
        ${state.trainRankPeriod==='semester'?`<select id="trainRankSemester"><option value="1" ${Number(state.trainRankSemester)===1?'selected':''}>1º semestre</option><option value="2" ${Number(state.trainRankSemester)===2?'selected':''}>2º semestre</option></select>`:''}
        <select id="trainRankEnvironment"><option value="all">Todos os ambientes</option>${es.map(e=>`<option value="${escR(e)}" ${state.trainRankEnvironment===e?'selected':''}>${escR(e)}</option>`).join('')}</select>
        <select id="trainRankOrder"><option value="distance" ${state.trainRankOrder==='distance'?'selected':''}>Ranking por distância</option><option value="pace" ${state.trainRankOrder==='pace'?'selected':''}>Ranking por pace</option><option value="duration" ${state.trainRankOrder==='duration'?'selected':''}>Ranking por tempo</option><option value="recent" ${state.trainRankOrder==='recent'?'selected':''}>Mais recentes</option></select>
      </div>
      <div class="grid run-ranking-kpis">
        ${k('Total de km',`${fmtNum(sum.totalDistance,2)} km`)}
        ${k('Corridas',String(sum.count))}
        ${k('Tempo ativo',durationLong(sum.totalDuration))}
        ${k('Pace médio',paceClock(sum.avgPace),'tempo ativo ÷ distância ativa')}
        ${k('Maior distância',sum.longest?`${fmtNum(dist(sum.longest),2)} km`:'—',sum.longest?br(sum.longest.date):'')}
        ${k('Corrida mais rápida',sum.fastest?paceClock(pace(sum.fastest)):'—',sum.fastest?br(sum.fastest.date):'')}
      </div>
      <div class="sectiontitle"><div><h3>Ranking das corridas</h3><span class="muted">${ranked.length} corrida(s) no período</span></div></div>
      <div class="run-ranking-list">${ranked.map((x,i)=>`<article class="run-rank-row"><div class="run-rank-pos ${i<3?'podium':''}">${i+1}</div><div class="run-rank-main"><span class="body-kicker">${br(x.date)} • ${escR(env(x))}</span><h3>${escR(x.workoutName||'Corrida')}</h3><div class="train-stats"><span>${fmtNum(dist(x),2)} km</span><span>${durationLong(dur(x))}</span><span>${paceClock(pace(x))}</span>${n(x.avgHr)?`<span>FC ${fmtNum(x.avgHr,0)} bpm</span>`:''}${x.source?`<span>${escR(x.source)}</span>`:''}</div></div><button class="btn" data-train-edit="${escR(x.id||'')}">Detalhes</button></article>`).join('')||'<div class="card empty">Nenhuma corrida executada neste período.</div>'}</div>
    </section>`;
  };

  const prevTraining=window.training;
  window.training=function(){
    const defs=[['today','Hoje'],['week','Planejamento'],['history','Histórico'],['run','Corrida'],['ranking','Ranking'],['activities','Academia e Pilates'],['evo','Evolução'],['templates','Modelos de corrida'],['imports','Importações']];
    if(!defs.some(x=>x[0]===state.trainTab))state.trainTab='today';
    let c=hero('TREINOS','Corrida com planejamento, execução, comparação e ranking. Academia e Pilates entram somente como atividades executadas.')+tabs(defs,state.trainTab,'data-ttab');
    if(state.trainTab==='today')c+=trainToday();
    if(state.trainTab==='week')c+=trainWeek();
    if(state.trainTab==='history')c+=trainHistory();
    if(state.trainTab==='run')c+=trainRun();
    if(state.trainTab==='ranking')c+=trainRanking12003();
    if(state.trainTab==='activities')c+=trainActivities();
    if(state.trainTab==='evo')c+=trainEvolution();
    if(state.trainTab==='templates')c+=trainTemplates();
    if(state.trainTab==='imports')c+=trainImports();
    return shell(c,'Treinos');
  };

  const prevToday=window.trainToday;
  if(typeof prevToday==='function')window.trainToday=function(){
    const s=summary(allRows().filter(x=>{const d=dateParts(x.date),p=nowParts();return d&&d.year===p.year&&d.month===p.month}));
    const mini=`<section class="card run-rank-month-card"><div><span class="body-kicker">RANKING DO MÊS</span><h3>${fmtNum(s.totalDistance,2)} km em ${s.count} corrida(s)</h3><span class="muted">Pace médio ${paceClock(s.avgPace)} • ${durationLong(s.totalDuration)} ativos</span></div><button class="btn" id="openRunRanking12003">Ver ranking</button></section>`;
    return mini+prevToday();
  };

  const prevBind=window.bind;
  if(typeof prevBind==='function')window.bind=function(){
    prevBind();
    document.querySelectorAll('[data-rank-period]').forEach(b=>b.onclick=()=>{state.trainRankPeriod=b.dataset.rankPeriod;render()});
    document.getElementById('trainRankYear')?.addEventListener('change',e=>{state.trainRankYear=Number(e.target.value);render()});
    document.getElementById('trainRankMonth')?.addEventListener('change',e=>{state.trainRankMonth=Number(e.target.value);render()});
    document.getElementById('trainRankSemester')?.addEventListener('change',e=>{state.trainRankSemester=Number(e.target.value);render()});
    document.getElementById('trainRankEnvironment')?.addEventListener('change',e=>{state.trainRankEnvironment=e.target.value;render()});
    document.getElementById('trainRankOrder')?.addEventListener('change',e=>{state.trainRankOrder=e.target.value;render()});
    document.getElementById('openRunRanking12003')?.addEventListener('click',()=>{state.trainTab='ranking';render()});
  };

  const st=document.createElement('style');st.id='afRunRanking12003Style';st.textContent=`
    .run-ranking-controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0 16px}.run-ranking-controls select{min-height:38px;border:1px solid var(--line,#e2e4ec);border-radius:10px;background:var(--surface,#fff);padding:0 10px;color:inherit}.run-rank-segmented{display:flex;gap:6px;flex-wrap:wrap}.run-ranking-kpis{grid-template-columns:repeat(6,minmax(130px,1fr));margin-bottom:18px}.run-rank-kpi span{display:block;color:var(--muted);font-size:11px}.run-rank-kpi strong{display:block;font-size:20px;margin-top:5px}.run-rank-kpi small{display:block;color:var(--muted);font-size:10px;margin-top:4px}.run-ranking-list{display:grid;gap:9px}.run-rank-row{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:12px;background:var(--surface,#fff);border:1px solid var(--line,#e2e4ec);border-radius:14px;padding:12px}.run-rank-pos{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--surface-2,#f5f6fa);font-weight:800}.run-rank-pos.podium{background:#fff1df;color:#9a5b00}.run-rank-main h3{margin:3px 0 6px}.run-rank-month-card{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:14px}.run-rank-month-card h3{margin:3px 0}.run-ranking-wrap .train-stats{display:flex;gap:8px;flex-wrap:wrap}.run-ranking-wrap .train-stats span{font-size:11px;padding:4px 7px;border-radius:999px;background:var(--surface-2,#f5f6fa)}
    @media(max-width:1100px){.run-ranking-kpis{grid-template-columns:repeat(3,1fr)}}@media(max-width:720px){.run-ranking-kpis{grid-template-columns:1fr 1fr}.run-rank-row{grid-template-columns:38px minmax(0,1fr)}.run-rank-row>.btn{grid-column:2}.run-rank-month-card{align-items:flex-start;flex-direction:column}.run-ranking-controls select{width:100%}.run-rank-segmented{width:100%}.run-rank-segmented .btn{flex:1}}
  `;document.head.appendChild(st);

  window.AFPLUS_RUN_RANKING_12003={version:VERSION,summary,filtered};
})();
