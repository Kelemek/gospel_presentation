import {
  KINDLE_READ_BLUE_PIN_CARD_CLASS,
  KINDLE_READ_YELLOW_PIN_CARD_CLASS,
} from '@/lib/kindleReadVersePinProgress'
import { KINDLE_READ_BLUE_PINS_KEY_PREFIX } from '@/lib/kindleReadBluePinStorage'
import { KINDLE_READ_LAST_CARD_KEY_PREFIX } from '@/lib/kindleReadLastCardStorage'

/** Inline script: apply yellow last-read and blue pin card classes before React (Kindle). */
export function kindleReadPinHighlightsScriptContent(): string {
  const lastPrefix = JSON.stringify(KINDLE_READ_LAST_CARD_KEY_PREFIX)
  const bluePrefix = JSON.stringify(KINDLE_READ_BLUE_PINS_KEY_PREFIX)
  const yellowClass = JSON.stringify(KINDLE_READ_YELLOW_PIN_CARD_CLASS)
  const blueClass = JSON.stringify(KINDLE_READ_BLUE_PIN_CARD_CLASS)

  return `(function(){
var LP=${lastPrefix},BP=${bluePrefix},YC=${yellowClass},BC=${blueClass};
function sectionFromSubId(subId){
  var parts=subId.split('-');
  if(parts[0]!=='section'||parts.length<3)return subId;
  return parts[0]+'-'+parts[1];
}
function lookupFromAnchor(anchor){
  if(!anchor||!/-card-\\d+$/.test(anchor))return null;
  var subId=anchor.replace(/-card-\\d+$/,'').replace(/-b-\\d+$/,'').replace(/-q-\\d+$/,'');
  if(subId.indexOf('section-')!==0)return null;
  return{sectionId:sectionFromSubId(subId),subsectionId:subId};
}
function matchesRow(stored,ref,sectionId,subsectionId){
  if(!stored||stored.reference!==ref)return false;
  if(!stored.sectionId||!stored.subsectionId)return true;
  return stored.sectionId===sectionId&&stored.subsectionId===subsectionId;
}
function matchesBluePin(pin,cardId,ref,sectionId,subsectionId){
  if(pin.kindleAnchor&&pin.kindleAnchor.trim()===cardId)return true;
  return matchesRow(pin,ref,sectionId,subsectionId);
}
function normalizeLastCard(raw){
  if(!raw||raw.v!==1)return null;
  var ref=(raw.reference||'').trim();
  if(!ref)return null;
  if(raw.sectionId&&raw.subsectionId){
    return{reference:ref,sectionId:String(raw.sectionId).trim(),subsectionId:String(raw.subsectionId).trim()};
  }
  var lu=lookupFromAnchor((raw.anchor||'').trim());
  if(!lu)return null;
  return{reference:ref,sectionId:lu.sectionId,subsectionId:lu.subsectionId};
}
function loadLastCard(slug){
  try{
    var raw=localStorage.getItem(LP+slug);
    if(!raw)return null;
    return normalizeLastCard(JSON.parse(raw));
  }catch(e){return null;}
}
function loadBluePins(slug){
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
function apply(){
  var m=location.pathname.match(/^\\/([^/]+)\\/read\\/?$/);
  if(!m||m[1]==='read')return;
  var slug=decodeURIComponent(m[1]);
  var lastCard=loadLastCard(slug);
  var bluePins=loadBluePins(slug);
  if(!lastCard&&bluePins.length===0)return;
  var cards=document.querySelectorAll('.kindle-read-scripture-card[id]');
  for(var i=0;i<cards.length;i++){
    var card=cards[i];
    var id=card.getAttribute('id');
    var lu=lookupFromAnchor(id||'');
    if(!lu)continue;
    var link=card.querySelector('a.kindle-read-scripture-link');
    var ref=link&&link.textContent?link.textContent.trim():'';
    if(!ref)continue;
    if(lastCard&&matchesRow(lastCard,ref,lu.sectionId,lu.subsectionId)){
      card.classList.add(YC);
    }
    for(var j=0;j<bluePins.length;j++){
      if(matchesBluePin(bluePins[j],id,ref,lu.sectionId,lu.subsectionId)){
        card.classList.add(BC);
        break;
      }
    }
  }
}
function boot(){
  function run(){apply();}
  function schedule(){
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);
    else setTimeout(run,0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);
  else schedule();
  window.addEventListener('load',run,{once:true});
}
boot();
})();`
}
