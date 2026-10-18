/* One-job estimate model. No storage or network. */
(function(root){
 'use strict';
 const numbers=['hours','hourly_rate','materials','other_cost','overhead','planned_price','target_margin','fee_percent','fixed_fee'];
 const keys=['job_name','work_type',...numbers], money=value=>root.QuotellumMath.roundCents(value);
 function validate(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==keys.length||keys.some(k=>!Object.hasOwn(data,k)))throw Error('Use a complete Clariro estimate backup with the expected fields.');
  for(const k of keys)if(typeof data[k]!=='string'||data[k].length>120)throw Error('Invalid field: '+k);
  for(const k of numbers){const places=k==='hours'?4:2;if(!new RegExp('^\\d+(?:\\.\\d{1,'+places+'})?$').test(data[k])||Number(data[k])>1000000000)throw Error('Check '+k.replaceAll('_',' ')+': use zero or a positive number with up to '+places+' decimal places.');}
  if(Number(data.target_margin)+Number(data.fee_percent)>=100)throw Error('Your percentage goal plus the payment fee must be less than 100%.');
  return {...data};
 }
 function evaluate(raw){
  const data=validate(raw),input={...data,target_margin_percent:data.target_margin,refund_percent:'0',acquisition:'0',support:'0'};
  const goal=root.QuotellumMath.quote(input),cover=root.QuotellumMath.quote({...input,target_margin_percent:'0'}),planned=money(data.planned_price),rate=BigInt(money(data.fee_percent));
  const feeAt=p=>Number((BigInt(p)*rate+5000n)/10000n)+money(data.fixed_fee);
  let breakEven=cover.price_cents;while(breakEven-goal.delivery_cost_cents-feeAt(breakEven)<0)breakEven++;
  const fees=feeAt(planned),cost=goal.delivery_cost_cents+fees,remaining=planned-cost;
  return {data,goal:goal.price_cents,delivery:goal.delivery_cost_cents,labor:goal.labor_cents,planned,fees,cost,remaining,margin:planned?remaining/planned:null,effective:Number(data.hours)?remaining/Number(data.hours):null,breakEven,status:remaining<0?'Price may not cover your estimated costs':planned<goal.price_cents?'Review before quoting':'Strong starting point'};
 }
 function restore(text){
  if(typeof text!=='string'||text.length>16384)throw Error('Choose a JSON backup smaller than 16 KB.');
  const value=JSON.parse(text);if(!value||Array.isArray(value)||value.version!==1||Object.keys(value).sort().join(',')!=='data,version')throw Error('This is not a supported Clariro estimate backup.');
  return evaluate(value.data).data;
 }
 root.ClariroEstimate=Object.freeze({evaluate,validate,restore,keys:Object.freeze(keys),version:1});
})(globalThis);
