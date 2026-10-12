import {describe,expect,it} from 'vitest';
import {restaurants} from '../demo';
import {buildRecommendations,isMockRestaurant,recommendationMocks} from './recommendations';
import type {Restaurant} from '../model';
const current={...restaurants[0],name:'All Day Spirit',address:'Vaishali Nagar, Jaipur'};
const real=(index:number):Restaurant=>({...recommendationMocks[index],id:`real-${index}`,is_demo:false,distance_km:undefined,booking_offer:undefined,bank_offer:undefined,promo_offer:undefined});
describe('Progressive replacement of mock recommendation slots',()=>{
 it('fills all four sections with clearly classified samples when real data is empty',()=>{
  const result=buildRecommendations(current,restaurants);
  expect(result.casual).toHaveLength(3);expect(result.near).toHaveLength(3);expect(result.north).toHaveLength(3);expect(result.brands).toHaveLength(12);
  expect(Object.values(result).flat().every(isMockRestaurant)).toBe(true);
 });
 it('puts one real record first and removes its matching mock without copying mock offers',()=>{
  const record=real(0);const result=buildRecommendations(current,[record]);
  expect(result.casual[0]).toBe(record);expect(result.near[0]).toBe(record);expect(result.north[0]).toBe(record);
  expect(result.casual.filter(isMockRestaurant)).toHaveLength(2);
  expect(result.brands.filter(r=>r.name===record.name)).toHaveLength(1);
  expect(result.casual[0].booking_offer).toBeUndefined();
 });
 it('removes all section mocks when enough eligible records arrive, preserving Jaipur and cuisine rules',()=>{
  const records=Array.from({length:12},(_,i)=>({...real(i),address:'Vaishali Nagar, Jaipur',cuisines:['North Indian']}));
  const result=buildRecommendations(current,records);
  expect(Object.values(result).flat().some(isMockRestaurant)).toBe(false);
  const excluded=buildRecommendations(current,[{...real(0),city:'Delhi'},{...real(1),status:'pending'},{...real(2),is_temporarily_closed:true}]);
  expect(excluded.casual.every(isMockRestaurant)).toBe(true);
 });
});

it('never fills live recommendation gaps with sample records',()=>{const result=buildRecommendations(current,[real(0)],false);expect(Object.values(result).flat().every(r=>!isMockRestaurant(r))).toBe(true);expect(buildRecommendations(current,[],false).brands).toHaveLength(0);});
