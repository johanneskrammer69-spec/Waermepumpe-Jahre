const DB_NAME='waermepumpe-tracker',STORE='tage';
const months=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],short=['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
let db,selectedYear=new Date().getFullYear(),selectedMonth=new Date().getMonth(),compareYear=new Date().getFullYear()-1,editing=null,records={};
const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:2});
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'date'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function allRecords(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
function put(v){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(v);r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function clearDB(){return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).clear();r.onsuccess=resolve;r.onerror=()=>reject(r.error)})}
function stats(list){let e=0,h=0,min=[],max=[];for(const x of list){e+=x.e;h+=x.h;if(x.tmin!==null)min.push(x.tmin);if(x.tmax!==null)max.push(x.tmax)}return{e,h,c:e>0?h/e:null,n:list.length,min:min.length?min.reduce((a,b)=>a+b,0)/min.length:null,max:max.length?max.reduce((a,b)=>a+b,0)/max.length:null}}
function yearRecords(){return Object.values(records).filter(x=>+x.date.slice(0,4)===selectedYear)}
function monthList(m){return yearRecords().filter(x=>+x.date.slice(5,7)===m+1).sort((a,b)=>a.date.localeCompare(b.date))}
function drawComparison(years){
const available=[...new Set([...years,selectedYear,compareYear])].sort((a,b)=>b-a);
if(!available.includes(compareYear))compareYear=available.find(y=>y!==selectedYear)??selectedYear-1;
$('compareYearSelect').innerHTML=available.map(y=>`<option value="${y}" ${y===compareYear?'selected':''}>${y}</option>`).join('');
$('compareYearSelect').onchange=()=>{compareYear=+$('compareYearSelect').value;draw()};
const a=stats(Object.values(records).filter(x=>+x.date.slice(0,4)===selectedYear));
const b=stats(Object.values(records).filter(x=>+x.date.slice(0,4)===compareYear));
$('compareHint').textContent=`Jahresvergleich ${selectedYear} gegenüber ${compareYear}.`;
$('cmpHeadA').textContent=String(selectedYear);$('cmpHeadB').textContent=String(compareYear);
$('cmpJazA').textContent=a.c===null?'–':fmt(a.c);$('cmpJazB').textContent=b.c===null?'–':fmt(b.c);
$('cmpPowerA').textContent=fmt(a.e)+' kWh';$('cmpPowerB').textContent=fmt(b.e)+' kWh';
$('cmpHeatA').textContent=fmt(a.h)+' kWh';$('cmpHeatB').textContent=fmt(b.h)+' kWh';
$('compareMonths').innerHTML=months.map((name,i)=>{
 const ca=stats(Object.values(records).filter(x=>+x.date.slice(0,4)===selectedYear&&+x.date.slice(5,7)===i+1)).c;
 const cb=stats(Object.values(records).filter(x=>+x.date.slice(0,4)===compareYear&&+x.date.slice(5,7)===i+1)).c;
 const delta=ca!==null&&cb!==null?fmt(ca-cb):'–';
 return `<tr><td>${name}</td><td>${ca===null?'–':fmt(ca)}</td><td>${cb===null?'–':fmt(cb)}</td><td>${delta}</td></tr>`;
}).join('');
}
function draw(){const all=yearRecords(),s=stats(all);$('jaz').textContent=s.c===null?'–':fmt(s.c);$('heat').textContent=fmt(s.h);$('power').textContent=fmt(s.e);$('count').textContent=s.n;
const monthly=months.map((_,i)=>stats(monthList(i))),max=Math.max(1,...monthly.map(x=>x.c||0));
$('chart').innerHTML=monthly.map((x,i)=>`<div class="barwrap"><span class="chartnum">${x.c===null?'':fmt(x.c)}</span><div class="bar ${i===selectedMonth?'selected':''}" style="height:${x.c===null?2:Math.max(3,x.c/max*65)}px"></div><span class="barlabel">${short[i]}</span></div>`).join('');
$('yearTag').textContent=selectedYear;
const years=[...new Set([new Date().getFullYear(),...Object.values(records).map(x=>+x.date.slice(0,4))])].sort((a,b)=>b-a);
$('yearSelect').innerHTML=[...new Set([...years,selectedYear])].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===selectedYear?'selected':''}>${y}</option>`).join('');
drawComparison(years);
$('months').innerHTML=short.map((x,i)=>`<button class="month ${i===selectedMonth?'active':''}" data-m="${i}">${x}</button>`).join('');
document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{selectedMonth=+b.dataset.m;clearForm();draw()});
$('yearSelect').onchange=()=>{selectedYear=+$('yearSelect').value;selectedMonth=0;clearForm();draw()};
const list=monthList(selectedMonth),m=stats(list);$('monthTitle').textContent=months[selectedMonth]+' '+selectedYear;$('monthCop').textContent=m.c===null?'–':fmt(m.c);$('monthPower').textContent=fmt(m.e)+' kWh';$('monthHeat').textContent=fmt(m.h)+' kWh';$('monthMin').textContent=m.min===null?'–':fmt(m.min)+' °C';$('monthMax').textContent=m.max===null?'–':fmt(m.max)+' °C';
$('tableCount').textContent=list.length+' Einträge';$('empty').hidden=!!list.length;
$('records').innerHTML=list.map(x=>{const avg=x.tmin!==null&&x.tmax!==null?fmt((x.tmin+x.tmax)/2):'–',cop=x.e>0?fmt(x.h/x.e):'–';return `<tr><td>${x.date.slice(8)}.${x.date.slice(5,7)}.</td><td>${avg}</td><td>${fmt(x.e)}</td><td>${fmt(x.h)}</td><td><b>${cop}</b></td><td><button class="edit" data-edit="${x.date}">✎</button></td></tr>`}).join('');
document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>loadRecord(b.dataset.edit))}
function clearForm(){editing=null;$('entryForm').reset();$('date').value=`${selectedYear}-${String(selectedMonth+1).padStart(2,'0')}-01`;$('feedback').textContent='';preview()}
function loadRecord(date){const x=records[date];editing=date;$('date').value=x.date;$('tmin').value=x.tmin??'';$('tmax').value=x.tmax??'';$('electric').value=x.e;$('thermal').value=x.h;preview();$('feedback').textContent='Eintrag geladen – Änderungen speichern überschreibt den bisherigen Wert.';window.scrollTo({top:$('entryForm').getBoundingClientRect().top+scrollY-20,behavior:'smooth'})}
function preview(){const e=+$('electric').value,h=+$('thermal').value;$('preview').textContent=e>0&&$('thermal').value!==''?'Voraussichtlicher Tages-COP: '+fmt(h/e):'Tages-COP = Wärmemenge ÷ Stromverbrauch.'}
['electric','thermal'].forEach(id=>$(id).addEventListener('input',preview));
$('entryForm').addEventListener('submit',async ev=>{ev.preventDefault();const date=$('date').value,e=+$('electric').value,h=+$('thermal').value,tmin=$('tmin').value===''?null:+$('tmin').value,tmax=$('tmax').value===''?null:+$('tmax').value;
if(!date||e<0||h<0||!Number.isFinite(e)||!Number.isFinite(h)){ $('feedback').textContent='Bitte Datum und Verbrauchswerte prüfen.';return}
if(tmin!==null&&tmax!==null&&tmin>tmax){$('feedback').textContent='Die Mindesttemperatur darf nicht über der Höchsttemperatur liegen.';return}
await put({date,e,h,tmin,tmax});records[date]={date,e,h,tmin,tmax};selectedYear=+date.slice(0,4);selectedMonth=+date.slice(5,7)-1;draw();$('feedback').textContent='✓ Eintrag dauerhaft auf diesem Gerät gespeichert.';clearForm()});
$('reset').onclick=clearForm;
$('csv').onclick=()=>{const rows=[['Datum','Temp Min °C','Temp Max °C','Temp Ø °C','Strom kWh','Wärme kWh','COP']];Object.values(records).sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>rows.push([x.date,x.tmin??'',x.tmax??'',x.tmin!==null&&x.tmax!==null?(x.tmin+x.tmax)/2:'',x.e,x.h,x.e>0?x.h/x.e:'']));download('\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n'),'Waermepumpe_COP.csv','text/csv;charset=utf-8')};
$('backup').onclick=()=>download(JSON.stringify({version:2,records:Object.values(records)},null,2),'Waermepumpe_Backup.json','application/json');
$('restore').onclick=()=>$('file').click();
$('file').onchange=async ev=>{const f=ev.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!Array.isArray(x.records)||x.records.some(r=>!/^\d{4}-\d\d-\d\d$/.test(r.date)||!Number.isFinite(r.e)||!Number.isFinite(r.h)||r.e<0||r.h<0))throw Error('Ungültige Sicherungsdatei');if(!confirm('Alle vorhandenen Tageswerte durch die Sicherung ersetzen?'))return;await clearDB();for(const r of x.records)await put(r);await refresh();alert('Backup wurde importiert.')}catch(err){alert('Import fehlgeschlagen: '+err.message)}finally{ev.target.value=''}};
function download(content,name,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function refresh(){records=Object.fromEntries((await allRecords()).map(x=>[x.date,x]));draw()}
(async()=>{try{if(!('indexedDB'in window))throw Error('IndexedDB nicht verfügbar');db=await openDB();await refresh();clearForm()}catch(e){$('feedback').textContent='Speicher konnte nicht geöffnet werden: '+e.message}})();
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
