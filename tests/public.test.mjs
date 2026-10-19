import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,mkdtempSync,cpSync,writeFileSync,rmSync,mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { verifyPublic, publicFiles,repositoryFiles } from '../scripts/verify-public.mjs';
import { routes,resources,baseUrl } from '../scripts/site-content.mjs';

test('hosting preserves reviewed HTML download links without pretty-URL rewriting', () => {
 const config=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../netlify.toml'),'utf8');
 assert.match(config,/\[build\.processing\.html\]\s*pretty_urls\s*=\s*false/);
 const headers=readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../site/_headers'),'utf8');
 assert.match(headers,/\/starter\/Clariro-Offline-Starter\.html\s+Content-Disposition: attachment; filename="Clariro-Offline-Starter\.html"/);
});
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const context = {};
runInNewContext(readFileSync(resolve(root, 'site/static/quote-core.js'), 'utf8'), context);
const quote = overrides => context.QuotellumMath.quote({ materials: '100', hours: '4', hourly_rate: '25', overhead: '20', other_cost: '0', target_margin_percent: '30', fee_percent: '0', refund_percent: '0', fixed_fee: '0', acquisition: '0', support: '0', ...overrides });
test('default free quote independently matches $220 cost / 70% retained fraction', () => {
  const result = quote(); assert.equal(result.price_cents, 31429); assert.equal(result.delivery_cost_cents, 22000); assert.equal(result.contribution_cents, 9429); assert.equal(result.fee_cents, 0);
});
test('target margin is a revenue percentage, not a markup on cost', () => {
  const result = quote({ materials: '100', hours: '0', overhead: '0', target_margin_percent: '50' }); assert.equal(result.price_cents, 20000); assert.equal(result.contribution_cents, 10000); assert.equal(result.margin, 0.5);
});
test('half-cent labor rounds to the nearest USD cent without floating-point multiplication', () => {
  const result = quote({ materials: '0', hours: '0.005', hourly_rate: '1', overhead: '0', target_margin_percent: '0' }); assert.equal(result.price_cents, 1); assert.equal(result.labor_cents, 1); assert.equal(result.delivery_cost_cents, 1);
});
test('zero delivery and revenue produce no invented margin', () => {
  const result = quote({ materials: '0', hours: '0', overhead: '0' }); assert.equal(result.price_cents, 0); assert.equal(result.margin, null);
});
test('invalid non-finite, negative and excessive precision inputs are rejected', () => {
  for (const materials of ['-1', 'NaN', 'Infinity', '0.001', '1e9', '']) assert.throws(() => quote({ materials }));
  assert.throws(() => quote({ hours: '0.00001' })); assert.throws(() => quote({ target_margin_percent: '100' }));
});
test('only reviewed free assets and the disabled local-only controller are in the repository', () => {
  const result = verifyPublic(root); assert.equal(result.publicAssets, publicFiles.length); assert.equal(result.files, repositoryFiles.length); assert.equal(routes.length,31);
});
test('local HTML asset links and anchors resolve; sample route maps to the reviewed workbook', () => {
  for(const route of routes){
    const html=readFileSync(resolve(root,'site',route==='/'?'index.html':route.slice(1)+'/index.html'),'utf8');
    for (const [, link] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (link.startsWith('mailto:')) { assert.equal(link, 'mailto:quotellum.service@gmail.com'); continue; }
      if (link.startsWith('#')) { assert.ok(html.includes('id="' + link.slice(1) + '"')); continue; }
      if(link===baseUrl+route)continue;
      assert.ok(routes.includes(link)||link === '/sample' || publicFiles.includes(link.slice(1)), 'Unapproved link: ' + link);
    }
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
    assert.equal((html.match(/<main\b/g)||[]).length,1);
    assert.match(html,/<meta name="description" content="[^"]+">/);
    assert.ok(html.includes('<link rel="canonical" href="'+baseUrl+route+'">'));
    assert.ok(html.includes('<meta property="og:url" content="'+baseUrl+route+'">'));
    assert.match(html,/Quote Kit: not available for purchase/);assert.match(html,/Consulting platform: in development/);
    assert.equal((html.match(/<form\b/g) || []).length, route==='/free-calculator'?1:0);
  }
  assert.match(readFileSync(resolve(root, 'site/_redirects'), 'utf8'), /^\/sample \/starter\/Clariro-Starter-Pack\.xlsx 200\r?\n\/Quotellum-Quick-Quote\.xlsx \/starter\/Clariro-Starter-Pack\.xlsx 301\s*$/);
});

test('search inventory contains real public routes, with no application or commerce facades',()=>{
  const sitemap=readFileSync(resolve(root,'site/sitemap.xml'),'utf8');
  assert.equal((sitemap.match(/<url>/g)||[]).length,routes.length);
  for(const route of routes)assert.ok(sitemap.includes('<loc>'+baseUrl+route+'</loc>'));
  assert.doesNotMatch(sitemap,/\/(?:app|admin|checkout|recover)(?:<|\/)/);
  assert.match(readFileSync(resolve(root,'site/404.html'),'utf8'),/404 · Page not found/);
  const robots=readFileSync(resolve(root,'site/robots.txt'),'utf8');assert.match(robots,/Disallow: \/admin/);assert.match(robots,/sitemap.xml/);
});

