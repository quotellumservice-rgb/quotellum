import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),context={};
for(const file of ['quote-core.js','estimate-core.js'])runInNewContext(readFileSync(resolve(root,'site/static',file),'utf8'),context);
const model=context.ClariroEstimate;
const base=()=>({job_name:'Fictional service job',work_type:'Consulting',hours:'4',hourly_rate:'25',materials:'100',other_cost:'0',overhead:'20',planned_price:'350',target_margin:'30',fee_percent:'2.90',fixed_fee:'0.30'});
const numeric=['hours','hourly_rate','materials','other_cost','overhead','planned_price','target_margin','fee_percent','fixed_fee'];
const decimal=(n,places)=>String(n/10n**BigInt(places))+'.'+String(n%10n**BigInt(places)).padStart(places,'0');
function units(text,places){const [whole,fraction='']=text.split('.');return BigInt(whole)*10n**BigInt(places)+BigInt(fraction.padEnd(places,'0'));}
// Independent nonnegative rational round-half-up; no engine helper is called.
const nearest=(numerator,denominator)=>(2n*numerator+denominator)/(2n*denominator);
function expected(data){
 const materials=units(data.materials,2),other=units(data.other_cost,2),overhead=units(data.overhead,2),hours=units(data.hours,4),rate=units(data.hourly_rate,2);
 const feeRate=units(data.fee_percent,2),target=units(data.target_margin,2),fixed=units(data.fixed_fee,2),planned=units(data.planned_price,2);
 const rawLabor=hours*rate,rawDelivery=(materials+other+overhead)*10000n+rawLabor;
 const labor=nearest(rawLabor,10000n),delivery=nearest(rawDelivery,10000n);
 const goal=nearest(rawDelivery+fixed*10000n,10000n-target-feeRate);
 const feesAt=price=>nearest(price*feeRate,10000n)+fixed;
 const fees=feesAt(planned),cost=delivery+fees,remaining=planned-cost;
 // Find the first cent covering rounded displayed delivery/fees independently
 // through binary search, then respect the original exact-labor nearest quote.
 const nearestCover=nearest(rawDelivery+fixed*10000n,10000n-feeRate);
 let lo=0n,hi=nearestCover>0n?nearestCover*2n:1n;
 while(hi-delivery-feesAt(hi)<0n)hi*=2n;
 while(lo<hi){const mid=(lo+hi)/2n;if(mid-delivery-feesAt(mid)>=0n)hi=mid;else lo=mid+1n;}
 const breakEven=lo>nearestCover?lo:nearestCover;
 return {goal:Number(goal),delivery:Number(delivery),labor:Number(labor),planned:Number(planned),fees:Number(fees),cost:Number(cost),remaining:Number(remaining),margin:planned?Number(remaining)/Number(planned):null,effective:hours?Number(remaining)/(Number(hours)/10000):null,breakEven:Number(breakEven),status:remaining<0n?'Price may not cover your estimated costs':planned<goal?'Review before quoting':'Strong starting point'};
}
function compare(data){const before=JSON.stringify(data),actual=model.evaluate(data),reference=expected(data);for(const [key,value] of Object.entries(reference))assert.equal(actual[key],value,key+' for '+before);assert.equal(JSON.stringify(data),before,'evaluation must preserve caller input');assert.deepEqual(JSON.parse(JSON.stringify(actual.data)),JSON.parse(JSON.stringify(data)));}

