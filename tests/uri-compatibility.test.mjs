import {test} from 'node:test';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),query=require('query-string');
test('historical CommonJS query-string callers continue to decode normal Unicode URLs',()=>{
 const value=query.parse('word=%E4%BD%A0%E5%A5%BD&space=green+life');assert.equal(value.word,'你好');assert.equal(value.space,'green life');
});
test('malformed encoded URL input returns within an isolated process time limit',()=>{
 const result=spawnSync(process.execPath,['-e',"const q=require('query-string');const value=q.parse('word='+('%F0%80%80'.repeat(5000)));if(typeof value.word!=='string')process.exit(2);console.log(value.word.length)"],{cwd:new URL('..',import.meta.url),encoding:'utf8',timeout:2000});
 assert.equal(result.error,undefined);assert.equal(result.status,0);assert.ok(Number(result.stdout)>10000);
});
