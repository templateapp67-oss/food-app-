import type {Restaurant} from '../model';
import {dishPhotos,restaurantPhotos} from '../photos';
import {isJaipur,jaipurLocalities} from '../locations';

const examples = [
  ['Pink City Bistro','Vaishali Nagar', 'North Indian|Continental', 'Punjab Kitchen'],
  ['Jaipur Table','C Scheme','Chinese|North Indian','Dough & Co.'],
  ['Courtyard Kitchen','Malviya Nagar','Italian|North Indian','Green Table'],
  ['Amber Cafe','Vaishali Nagar','North Indian|South Indian','South Street'],
  ['Hawa Mahal Kitchen','Raja Park','North Indian|Indian','The Biryani House'],
  ['Rosewood Dining','Mansarovar','Continental|North Indian','Burger Theory'],
  ['Spice Avenue','Tonk Road','North Indian|Chinese','Punjab Kitchen'],
  ['Jaipur Chai House','Bani Park','Indian|Cafe','South Street'],
  ['Basil & Bowl','Jagatpura','Italian|Continental','Green Table'],
  ['Royal Thali Room','Civil Lines','North Indian|Rajasthani','The Biryani House'],
  ['Oven Street','Sodala','Pizza|Italian','Dough & Co.'],
  ['City Crunch','Pratap Nagar','Burgers|Fast Food','Burger Theory'],
];
export const recommendationMocks:Restaurant[] = examples.map(([name,area,cuisines,photo],i)=>({
  id:`mock-dining-${i+1}`,name,address:`${area}, Jaipur`,city:'Jaipur',cuisines:cuisines.split('|'),
  description:'Illustrative Jaipur restaurant. Images, prices, ratings, distances and deals are sample data.',
  cover_url:i===3?dishPhotos['Masala Dosa']:restaurantPhotos[photo],
  status:'active',is_temporarily_closed:false,prep_time_min:25,rating_avg:4.2+(i%6)/10,rating_count:100+i*17,
  avg_cost_for_two_paise:(600+(i%5)*100)*100,min_order_paise:0,is_veg_only:false,is_demo:true,
  distance_km:3.2+i*.3,dining_type:'casual_dining',
  booking_offer:{text:`Flat ${[25,15,10][i%3]}% off on pre-booking`,moreCount:2+i%4,detail:'Mock offer · Not redeemable'},
  bank_offer:{text:'Up to 10% off with bank offers',detail:'Mock offer'},
  promo_offer:{text:'Get extra ₹125 off using',code:'PAYTMNEW',detail:'Sample code · Not redeemable'},
}));

export const isMockRestaurant = (r:Restaurant) => r.is_demo===true || /^(demo-|mock-)/.test(r.id);
const key = (name:string) => name.trim().toLocaleLowerCase().replace(/\s+/g,' ');
const area = (r:Restaurant) => jaipurLocalities.find(a=>r.address.toLowerCase().includes(a.toLowerCase()));

/** Real records occupy slots first. Mocks only fill missing slots, and never enter the database. */
export function mergeRecommendationSlots(real:Restaurant[],mocks:Restaurant[],limit:number,current:Restaurant,allReal:Restaurant[]=real) {
  const seen=new Set([key(current.name)]);
  const realNames=new Set(allReal.map(r=>key(r.name)));
  const result:Restaurant[]=[];
  for(const r of [...real,...mocks]) {
    if(r.id===current.id||seen.has(key(r.name))||result.length>=limit)continue;
    if(isMockRestaurant(r)&&realNames.has(key(r.name)))continue;
    seen.add(key(r.name));result.push(r);
  }
  return result;
}

export function buildRecommendations(current:Restaurant,records:Restaurant[]) {
  const real=records.filter(r=>!isMockRestaurant(r)&&r.id!==current.id&&r.status==='active'&&!r.is_temporarily_closed&&isJaipur(r.city));
  const north=(r:Restaurant)=>r.cuisines?.some(c=>/north\s*indian/i.test(c));
  const locality=area(current);
  const near=real.filter(r=>locality&&area(r)===locality);
  return {
    casual:mergeRecommendationSlots(real.filter(r=>!r.dining_type||r.dining_type==='casual_dining'),recommendationMocks.slice(0,3),3,current,real),
    near:mergeRecommendationSlots(near,recommendationMocks.slice(3,6),3,current,real),
    north:mergeRecommendationSlots(real.filter(north),recommendationMocks.filter(north).slice(6).concat(recommendationMocks.filter(north)),3,current,real),
    brands:mergeRecommendationSlots(real,recommendationMocks,12,current,real),
  };
}