let seed=0x43a71b;
const next=max=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return BigInt(seed%max);};
for(let index=0;index<320;index++){
 const data={...base(),job_name:'Seeded fictional '+index,hours:decimal(next(3000000),4),hourly_rate:decimal(next(75000),2),materials:decimal(next(900000),2),other_cost:decimal(next(100000),2),overhead:decimal(next(200000),2),planned_price:decimal(next(25000000),2),target_margin:decimal(next(7000),2),fee_percent:decimal(next(1500),2),fixed_fee:decimal(next(501),2)};
 test('independent rational reference '+String(index+1).padStart(3,'0'),()=>compare(data));
}
test('zero cost, zero hours and zero price do not invent margin or hourly return',()=>compare({...base(),hours:'0',materials:'0',overhead:'0',other_cost:'0',fixed_fee:'0',planned_price:'0',target_margin:'0',fee_percent:'0'}));
test('fractional labor feeds the goal before displayed delivery rounding',()=>compare({...base(),hours:'0.0001',hourly_rate:'50',materials:'0',overhead:'0',fixed_fee:'0',target_margin:'60',fee_percent:'0',planned_price:'0.01'}));
test('large permitted money input and explicit loss remain exact',()=>compare({...base(),materials:'1000000000',hours:'0',overhead:'0',target_margin:'0',fee_percent:'0',planned_price:'1'}));
test('one basis point retained denominator and high fee boundary remain explicit',()=>compare({...base(),materials:'1',hours:'0',overhead:'0',fixed_fee:'0',target_margin:'0',fee_percent:'99.99',planned_price:'9999.99'}));
test('exact goal and below-goal planned prices select the correct status',()=>{const initial=model.evaluate(base());compare({...base(),planned_price:decimal(BigInt(initial.goal),2)});compare({...base(),planned_price:decimal(BigInt(initial.goal-1),2)});});
test('rejects invalid numeric values in every input field',()=>{for(const field of numeric)for(const value of ['',' ','-1','NaN','Infinity','1e3','1,000','1.','+1','1000000000.01'])assert.throws(()=>model.evaluate({...base(),[field]:value}),field+'='+value);});
test('rejects excessive precision and combined percentage boundary',()=>{for(const field of numeric)assert.throws(()=>model.evaluate({...base(),[field]:field==='hours'?'1.00001':'1.001'}));assert.throws(()=>model.evaluate({...base(),target_margin:'97.10',fee_percent:'2.90'}));assert.throws(()=>model.evaluate({...base(),target_margin:'100',fee_percent:'0'}));});
test('rejects oversized results even where individual inputs pass field limits',()=>assert.throws(()=>model.evaluate({...base(),hours:'1000000000',hourly_rate:'1000000000'})));
test('complete keys, string types and bounded job labels are required',()=>{const missing=base();delete missing.hours;for(const data of [null,[],{},missing,{...base(),extra:'unexpected'},{...base(),hours:4},{...base(),job_name:'x'.repeat(121)},{...base(),work_type:'x'.repeat(121)}])assert.throws(()=>model.validate(data));assert.equal(model.validate({...base(),job_name:'x'.repeat(120)}).job_name.length,120);});
test('a valid backup round-trips the complete calculation without changing original input',()=>{const data=base(),text=JSON.stringify({version:1,data}),restored=model.restore(text);assert.deepEqual(JSON.parse(JSON.stringify(restored)),data);restored.job_name='Changed restored copy';assert.equal(data.job_name,'Fictional service job');compare(model.restore(text));});
test('backup format rejects corrupted versions, wrong envelopes and unknown keys',()=>{const data=base();for(const value of [{version:2,data},{version:'1',data},{version:1},{version:1,data,extra:true},{version:1,data:{...data,unknown:'value'}},[1,data],null])assert.throws(()=>model.restore(JSON.stringify(value)));for(const text of ['', '{', 'null','false','1','"text"','{"version":1,"data":'])assert.throws(()=>model.restore(text));});
test('backup rejects prototype-shaped own fields without polluting other objects',()=>{const data=base();for(const key of ['__proto__','prototype','constructor']){const nested=JSON.stringify({version:1,data}).replace('"job_name":','"'+key+'":{"polluted":"yes"},"job_name":');assert.throws(()=>model.restore(nested));const envelope=JSON.stringify({version:1,data}).replace('{','{"'+key+'":{"polluted":"yes"},');assert.throws(()=>model.restore(envelope));}assert.equal({}.polluted,undefined);});
test('oversized and failed restore does not mutate the existing record',()=>{const data=base(),saved=JSON.stringify(data);for(const text of [' '.repeat(16385),JSON.stringify({version:1,data:{...data,hours:'-1'}}),'{broken']){assert.throws(()=>model.restore(text));assert.equal(JSON.stringify(data),saved);}assert.throws(()=>model.restore({version:1,data}));});