test('nine resource pages contain substantive sections, audiences, review dates and honest print instructions',()=>{
  assert.equal(resources.length,9);
  for(const resource of resources){const html=readFileSync(resolve(root,'site/resources',resource.slug,'index.html'),'utf8');
    assert.ok(resource.sections.length>=4);assert.match(html,/Audience:/);assert.match(html,/Last updated:/);assert.match(html,/There is no separate downloadable asset/);
    for(const [title,text] of resource.sections){assert.ok(html.includes(title));assert.ok(text.length>100);}
  }
});

test('commerce copy stays visibly unavailable and does not invent account or waitlist flows',()=>{
  const html=readFileSync(resolve(root,'site/quote-kit/index.html'),'utf8');
  assert.match(html,/<button type="button" disabled>Clariro Quote Kit — \$15/);
  assert.match(html,/30 days/);assert.match(html,/12 calendar months/);assert.match(html,/not a certified delivery manifest/);
  for(const path of publicFiles.filter(file=>file.endsWith('.html')&&!file.startsWith('starter/'))){const text=readFileSync(resolve(root,'site',path),'utf8');assert.doesNotMatch(text,/<(?:a|form)[^>]+(?:href|action)="\/(?:app|admin|checkout|recover|signin|signup)/);}
});

test('calculator controller resets after native defaults and fails invalid input clearly',()=>{
  let fields={materials:'100',hours:'4',hourly_rate:'25',overhead:'20',other_cost:'0',target_margin:'30'};
  const listeners={},queued=[];
  const nodes=Object.fromEntries(['quote-form','price','cost','profit','margin','quote-error','comparison'].map(id=>[id,{textContent:'',children:[],replaceChildren(){this.children=[];},append(node){this.children.push(node);},addEventListener(name,fn){listeners[name]=fn;}}]));
  const sandbox={QuotellumMath:context.QuotellumMath,Intl,setTimeout:fn=>queued.push(fn),FormData:class{constructor(){return Object.entries(fields);}},document:{getElementById:id=>nodes[id],createElement:()=>({textContent:'',children:[],append(node){this.children.push(node);}})}};
  runInNewContext(readFileSync(resolve(root,'site/static/app.js'),'utf8'),sandbox);
  assert.equal(nodes.price.textContent,'$314.29');assert.equal(nodes.comparison.children.length,3);
  listeners.input();assert.equal(nodes.price.textContent,'—');assert.equal(nodes.comparison.children.length,0);
  listeners.invalid();assert.equal(nodes.price.textContent,'Unavailable');assert.match(nodes['quote-error'].textContent,/highlighted inputs/);
  fields={...fields,materials:'-1'};listeners.submit({preventDefault(){}});assert.equal(nodes.price.textContent,'Unavailable');assert.match(nodes['quote-error'].textContent,/non-negative/);
  listeners.reset();assert.equal(queued.length,1);fields={...fields,materials:'100'};queued.shift()();assert.equal(nodes.price.textContent,'$314.29');assert.equal(nodes['quote-error'].textContent,'');
});

test('guard rejects functions, private files, credentials, external endpoints and dependencies',()=>{
  const cases=[
    target=>{mkdirSync(resolve(target,'netlify/functions'),{recursive:true});writeFileSync(resolve(target,'netlify/functions/unreviewed.mjs'),'export default ()=>{}');},
    target=>writeFileSync(resolve(target,'site/Quotellum-Customer-Package.zip'),'private'),
    target=>writeFileSync(resolve(target,'site/static/navigation.js'),'const key="sk_'+'live_'+'a'.repeat(25)+'";'),
    target=>writeFileSync(resolve(target,'site/static/navigation.js'),'fetch("/api/test");'),
    target=>{const path=resolve(target,'package.json');const pkg=JSON.parse(readFileSync(path,'utf8'));pkg.dependencies={example:'1.0.0'};writeFileSync(path,JSON.stringify(pkg));},
  ];
  for(const mutate of cases){const fixture=mkdtempSync(resolve(tmpdir(),'quotellum-public-'));try{for(const file of repositoryFiles){const output=resolve(fixture,file);mkdirSync(dirname(output),{recursive:true});cpSync(resolve(root,file),output);}mutate(fixture);assert.throws(()=>verifyPublic(fixture));}finally{rmSync(fixture,{recursive:true,force:true});}}
});
test('CI checks are read-only and cannot deploy this draft', () => {
  const workflow = readFileSync(resolve(root, '.github/workflows/public-ci.yml'), 'utf8'); assert.match(workflow, /contents: read/); assert.match(workflow, /timeout-minutes: 5/);
  assert.doesNotMatch(workflow, /secrets\.|deploy|write|pull_request_target|workflow_run/);
  for (const [, ref] of workflow.matchAll(/uses:\s*([^\s#]+)/g)) assert.match(ref, /@[a-f0-9]{40}$/);
});

 test('current presentation uses Clariro while keeping the legacy mailbox and math alias',()=>{
 for(const route of routes){const text=readFileSync(resolve(root,'site',route==='/'?'index.html':route.slice(1)+'/index.html'),'utf8');assert.match(text,/<title>[^<]*Clariro Systems<\/title>/);assert.doesNotMatch(text.replaceAll('quotellum.service@gmail.com',''),/quotellum/i);assert.ok(text.includes(baseUrl+'/brand/clariro-og.png'));assert.doesNotMatch(text,/Private preview|LOCAL_WORKING_BRAND_ONLY|noindex,nofollow/);}
 assert.match(readFileSync(resolve(root,'site/quote-kit/index.html'),'utf8'),/<h1>Clariro Quote Kit/);
 assert.equal(baseUrl,'https://clariro-systems.netlify.app');
 });
