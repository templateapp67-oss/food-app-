import {jaipurLocalities} from './locations';
import {useCallback,useEffect,useRef,useState} from 'react';
export type JaipurLocation={latitude:number;longitude:number;area:string;pincode:string;street:string;accuracy:number;warning?:string;source?:'gps'|'fallback'};
const cacheKey='nexora.food.location';
function cached(){try{const data=JSON.parse(localStorage.getItem(cacheKey)||'null');return data&&Date.now()-data.time<15*60*1000?data.value as JaipurLocation:null}catch{return null}}
function position(highAccuracy:boolean){return new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:highAccuracy,timeout:highAccuracy?15000:10000,maximumAge:highAccuracy?0:300000}))}
export async function locateJaipur(onPosition?:(value:JaipurLocation)=>void):Promise<JaipurLocation>{
 if(window.isSecureContext===false)throw new Error('Open Nexora Food using its HTTPS link to enable location. You can also enter your address manually.');
 if(!navigator.geolocation)throw new Error('GPS is unavailable. Choose your Jaipur area manually.');
 let pos:GeolocationPosition;try{pos=await position(true)}catch(first){if((first as GeolocationPositionError).code===1)throw new Error('Location permission denied. Allow Location in your browser site settings, then retry, or enter your Jaipur address manually.');try{pos=await position(false)}catch(e){if((e as GeolocationPositionError).code===1)throw new Error('Location permission denied. Allow Location in browser settings or enter your address manually.');throw new Error('Could not get your location. Turn on device Location / GPS and retry, or enter your street address below.')}}
 const{latitude,longitude,accuracy}=pos.coords;
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||latitude<26.65||latitude>27.25||longitude<75.45||longitude>76.05)throw new Error('Your GPS location is outside Jaipur. Nexora Food currently serves Jaipur only.');
 const coordinates:JaipurLocation={latitude,longitude,accuracy,area:'',pincode:'',street:'',source:'gps'};onPosition?.(coordinates);
 const old=cached();if(old&&Math.abs(old.latitude-latitude)<.0005&&Math.abs(old.longitude-longitude)<.0005)return {...old,latitude,longitude,accuracy};
 const endpoint=import.meta.env.VITE_GEOCODING_URL||'https://nominatim.openstreetmap.org/reverse';
 let data;try{const url=new URL(endpoint);url.search=new URLSearchParams({format:'jsonv2',lat:String(latitude),lon:String(longitude),zoom:'18',addressdetails:'1','accept-language':'en'}).toString();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error();data=await response.json()}finally{clearTimeout(timer)}}catch{return {...coordinates,warning:'Current location found. Address lookup is unavailable. Select your Jaipur area and enter the PIN code manually.'}}
 const a=data?.address||{};const text=(v:unknown)=>typeof v==='string'?v.trim():'';
 const cities=[a.city,a.town,a.municipality].map(text);const verified=a.country_code==='in'&&cities.some(v=>/^jaipur(?:\s+(?:municipal corporation|greater|heritage|city))?$/i.test(v));
 if(!verified)return {...coordinates,warning:'Current location found. The returned address could not be verified as Jaipur. Confirm your Jaipur area and PIN manually.'};
 const normalize=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');const candidates=[a.neighbourhood,a.suburb,a.quarter,a.city_district,a.residential,a.borough].map(text).filter(Boolean);const area=jaipurLocalities.find(name=>candidates.some(candidate=>normalize(candidate)===normalize(name)))||candidates[0]||'';
 const result:JaipurLocation={...coordinates,area,pincode:/^302\d{3}$/.test(text(a.postcode))?text(a.postcode):'',street:[text(a.house_number),text(a.road)].filter(Boolean).join(', ')};
 if(!area)return {...result,warning:'Current location found. Your locality was not found. Choose a Jaipur area manually.'};
 if(!jaipurLocalities.some(name=>name===area))result.warning=`GPS found ${area}. Select the supported delivery locality and enter its PIN code.`;
 try{localStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),value:result}))}catch{/* Location remains usable without device storage. */}return result;
}
export const defaultJaipurHub:JaipurLocation={latitude:26.9124,longitude:75.7873,area:'Jaipur',pincode:'',street:'',accuracy:0,source:'fallback'};
export function useJaipurLocation(auto:boolean,identity:string|null=null){
 const[value,setValue]=useState<JaipurLocation|null>(cached),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const inFlight=useRef<Promise<JaipurLocation|null>|null>(null),lastIdentity=useRef<string|null>(null);
 const detect=useCallback((onPosition?:(value:JaipurLocation)=>void)=>{
  if(inFlight.current)return inFlight.current;
  setBusy(true);setError('');setStatus('Getting GPS location…');
  const request=(async()=>{try{
   const next=await locateJaipur(coords=>{setValue(coords);setStatus('Finding your Jaipur area…');onPosition?.(coords)});
   setValue(next);setError(next.warning||'');return next;
  }catch(e){setValue({...defaultJaipurHub});setError(e instanceof Error?e.message:'Using the default Jaipur hub.');return null}
  finally{setBusy(false);setStatus('');inFlight.current=null}})();
  inFlight.current=request;return request;
 },[]);
 useEffect(()=>{
  if(!auto)return;
  const key=identity||'guest';if(lastIdentity.current===key)return;lastIdentity.current=key;
  if(!identity){try{if(sessionStorage.getItem('nexora.location.attempted'))return;sessionStorage.setItem('nexora.location.attempted','true')}catch{/* GPS works without browser storage. */}}
  void detect();
 },[auto,identity,detect]);
 const accept=useCallback((next:JaipurLocation)=>{if(next.source==='fallback')return;setValue(next);setError(next.warning||'')},[]);
 const clear=useCallback(()=>{setValue(null);setError('');try{localStorage.removeItem(cacheKey)}catch{/* Saved delivery addresses remain available. */}},[]);
 return{value,error,busy,status,detect,accept,clear};
}

