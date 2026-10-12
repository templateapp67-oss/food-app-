import type {Restaurant} from './model';
import {findJaipurLocality} from './locations';
export const foldSearch=(value:string)=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function matchesRestaurantArea(restaurant:Restaurant,area:string){
 if(!area.trim())return true;
 const place=findJaipurLocality(area),aliases=place?[place.name,...place.aliases]:[area];
 const address=foldSearch(restaurant.address||'').replace(/\s/g,'');
 return aliases.some(alias=>address.includes(foldSearch(alias).replace(/\s/g,'')));
}
export function matchesRestaurantSearch(restaurant:Restaurant,query:string,area:string,itemNames:string[]=[]){
 if(!matchesRestaurantArea(restaurant,area))return false;
 const haystack=foldSearch([restaurant.name,restaurant.address,restaurant.city,...(restaurant.cuisines||[]),...itemNames].join(' '));
 // Area AND keyword search; each keyword can match name OR address OR cuisine OR dish.
 return foldSearch(query).split(/\s+/).filter(Boolean).every(word=>haystack.includes(word));
}
