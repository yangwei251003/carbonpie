import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {cpSync,writeFileSync,readdirSync,readFileSync,rmSync,mkdirSync} from 'node:fs';
const root=resolve(import.meta.dirname,'..'),env={...process.env};
for(const key of Object.keys(env))if(key.startsWith('EXPO_PUBLIC_')||/^(SUPABASE_|WX_|SILICONFLOW_|TAVILY_|PIXABAY_|OPENAQ_|AI_API_KEY)/.test(key))delete env[key];
Object.assign(env,{EXPO_NO_DOTENV:'1',EXPO_NO_TELEMETRY:'1',EXPO_PUBLIC_OFFLINE_DEMO:'1',EXPO_PUBLIC_BASE_URL:'/carbonpie'});
const result=spawnSync(process.execPath,[resolve(root,'node_modules/expo/bin/cli'),'export','--platform','web','--output-dir','dist','--source-maps','--max-workers','2'],{cwd:root,env,stdio:'inherit',windowsHide:true});
if(result.status!==0)process.exit(result.status??1);
const packages=new Set();let sourceCount=0;
function inspect(directory){for(const entry of readdirSync(directory,{withFileTypes:true})){const path=resolve(directory,entry.name);if(entry.isDirectory())inspect(path);else if(entry.name.endsWith('.map')){const map=JSON.parse(readFileSync(path,'utf8'));for(const source of map.sources??[]){sourceCount++;const matches=[...source.replaceAll('\\','/').matchAll(/(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/g)];for(const match of matches)packages.add(match[1]);}rmSync(path);}else if(entry.name.endsWith('.js'))writeFileSync(path,readFileSync(path,'utf8').replace(/^\/\/# sourceMappingURL=.*$/gm,''));}}
inspect(resolve(root,'dist'));mkdirSync(resolve(root,'.local'),{recursive:true});
writeFileSync(resolve(root,'.local/runtime-module-packages.json'),JSON.stringify({sourceCount,packages:[...packages].sort(),scope:'Source-map source paths only; maps removed before public deployment.'},null,2));
cpSync(resolve(root,'dist/index.html'),resolve(root,'dist/404.html'));
writeFileSync(resolve(root,'dist/.nojekyll'),'');
console.log('Exported actual offline guest app for /carbonpie/. No service keys or private configuration loaded.');
