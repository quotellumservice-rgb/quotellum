import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const publicFiles = Object.freeze([
  'index.html', 'static/app.js', 'static/quote-core.js', 'static/style.css',
  'Quotellum-Quick-Quote.xlsx', '_redirects', '_headers', 'robots.txt',
]);
export const repositoryFiles = Object.freeze([
  ...publicFiles.map(file => 'site/' + file), '.github/CODEOWNERS', '.github/workflows/public-ci.yml',
  '.gitignore', 'README.md', 'netlify.toml', 'package.json', 'scripts/verify-public.mjs', 'tests/public.test.mjs',
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
  const html = readFileSync(resolve(site, 'index.html'), 'utf8');
  if (!/<button\s+type="button"\s+disabled>Quote Kit/.test(html) || !html.includes('Checkout is closed.')) throw Error('Paid checkout must remain visibly disabled');
  if (/<form[^>]+(?:action|method)=|<script(?!\s+src=)/i.test(html)) throw Error('Only local scripts and the local calculator form are allowed');
  const sample = readFileSync(resolve(site, 'Quotellum-Quick-Quote.xlsx'));
  if (createHash('sha256').update(sample).digest('hex') !== freeSampleSha) throw Error('Only the reviewed free sample may be published');
  const config = readFileSync(resolve(root, 'netlify.toml'), 'utf8');
  if (!/publish\s*=\s*"site"/.test(config) || /functions|plugins|command\s*=\s*"(?!npm run build")/i.test(config)) throw Error('Static-only deployment configuration required');
  const packageText = readFileSync(resolve(root, 'package.json'), 'utf8').replace(/^\uFEFF/, '');
  const pkg = JSON.parse(packageText);
  if (Object.keys(pkg.dependencies || {}).length || Object.keys(pkg.devDependencies || {}).length) throw Error('Public site must have no third-party dependencies');
  return { files: actual.length, publicAssets: publicFiles.length, freeSampleSha256: freeSampleSha };
}
const entry = process.argv[1];
if (entry && resolve(entry) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = verifyPublic(root);
  console.log('Verified ' + result.publicAssets + ' public assets; ' + result.files + ' reviewed repository files. Checkout remains closed.');
}

