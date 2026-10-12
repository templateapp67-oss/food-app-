import {describe,it,expect} from 'vitest';
import {matchesRestaurantArea,matchesRestaurantSearch} from './restaurantDiscovery';
import {restaurants} from './demo';
const cafe={...restaurants[0],name:'Rambharose Café',address:'118 Durga Vihar, JHOTWARA, Jaipur',city:'Jaipur',cuisines:['North Indian']};
describe('Restaurant discovery matching',()=>{
 it('matches restaurant name and locality without case, accent or whitespace sensitivity',()=>{
  expect(matchesRestaurantSearch(cafe,'  RAMBHAROSE cafe  ','jhotwara')).toBe(true);
  expect(matchesRestaurantSearch(cafe,'Jhotwara','')).toBe(true);
  expect(matchesRestaurantSearch(cafe,'Rambharose Cafe Jhotwara','')).toBe(true);
 });
 it('requires the selected area AND keyword matches, while supporting dishes and cuisines',()=>{
  expect(matchesRestaurantSearch(cafe,'Rambharose','Mansarovar')).toBe(false);
  expect(matchesRestaurantSearch(cafe,'pizza','Jhotwara')).toBe(false);
  expect(matchesRestaurantSearch(cafe,'paneer','Jhotwara',['Shahi Paneer'])).toBe(true);
  expect(matchesRestaurantSearch(cafe,'north indian','Jhotwara')).toBe(true);
 });
 it('uses the same catalog aliases for filtering and neighbourhood counts',()=>{
  const r={...cafe,address:'C-Scheme, Jaipur'};
  expect(matchesRestaurantArea(r,'C Scheme')).toBe(true);
  expect(matchesRestaurantSearch(r,'rambharose','C Scheme')).toBe(true);
 });
});
