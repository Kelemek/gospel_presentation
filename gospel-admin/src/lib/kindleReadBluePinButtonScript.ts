/** Inline script: toggle blue pin on scripture read pages without React (Kindle Silk). */
export function kindleReadBluePinButtonScriptContent(): string {
  return `(function(){
var BP='kindle-read-blue-pins-',ACTIVE='kindle-read-pin-button--active';
function loadPins(slug){
  try{
    var raw=localStorage.getItem(BP+slug);
    if(!raw)return[];
    var o=JSON.parse(raw);
    if(!o||o.v!==1||!Array.isArray(o.pins))return[];
    return o.pins.filter(function(p){
      return p&&p.reference&&p.sectionId&&p.subsectionId;
    });
  }catch(e){return[];}
}
function savePins(slug,pins){
  try{localStorage.setItem(BP+slug,JSON.stringify({v:1,pins:pins}));}catch(e){}
}
function rowMatch(stored,entry){
  var anchor=(entry.kindleAnchor||'').trim();
  if(anchor&&stored.kindleAnchor&&stored.kindleAnchor.trim()===anchor)return true;
  return stored.reference===entry.reference&&stored.sectionId===entry.sectionId&&stored.subsectionId===entry.subsectionId;
}
function isPinned(slug,entry){
  var pins=loadPins(slug);
  for(var i=0;i<pins.length;i++){if(rowMatch(pins[i],entry))return true;}
  return false;
}
function togglePin(slug,entry){
  var pins=loadPins(slug);
  var idx=-1;
  for(var i=0;i<pins.length;i++){if(rowMatch(pins[i],entry)){idx=i;break;}}
  if(idx>=0){pins.splice(idx,1);savePins(slug,pins);return false;}
  var pin={
    id:'kindle-blue-'+Date.now()+'-'+Math.random().toString(36).slice(2,9),
    reference:entry.reference,
    sectionId:entry.sectionId,
    subsectionId:entry.subsectionId
  };
  if(entry.kindleAnchor)pin.kindleAnchor=entry.kindleAnchor;
  pins.push(pin);
  savePins(slug,pins);
  return true;
}
function syncButton(btn,entry,slug){
  var pinned=isPinned(slug,entry);
  btn.setAttribute('aria-pressed',pinned?'true':'false');
  btn.textContent=pinned?'Remove Pin':'Add Pin';
  if(pinned)btn.classList.add(ACTIVE);else btn.classList.remove(ACTIVE);
}
function wire(){
  var buttons=document.querySelectorAll('.kindle-read-blue-pin-toggle');
  for(var i=0;i<buttons.length;i++){
    var btn=buttons[i];
    var raw=btn.getAttribute('data-kindle-blue-pin');
    if(!raw)continue;
    var data;
    try{data=JSON.parse(raw);}catch(e){continue;}
    var slug=(data.from||'').trim();
    var entry={
      reference:(data.reference||'').trim(),
      sectionId:(data.sectionId||'').trim(),
      subsectionId:(data.subsectionId||'').trim(),
      kindleAnchor:(data.kindleAnchor||'').trim()
    };
    if(!slug||!entry.reference||!entry.sectionId||!entry.subsectionId)continue;
    syncButton(btn,entry,slug);
    if(btn.__krBluePinWired)continue;
    btn.__krBluePinWired=1;
    function onTap(e){
      if(e.type==='click'&&btn.__krBluePinTouch&&Date.now()-btn.__krBluePinTouch<500)return;
      if(e.type==='touchend'){
        btn.__krBluePinTouch=Date.now();
        e.preventDefault();
      }
      togglePin(slug,entry);
      syncButton(btn,entry,slug);
    }
    btn.addEventListener('click',onTap);
    btn.addEventListener('touchend',onTap,{passive:false});
  }
}
function boot(){
  wire();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);
  if(typeof window!=='undefined')window.addEventListener('load',wire);
}
boot();
})();`
}
