import {test} from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),values=new Map();let requests=0,locations=0;
globalThis.wx={getStorageSync:k=>structuredClone(values.get(k)),setStorageSync:(k,v)=>values.set(k,structuredClone(v)),removeStorageSync:k=>values.delete(k),request:()=>{requests++;throw new Error('Unexpected remote request')},getLocation:()=>{locations++;throw new Error('Unexpected private location request')}};
const storage=require('../wechat-miniapp/utils/storage.js'),api=require('../wechat-miniapp/utils/api.js'),config=require('../wechat-miniapp/utils/config.js');
test('unconfigured public miniapp does not request a cloud login, location, weather or articles',async()=>{
 assert.equal(config.cloudEnabled,false);assert.equal(config.offlineDemo,true);
 const env=await api.fetchEnvironment();assert.equal(env.weather.temperature,null);assert.match(env.locationLabel,/离线/);
 assert.ok((await api.fetchArticles()).length>0);assert.equal(requests,0);assert.equal(locations,0);
});
test('synthetic behavior persists locally and updates virtual farm rewards without network',()=>{
 const before=storage.listRecords().length;const x=storage.saveRecord({actionId:'bike',amount:2,note:'Explicit synthetic test fixture'});
 assert.equal(storage.listRecords().length,before+1);assert.equal(storage.listRecords()[0].id,x.id);assert.equal(x.carbon,.36);assert.equal(x.reward,36);assert.equal(requests,0);
});
test('invalid miniapp inputs do not mutate records or grant virtual rewards',()=>{
 const before=JSON.stringify([...values]);for(const amount of [NaN,Infinity,-1,0])assert.throws(()=>storage.saveRecord({actionId:'bike',amount}));assert.throws(()=>storage.saveRecord({actionId:'unknown',amount:2}));assert.equal(JSON.stringify([...values]),before);
});
