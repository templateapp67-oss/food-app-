import type {Restaurant,Item} from '../model';
import {popularFoods,remainingMockRestaurants} from '../mockFood';
import {matchesRestaurantSearch} from '../restaurantDiscovery';
import RestaurantCard from './RestaurantCard';
export function PopularFoodGrid({items,onSearch,allowSamples=true}:{items:Item[];onSearch:(name:string)=>void;allowSamples?:boolean}){
 const dishes=allowSamples?popularFoods.map(sample=>items.find(i=>!i.is_demo&&i.is_available&&i.name.toLowerCase()===sample.name.toLowerCase())||sample):items.filter(i=>!i.is_demo&&i.is_available).filter((i,index,all)=>all.findIndex(x=>x.name.toLowerCase()===i.name.toLowerCase())===index).slice(0,20);
 if(!dishes.length)return null;
 return <div className="popular-food-grid" aria-label={allowSamples?'20 popular food items':'Popular dishes from live restaurants'}>{dishes.map(dish=><button key={dish.id} onClick={()=>onSearch(dish.name)}>{dish.image_url&&<img src={dish.image_url} alt="" loading="lazy"/>}<strong>{dish.name}</strong><small>{dish.description}{dish.is_demo?' · Sample':''}</small></button>)}</div>;
}
export default function MockFoodDiscovery({restaurants,area,query,category,veg,rating,fast,favorites,liveCount,onOpen}:{restaurants:Restaurant[];area:string;query:string;category:string;veg:boolean;rating:boolean;fast:boolean;favorites:boolean;liveCount:number;onOpen:(id:string)=>void}){
 const previews=remainingMockRestaurants(restaurants).filter(r=>matchesRestaurantSearch(r,query,area,popularFoods.filter(i=>i.restaurant_id===r.id).map(i=>i.name))&&(!veg||r.is_veg_only)&&(!rating||r.rating_avg>=4.5)&&(!fast||r.prep_time_min<=20)&&!favorites&&(category==='All'||r.cuisines?.includes(category)||popularFoods.some(i=>i.restaurant_id===r.id&&i.description===category)));
 if(!previews.length)return liveCount?null:<p className="notice">No restaurants match these filters. Try another dish or Jaipur area.</p>;
 return <section className="mock-restaurant-discovery" aria-label="Jaipur sample restaurants"><p className="notice">Sample restaurant previews · Names, ratings, prices and images are illustrative. Live restaurants replace these previews automatically. Orders are unavailable for samples.</p>{<div className="dining-card-grid">{previews.map(r=><RestaurantCard key={r.id} restaurant={{id:r.id,name:r.name,imageUrl:r.cover_url,imageAlt:'Illustrative sample restaurant interior',rating:r.rating_avg,reviewCount:r.rating_count,cuisines:r.cuisines||[],costForTwoPaise:r.avg_cost_for_two_paise,area:r.address.split(',')[0],city:r.city,tags:[{label:'SAMPLE PREVIEW'}],prepMinutes:r.prep_time_min}} onOpen={()=>onOpen(r.id)}/>)}</div>}</section>
}
