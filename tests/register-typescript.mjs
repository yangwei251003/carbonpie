import { registerHooks } from 'node:module';
import { readFileSync,existsSync } from 'node:fs';
import { fileURLToPath,pathToFileURL } from 'node:url';
import { resolve,dirname } from 'node:path';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..');
registerHooks({
  resolve(specifier,context,next){
    if(specifier.startsWith('@/')){const base=resolve(root,'src',specifier.slice(2));for(const suffix of ['.ts','.tsx','/index.ts'])if(existsSync(base+suffix))return{url:pathToFileURL(base+suffix).href,shortCircuit:true};}
    if(specifier.startsWith('.')&&context.parentURL?.endsWith('.ts')){const base=resolve(dirname(fileURLToPath(context.parentURL)),specifier);if(existsSync(base+'.ts'))return{url:pathToFileURL(base+'.ts').href,shortCircuit:true};}
    return next(specifier,context);
  },
  load(url,context,next){if(url.endsWith('.ts'))return{format:'module',source:ts.transpileModule(readFileSync(fileURLToPath(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,shortCircuit:true};return next(url,context);}
});