export type AddressMatch={latitude:number;longitude:number;label:string};
export async function searchJaipurAddress(street:string,area:string,pin:string):Promise<AddressMatch[]>{
 if(!street.trim()||!jaipurLocalities.some(name=>name===area)||!/^302\d{3}$/.test(pin))throw new Error('Enter your house / street, Jaipur area and PIN code.');
 const url=new URL(import.meta.env.VITE_GEOCODING_URL||'https://nominatim.openstreetmap.org/reverse');
 url.pathname=url.pathname.replace(/\/reverse\/?$/, '/search');
 url.search=new URLSearchParams({q:`${street.trim()}, ${area}, Jaipur, Rajasthan, ${pin}, India`,format:'jsonv2',addressdetails:'1',countrycodes:'in',viewbox:'75.45,27.25,76.05,26.65',bounded:'1',limit:'5','accept-language':'en'}).toString();
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{
 const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('Address search is unavailable. Please retry or use current location.');
 const data=await response.json();
 const matches:Array<AddressMatch>=(Array.isArray(data)?data:[]).filter(item=>{
 const a=item.address||{},lat=Number(item.lat),lon=Number(item.lon);
 return a.country_code==='in'&&[a.city,a.town,a.municipality].some(v=>typeof v==='string'&&/^jaipur(?:\s+(?:municipal corporation|greater|heritage|city))?$/i.test(v))&&a.postcode===pin&&Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=26.65&&lat<=27.25&&lon>=75.45&&lon<=76.05&&!!(a.road||a.house_number)&&!['administrative','postcode','suburb','city','neighbourhood'].includes(item.type);
 }).map(item=>({latitude:Number(item.lat),longitude:Number(item.lon),label:String(item.display_name||street)}));
 if(!matches.length)throw new Error('We could not find this street address. Add a nearby landmark to the street field, check your area / PIN, or use current location.');
 return matches;
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('Address search took too long. Please retry or use current location.');throw e}finally{clearTimeout(timer)}
}
