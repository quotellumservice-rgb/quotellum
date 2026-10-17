/* Accessible local navigation only. No tracking or data submission. */
(function(){
 'use strict';
 const menu=document.querySelector('.menu-toggle');
 const nav=document.getElementById('primary-nav');
 if(!menu||!nav)return;
 document.documentElement.classList.add('js');
 function setOpen(open){menu.setAttribute('aria-expanded',String(open));nav.dataset.open=String(open);}
 menu.addEventListener('click',()=>setOpen(menu.getAttribute('aria-expanded')!=='true'));
 nav.addEventListener('focusout',event=>{if(event.relatedTarget&&!nav.contains(event.relatedTarget)&&event.relatedTarget!==menu)setOpen(false);});
 nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.getAttribute('aria-expanded')==='true'){setOpen(false);menu.focus();}});
 document.addEventListener('click',event=>{if(!nav.contains(event.target)&&!menu.contains(event.target))setOpen(false);});
})();
