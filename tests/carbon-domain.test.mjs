import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAvoided } from '../src/features/log/calculateAvoided.ts';
const usage={transportKmIncludedToday:0,standbyIncludedCountToday:0};
test('walking and riding represent explicit gasoline-baseline estimates, not issued credits',()=>{
 assert.equal(calculateAvoided('walk',{mode:'transport',km:5,roundTrip:false},usage).avoidedKg,1);
 assert.equal(calculateAvoided('transport_bus',{mode:'transport',km:5,roundTrip:false},usage).avoidedKg,.775);
});
test('round trip and single entry cap are applied before the remaining daily budget',()=>{
 assert.equal(calculateAvoided('bike',{mode:'transport',km:40,roundTrip:true},usage).avoidedKg,10);
 assert.equal(calculateAvoided('bike',{mode:'transport',km:40,roundTrip:true},{...usage,transportKmIncludedToday:78}).avoidedKg,.4);
});
test('exhausted daily transport allowance excludes further estimates',()=>{
 const x=calculateAvoided('walk',{mode:'transport',km:5,roundTrip:false},{...usage,transportKmIncludedToday:80});assert.equal(x.avoidedKg,0);assert.equal(x.includedInSummary,false);
});
test('negative distances are not credited',()=>{
 const x=calculateAvoided('walk',{mode:'transport',km:-3,roundTrip:false},usage);assert.equal(x.avoidedKg,0);assert.equal(x.includedInSummary,false);
});
test('payload mismatches are excluded',()=>{
 assert.equal(calculateAvoided('walk',{mode:'food',level:'normal'},usage).includedInSummary,false);
});
test('virtue and reusable cup are recorded without a contentious CO2 value',()=>{
 for(const type of ['virtue','mug'])assert.equal(calculateAvoided(type,{mode:type},usage).includedInSummary,false);
});
test('standby estimates respect the existing daily count limit',()=>{
 const x=calculateAvoided('standby_off',{mode:'standby',preset:'router',hours:8},usage);assert.equal(x.avoidedKg,.037);
 const cap=calculateAvoided('standby_off',{mode:'standby',preset:'router',hours:8},{...usage,standbyIncludedCountToday:3});assert.equal(cap.avoidedKg,0);assert.equal(cap.includedInSummary,false);
});
test('unknown behaviors do not create estimates',()=>assert.equal(calculateAvoided('unknown',{},usage).includedInSummary,false));
test('non-finite transport values and invalid daily usage never create NaN or unbounded credit',()=>{
 for(const km of [NaN,Infinity,-Infinity]){const x=calculateAvoided('walk',{mode:'transport',km,roundTrip:false},usage);assert.equal(x.avoidedKg,0);assert.equal(x.includedInSummary,false);}
 assert.equal(calculateAvoided('walk',{mode:'transport',km:5,roundTrip:false},{...usage,transportKmIncludedToday:-2}).includedInSummary,false);
});
test('non-finite standby durations do not create estimated savings',()=>{
 assert.equal(calculateAvoided('standby_off',{mode:'standby',preset:'router',hours:Infinity},usage).includedInSummary,false);
});
