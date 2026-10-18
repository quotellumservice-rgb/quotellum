import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { routes,baseUrl } from './site-content.mjs';
export const publicFiles = Object.freeze([
  ...routes.map(path=>path==='/'?'index.html':path.slice(1)+'/index.html'),
  '404.html', 'static/app.js', 'static/quote-core.js', 'static/style.css', 'static/navigation.js',
  'Quotellum-Quick-Quote.xlsx', '_redirects', '_headers', 'robots.txt', 'sitemap.xml',
]);
export const repositoryFiles = Object.freeze([
  ...publicFiles.map(file => 'site/' + file), '.github/CODEOWNERS', '.github/workflows/public-ci.yml',
  '.gitignore', 'README.md', 'netlify.toml', 'package.json', 'scripts/verify-public.mjs', 'scripts/site-content.mjs', 'scripts/generate-site.mjs', 'tests/public.test.mjs',
  'docs/WEBSITE-BUILD-PLAN.md', 'docs/PAGE-CONTENT-INVENTORY.md', 'docs/CLAIM-TO-CAPABILITY-MATRIX.md',
  'docs/USER-JOURNEY-TESTS.md', 'docs/ADMIN-JOURNEY-TESTS.md', 'docs/WEBSITE-RELEASE-REPORT.md',
  'releases/website-release-manifest.json',
]);
const freeSampleSha = 'b7ed84af43266452d33e94e8b5aaed5e2e6bcf8508cf982ada369f7388bc54ec';
function filesBelow(root, prefix = '') {
  const files = [];
  for (const name of readdirSync(resolve(root, prefix))) {
    if (!prefix && name === '.git') continue;
    const path = prefix ? prefix + '/' + name : name;
    const stat = lstatSync(resolve(root, path));
    if (stat.isSymbolicLink()) throw Error('Symlinks are not permitted in the public repository');
    if (stat.isDirectory()) files.push(...filesBelow(root, path));
    else if (stat.isFile()) files.push(path);
    else throw Error('Only regular files are permitted');
  }
  return files;
}
export function verifyPublic(root) {
  const actual = filesBelow(root).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...repositoryFiles].sort())) throw Error('Public repository file allowlist mismatch');
  const site = resolve(root, 'site');
  for (const file of publicFiles.filter(file => !file.endsWith('.xlsx'))) {
    const text = readFileSync(resolve(site, file), 'utf8');
    if (/\b(?:sk|rk)_(?:live|test)_[a-zA-Z0-9]{10,}|whsec_[a-zA-Z0-9]{10,}|gh[pousr]_[a-zA-Z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text)) throw Error('Credential-shaped text found in public asset');
    if (/\/api\/|\/\.netlify\/functions\/|\/owner\b|\/recover\b|\/purchase\b|Quotellum-(?:Customer-Package|Offline-Quote-Kit|Quote-Profit)|service_role|supabase|stripe|resend/i.test(text)) throw Error('Private product, account or commerce reference found in public asset');
  }
  const app = readFileSync(resolve(site, 'static/app.js'), 'utf8');
  if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|document\.cookie|https?:\/\//.test(app)) throw Error('Free controller must not contact services or retain customer inputs');
  const navigation = readFileSync(resolve(site, 'static/navigation.js'), 'utf8');
  if (/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|localStorage|sessionStorage|document\.cookie|https?:\/\//.test(navigation)) throw Error('Navigation must remain local and not retain inputs');
  for(const file of publicFiles.filter(file=>file.endsWith('.html'))){
    const html=readFileSync(resolve(site,file),'utf8');
    if(!html.includes('Quote Kit: not available for purchase')||!html.includes('Consulting platform: in development')||!html.includes('Checkout is closed.')) throw Error('All public pages must state sale restrictions');
    if (/<form[^>]+(?:action|method)=|<script(?!\s+src=)|<style\b|\son\w+\s*=|\sstyle\s*=/i.test(html)) throw Error('Only local scripts and the local calculator form are allowed');
    for(const [,url] of html.matchAll(/(?:href|src)="([^"]+)"/g)){
      if(url.startsWith('#')){if(!html.includes('id="'+url.slice(1)+'"'))throw Error('Missing local anchor');continue;}
      if(url==='mailto:quotellum.service@gmail.com')continue;
      if(url===baseUrl+(file==='index.html'?'/':file==='404.html'?'/404':'/'+file.replace(/\/index\.html$/,'')))continue;
      if(!url.startsWith('/')||(!routes.includes(url)&&url!=='/sample'&&!publicFiles.includes(url.slice(1))))throw Error('Unapproved public link or endpoint: '+url);
    }
    const forms=(html.match(/<form\b/g)||[]).length;
    if(forms!==(file==='free-calculator/index.html'?1:0))throw Error('Unexpected public form');
  }
  const offer=readFileSync(resolve(site,'quote-kit/index.html'),'utf8');
  if(!/<button\s+type="button"\s+disabled>Quote Kit/.test(offer))throw Error('Purchase control must be disabled');
  const sample = readFileSync(resolve(site, 'Quotellum-Quick-Quote.xlsx'));
  if (createHash('sha256').update(sample).digest('hex') !== freeSampleSha) throw Error('Only the reviewed free sample may be published');
  const config = readFileSync(resolve(root, 'netlify.toml'), 'utf8');
  if (!/publish\s*=\s*"site"/.test(config) || /functions|plugins|command\s*=\s*"(?!npm run build")/i.test(config)) throw Error('Static-only deployment configuration required');
  const packageText = readFileSync(resolve(root, 'package.json'), 'utf8').replace(/^\uFEFF/, '');
  const pkg = JSON.parse(packageText);
  if (Object.keys(pkg.dependencies || {}).length || Object.keys(pkg.devDependencies || {}).length) throw Error('Public site must have no third-party dependencies');
  const manifest=JSON.parse(readFileSync(resolve(root,'releases/website-release-manifest.json'),'utf8'));
  if(manifest.liveCheckout!==false||manifest.functions!==false||manifest.quoteKit!=='BLOCKED'||manifest.platform!=='NOT_FOR_SALE')throw Error('Release manifest must preserve closed sales');
  if(JSON.stringify([...manifest.files.map(file=>file.path)].sort())!==JSON.stringify([...publicFiles].sort()))throw Error('Manifest must match public files exactly');
  for(const file of manifest.files)if(createHash('sha256').update(readFileSync(resolve(site,file.path))).digest('hex')!==file.sha256)throw Error('Manifest checksum mismatch');
  return { files: actual.length, publicAssets: publicFiles.length, freeSampleSha256: freeSampleSha };
}
const entry = process.argv[1];
if (entry && resolve(entry) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = verifyPublic(root);
  console.log('Verified ' + result.publicAssets + ' public assets; ' + result.files + ' reviewed repository files. Checkout remains closed.');
}

