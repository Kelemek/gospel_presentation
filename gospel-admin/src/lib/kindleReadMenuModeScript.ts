import {
  KINDLE_READ_MENU_MODE_STATE_KEY,
  KINDLE_READ_MENU_PANEL_ID,
  KINDLE_READ_ROOT_MENU_OPEN_CLASS,
} from '@/lib/kindleReadMenuConstants'

export {
  KINDLE_READ_MENU_MODE_STATE_KEY,
  KINDLE_READ_ROOT_MENU_OPEN_CLASS,
} from '@/lib/kindleReadMenuConstants'

/** Runs before React on profile Kindle read pages so Silk can scroll the Books list. */
export function kindleReadMenuModeScriptContent(): string {
  const stateKey = JSON.stringify(KINDLE_READ_MENU_MODE_STATE_KEY)
  const rootClass = JSON.stringify(KINDLE_READ_ROOT_MENU_OPEN_CLASS)
  const panelId = JSON.stringify(KINDLE_READ_MENU_PANEL_ID)

  return `(function(){
var SK=${stateKey},RC=${rootClass},PID=${panelId};
function st(){var w=window;if(!w[SK])w[SK]={a:0,y:0};return w[SK];}
function menuOpen(){var rt=document.querySelector('.kindle-read-root');return !!(rt&&rt.classList.contains(RC));}
function setMenuOpen(o){
  var rt=document.querySelector('.kindle-read-root');
  var btn=document.querySelector('.kindle-read-menu-trigger-btn');
  if(rt)rt.classList.toggle(RC,o);
  if(btn)btn.setAttribute('aria-expanded',o?'true':'false');
}
function sync(){
  var o=menuOpen();
  var s=st();
  if(o&&!s.a){
    s.y=window.scrollY||0;s.a=1;
    var mb=document.getElementById(PID);
    if(mb){var top=mb.getBoundingClientRect().top+(window.scrollY||0);window.scrollTo(0,top);}
    else window.scrollTo(0,0);
  }
  else if(!o&&s.a){s.a=0;window.scrollTo(0,s.y);}
}
function onTrigger(e){
  var btn=e.target&&e.target.closest&&e.target.closest('.kindle-read-menu-trigger-btn');
  if(!btn)return;
  if(e.type==='touchend'){
    btn.__krTrig=Date.now();
    e.preventDefault();
    setMenuOpen(!menuOpen());
    sync();
    return;
  }
  if(btn.__krTrig&&Date.now()-btn.__krTrig<400)return;
  e.preventDefault();
  setMenuOpen(!menuOpen());
  sync();
}
document.addEventListener('click',onTrigger,true);
document.addEventListener('touchend',onTrigger,true);
document.addEventListener('click',function(e){
  var t=e.target;
  if(t&&t.closest&&t.closest('.kindle-read-menu-section-title,.kindle-read-resources-category-name'))
    requestAnimationFrame(sync);
},true);
var mo=new MutationObserver(function(){requestAnimationFrame(sync);});
function boot(){sync();if(document.body)mo.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open','class']});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
else boot();
})();`
}
