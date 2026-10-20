/* One explicit opt-in local record. No network or tracking. */
(function(){
 'use strict';
 const el=id=>document.getElementById(id),model=globalThis.ClariroEstimate,key='clariro.free.estimate.v1';
 const cash=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100),read=()=>Object.fromEntries(model.keys.map(k=>[k,el(k).value]));
 const outputs=['price','planned','cost','profit','margin','effective','break-even'];
 function clear(message){outputs.forEach(id=>{el(id).textContent='—';});el('quote-error').textContent=message;el('result-explanation').textContent='';el('calculation-trail').textContent='';el('result-status').textContent='More information is needed';}
 function syncCurrent(data){for(const [id,value]of [['scenario_price_0',data.planned_price],['scenario_hours_0',data.hours],['scenario_extra_0','0']]){el(id).value=value;el(id).readOnly=true;el(id).title='Follows the main estimate. Edit its inputs above.';}}
 function calculate(){try{const r=model.evaluate(read());syncCurrent(r.data);
  for(const [id,v] of Object.entries({price:r.goal,planned:r.planned,cost:r.cost,profit:r.remaining,'break-even':r.breakEven}))el(id).textContent=cash(v);
  el('margin').textContent=r.margin===null?'Not available at a zero price':(r.margin*100).toFixed(1)+'%';el('effective').textContent=r.effective===null?'Not available at zero hours':cash(r.effective);
  el('result-job').textContent=r.data.job_name||'Your service project';el('result-status').textContent=r.status;
  el('result-explanation').textContent='If your assumptions are accurate, this job may leave '+cash(r.remaining)+' after the costs you entered. Actual hours, scope and costs can change the result.';
  el('calculation-trail').textContent='Time allowance '+cash(r.labor)+' + materials '+cash(globalThis.QuotellumMath.roundCents(r.data.materials))+' + other expenses '+cash(globalThis.QuotellumMath.roundCents(r.data.other_cost))+' + business allowance '+cash(globalThis.QuotellumMath.roundCents(r.data.overhead))+' = '+cash(r.delivery)+'. Payment fees at your planned price: '+cash(r.fees)+'. '+cash(r.planned)+' − '+cash(r.cost)+' = '+cash(r.remaining)+' left.';
  el('quote-error').textContent='';return r;
 }catch(error){clear(error.message);return null;}}
 el('quote-form').addEventListener('submit',e=>{e.preventDefault();calculate();});
 const clearScenarios=()=>{[0,1,2].forEach(i=>{el('scenario_result_'+i).textContent='Inputs changed. Select Compare scenarios to update.';});};
 for(const i of [0,1,2])for(const name of ['scenario_price_','scenario_hours_','scenario_extra_'])el(name+i).addEventListener('input',()=>{el('scenario_result_'+i).textContent='Inputs changed. Select Compare scenarios to update.';});
 el('quote-form').addEventListener('input',e=>{clear('Your inputs changed. Select Calculate quote to update the result.');clearScenarios();syncCurrent(read());e.target.removeAttribute('aria-invalid');});
 el('quote-form').addEventListener('invalid',e=>{const details=e.target.closest('details');if(details)details.open=true;clear('Check the highlighted input. Use zero or a positive number within its limits.');e.target.setAttribute('aria-invalid','true');},true);
 el('quote-form').addEventListener('reset',()=>setTimeout(()=>{model.keys.forEach(k=>el(k).removeAttribute('aria-invalid'));calculate();clearScenarios();el('record-status').textContent='Example reset. Saved record unchanged until you save again.';},0));
 const status=message=>{el('record-status').textContent=message;},apply=data=>{for(const k of model.keys)el(k).value=data[k];calculate();clearScenarios();};
 el('save-record').addEventListener('click',()=>{try{const r=calculate();if(!r)return;localStorage.setItem(key,JSON.stringify({version:1,data:r.data}));status('One estimate saved on this device. A previous saved estimate was replaced.');}catch{status('Saving is blocked. You can still export a JSON backup.');}});
 el('load-record').addEventListener('click',()=>{try{const text=localStorage.getItem(key);if(!text){status('No saved estimate on this device.');return;}apply(model.restore(text));status('Saved estimate loaded.');}catch{status('Saved record unavailable or invalid. Current inputs kept.');}});
 el('forget-record').addEventListener('click',()=>{try{localStorage.removeItem(key);status('Saved estimate deleted. Current inputs unchanged.');}catch{status('This browser blocked access to saved records.');}});
 el('export-record').addEventListener('click',()=>{const r=calculate();if(!r)return;const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,data:r.data},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Clariro-One-Job-Backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Backup created. Keep it private; it is not encrypted.');});
 el('import-record').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>16384)throw Error('Choose a JSON backup smaller than 16 KB.');apply(model.restore(await file.text()));status('Backup restored. Save separately to replace the device record.');}catch(error){status('Import rejected: '+error.message+' Current inputs kept.');}finally{e.target.value='';}});
 el('compare-scenarios').addEventListener('click',()=>{try{const original=model.evaluate(read()).data;syncCurrent(original);const results=[0,1,2].map(i=>model.evaluate({...original,planned_price:el('scenario_price_'+i).value,hours:el('scenario_hours_'+i).value,other_cost:((globalThis.QuotellumMath.roundCents(original.other_cost)+globalThis.QuotellumMath.roundCents(el('scenario_extra_'+i).value))/100).toFixed(2)}));results.forEach((r,i)=>{el('scenario_result_'+i).textContent=cash(r.planned)+' price − '+cash(r.cost)+' costs = '+cash(r.remaining)+' left. '+r.status+'.';});el('scenario-error').textContent='';}catch(error){[0,1,2].forEach(i=>{el('scenario_result_'+i).textContent='Check inputs and compare again.';});el('scenario-error').textContent=error.message;}});
 calculate();
 try{if(localStorage.getItem(key)!==null)status('A saved estimate is available on this device. Select Load saved estimate to continue. Your saved inputs have not been loaded automatically.');}catch{status('Saved-record access is blocked in this browser. You can still use JSON backups.');}
})();
