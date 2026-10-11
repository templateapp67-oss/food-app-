import {jaipurLocalities} from './locations';
import {useCallback,useEffect,useState} from 'react';
export type JaipurLocation={latitude:number;longitude:number;area:string;pincode:string;street:string;accuracy:number};
const cacheKey='nexora.food.location';
function cached(){try{const data=JSON.parse(localStorage.getItem(cacheKey)||'null');return data&&Date.now()-data.time<15*60*1000?data.value as JaipurLocation:null}catch{return null}}
export async function locateJaipur():Promise<JaipurLocation>{
 if(!navigator.geolocation)throw new Error('GPS is unavailable. Choose your Jaipur area manually.');
 const pos=await new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,e=>reject(new Error(e.code===1?'Location permission denied. Choose your Jaipur area manually.':'Could not get GPS location. Retry or choose your Jaipur area manually.')),{enableHighAccuracy:true,timeout:15000,maximumAge:60000}));
 const{latitude,longitude,accuracy}=pos.coords;
 if(latitude<26.65||latitude>27.25||longitude<75.45||longitude>76.05)throw new Error('Your GPS location is outside Jaipur. Nexora Food currently serves Jaipur only.');
 const old=cached();if(old&&Math.abs(old.latitude-latitude)<.0005&&Math.abs(old.longitude-longitude)<.0005)return {...old,latitude,longitude,accuracy};
 const endpoint=import.meta.env.VITE_GEOCODING_URL||'https://nominatim.openstreetmap.org/reverse';
 const url=new URL(endpoint);url.search=new URLSearchParams({format:'jsonv2',lat:String(latitude),lon:String(longitude),zoom:'18',addressdetails:'1','accept-language':'en'}).toString();
 let data;try{const response=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});if(!response.ok)throw new Error();data=await response.json()}catch{throw new Error('GPS found your position, but address lookup is unavailable. Choose your Jaipur area manually.')}
 const a=data.address||{};if(a.country_code!=='in'||![a.city,a.town,a.municipality].some(v=>typeof v==='string'&&v.toLowerCase()==='jaipur'))throw new Error('This address could not be verified as Jaipur. Choose a Jaipur address manually.');
 const normalize=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');const rawArea=a.neighbourhood||a.suburb||a.quarter||a.city_district;const area=jaipurLocalities.find(name=>[a.neighbourhood,a.suburb,a.quarter,a.city_district].some(candidate=>typeof candidate==='string'&&normalize(candidate)===normalize(name)))||rawArea;if(!area)throw new Error('Your Jaipur locality was not found. Choose your area manually.');
 const result={latitude,longitude,accuracy,area,pincode:/^302\d{3}$/.test(a.postcode||'')?a.postcode:'',street:[a.house_number,a.road].filter(Boolean).join(', ')};try{localStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),value:result}))}catch{/* GPS still works without device storage. */}return result;
}
export function useJaipurLocation(auto:boolean){const[value,setValue]=useState<JaipurLocation|null>(cached),[error,setError]=useState(''),[busy,setBusy]=useState(false);const detect=useCallback(async()=>{setBusy(true);setError('');try{const next=await locateJaipur();setValue(next);return next}catch(e){setError(e instanceof Error?e.message:'Choose your Jaipur area manually.');return null}finally{setBusy(false)}},[]);useEffect(()=>{if(!auto||value||sessionStorage.getItem('nexora.location.attempted'))return;sessionStorage.setItem('nexora.location.attempted','true');void detect()},[auto,value,detect]);return{value,error,busy,detect,clear:()=>{setValue(null);setError('');localStorage.removeItem(cacheKey)}}}
