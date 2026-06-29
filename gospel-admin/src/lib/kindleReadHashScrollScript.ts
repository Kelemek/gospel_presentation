/** Gap below sticky toolbar when correcting hash scroll (matches profile search scroll gap). */
export const KINDLE_READ_HASH_SCROLL_GAP_PX = 8

/** Scroll hash targets below the sticky read toolbar (search, TOC, map row links). */
export function kindleReadHashScrollScriptContent(): string {
  const gap = KINDLE_READ_HASH_SCROLL_GAP_PX
  return `(function(){
var GAP=${gap};
function isCardAnchor(id){return /-card-\\d+$/.test(id);}
function stickyOffset(){
  var tb=document.querySelector('.kindle-read-toolbar');
  return (tb?tb.offsetHeight:0)+GAP;
}
function scrollToId(id){
  var el=document.getElementById(id);
  if(!el)return;
  var y=el.getBoundingClientRect().top+(window.scrollY||0)-stickyOffset();
  window.scrollTo(0,Math.max(0,y));
}
function go(){
  var id=location.hash.slice(1);
  if(!id||isCardAnchor(id))return;
  scrollToId(id);
}
window.addEventListener('hashchange',go);
function boot(){
  if(!location.hash)return;
  requestAnimationFrame(function(){requestAnimationFrame(go);});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();`
}
