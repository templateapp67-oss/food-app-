import {jaipurLocalities,findJaipurLocality,nearestJaipurLocality,inJaipurBounds,validJaipurPin} from './locations';
import {useCallback,useEffect,useRef,useState} from 'react';
export type JaipurLocation={latitude:number;longitude:number;area:string;pincode:string;street:string;accuracy:number;warning?:string;approximateArea?:boolean;source?:'gps'|'fallback'|'map'};
const jaipurAddress=(a:Record<string,unknown>)=>a.country_code==='in'&&([a.city,a.town,a.municipality].some(v=>typeof v==='string'&&/^jaipur(?:\s+(?:municipal corporation|greater|heritage|city))?$/i.test(v))||(a.state==='Rajasthan'&&[a.state_district,a.county].some(v=>typeof v==='string'&&/^jaipur(?:\s+(?:district|rural|urban))?$/i.test(v))));
const cacheKey='nexora.food.location';
function cached(){try{const data=JSON.parse(localStorage.getItem(cacheKey)||'null');return data&&Date.now()-data.time<15*60*1000?data.value as JaipurLocation:null}catch{return null}}
function position(highAccuracy:boolean){return new Promise<GeolocationPosition>((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:highAccuracy,timeout:highAccuracy?15000:10000,maximumAge:highAccuracy?0:300000}))}
export async function locateJaipur(onPosition?:(value:JaipurLocation)=>void):Promise<JaipurLocation>{
 if(window.isSecureContext===false)throw new Error('Open Nexora Food using its HTTPS link to enable location. You can also enter your address manually.');
 if(!navigator.geolocation)throw new Error('GPS is unavailable. Choose your Jaipur area manually.');
 let pos:GeolocationPosition;try{pos=await position(true)}catch(first){if((first as GeolocationPositionError).code===1)throw new Error('Location permission denied. Allow Location in your browser site settings, then retry, or enter your Jaipur address manually.');try{pos=await position(false)}catch(e){if((e as GeolocationPositionError).code===1)throw new Error('Location permission denied. Allow Location in browser settings or enter your address manually.');throw new Error('Could not get your location. Turn on device Location / GPS and retry, or enter your street address below.')}}
 const{latitude,longitude,accuracy}=pos.coords;
 if(!inJaipurBounds(latitude,longitude))throw new Error('Your GPS location is outside Jaipur. Nexora Food currently serves Jaipur only.');
 const coordinates:JaipurLocation={latitude,longitude,accuracy,area:'',pincode:'',street:'',source:'gps'};
 const old=cached();if(old&&Math.abs(old.latitude-latitude)<.0005&&Math.abs(old.longitude-longitude)<.0005)return {...old,latitude,longitude,accuracy};
 const nearby=nearestJaipurLocality(latitude,longitude);if(nearby&&nearby.distance<=4){coordinates.area=nearby.place.name;coordinates.approximateArea=true;}onPosition?.({...coordinates});
 const endpoint=import.meta.env.VITE_GEOCODING_URL||'https://nominatim.openstreetmap.org/reverse';
 let data;try{const url=new URL(endpoint);url.search=new URLSearchParams({format:'jsonv2',lat:String(latitude),lon:String(longitude),zoom:'18',addressdetails:'1','accept-language':'en'}).toString();const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error();data=await response.json()}finally{clearTimeout(timer)}}catch{return {...coordinates,warning:'Current location found. Address lookup is unavailable. Check the nearby Jaipur area and enter your PIN code.'}}
 const a=data?.address||{};const text=(v:unknown)=>typeof v==='string'?v.trim():'';
 const verified=jaipurAddress(a);
 if(!verified)return {...coordinates,warning:'Current location found. The returned address could not be verified as Jaipur. Confirm your Jaipur area and PIN manually.'};
 const candidates=[a.neighbourhood,a.suburb,a.quarter,a.city_district,a.residential,a.borough,a.village,a.town].map(text).filter(Boolean);const area=candidates.map(candidate=>findJaipurLocality(candidate)?.name).find(Boolean)||candidates[0]||coordinates.area;
 const result:JaipurLocation={...coordinates,area,approximateArea:!candidates.some(candidate=>findJaipurLocality(candidate)),pincode:validJaipurPin(text(a.postcode))?text(a.postcode):'',street:[text(a.house_number),text(a.road)].filter(Boolean).join(', ')};
 if(result.approximateArea)result.warning='GPS location found. Check the nearby area and your delivery entrance before saving.';
 if(!area)return {...result,warning:'Current location found. Your locality was not found. Choose a Jaipur area manually.'};
 if(!jaipurLocalities.some(name=>name===area))result.warning=`GPS found ${area}. Select the supported delivery locality and enter its PIN code.`;
 try{localStorage.setItem(cacheKey,JSON.stringify({time:Date.now(),value:result}))}catch{/* Location remains usable without device storage. */}return result;
}
export const defaultJaipurHub:JaipurLocation={latitude:26.9124,longitude:75.7873,area:'Jaipur',pincode:'',street:'',accuracy:0,source:'fallback'};
export function useJaipurLocation(auto:boolean,identity:string|null=null){
 const[value,setValue]=useState<JaipurLocation|null>(cached),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 const inFlight=useRef<Promise<JaipurLocation|null>|null>(null),lastIdentity=useRef<string|null>(null),generation=useRef(0);
 const detect=useCallback((onPosition?:(value:JaipurLocation)=>void)=>{
  if(inFlight.current)return inFlight.current;
  const requestId=++generation.current;
  setBusy(true);setError('');setStatus('Getting GPS location…');
  const request=(async()=>{try{
   const next=await locateJaipur(coords=>{if(requestId!==generation.current)return;setValue(coords);setStatus('Finding your Jaipur area…');onPosition?.(coords)});
   if(requestId!==generation.current){try{localStorage.removeItem(cacheKey)}catch{}return null}
   setValue(next);setError(next.warning||'');return next;
  }catch(e){if(requestId!==generation.current)return null;setValue({...defaultJaipurHub});setError(e instanceof Error?e.message:'Using the default Jaipur hub.');return null}
  finally{if(requestId===generation.current){setBusy(false);setStatus('');inFlight.current=null}}})();
  inFlight.current=request;return request;
 },[]);
 useEffect(()=>{
  if(!auto)return;
  const key=identity||'guest';if(lastIdentity.current===key)return;lastIdentity.current=key;
  if(!identity){try{if(sessionStorage.getItem('nexora.location.attempted'))return;sessionStorage.setItem('nexora.location.attempted','true')}catch{/* GPS works without browser storage. */}}
  // Login can occur while a guest permission request is still pending. Retry for the new identity.
  if(inFlight.current&&identity){const queuedGeneration=generation.current;void inFlight.current.then(()=>{if(lastIdentity.current===key&&generation.current===queuedGeneration)void detect()})}else void detect();
 },[auto,identity,detect]);
 const accept=useCallback((next:JaipurLocation)=>{if(next.source==='fallback')return;generation.current++;inFlight.current=null;setBusy(false);setStatus('');setValue(next);setError(next.warning||'')},[]);
 const clear=useCallback(()=>{generation.current++;inFlight.current=null;setBusy(false);setStatus('');setValue(null);setError('');try{localStorage.removeItem(cacheKey)}catch{/* Saved delivery addresses remain available. */}},[]);
 return{value,error,busy,status,detect,accept,clear};
}

export type AddressMatch={latitude:number;longitude:number;label:string};
export async function searchJaipurAddress(street:string,area:string,pin:string):Promise<AddressMatch[]>{
 if(!street.trim()||!jaipurLocalities.some(name=>name===area)||!validJaipurPin(pin))throw new Error('Enter your house / street, Jaipur area and PIN code.');
 const url=new URL(import.meta.env.VITE_GEOCODING_URL||'https://nominatim.openstreetmap.org/reverse');
 url.pathname=url.pathname.replace(/\/reverse\/?$/, '/search');
 url.search=new URLSearchParams({q:`${street.trim()}, ${area}, Jaipur, Rajasthan, ${pin}, India`,format:'jsonv2',addressdetails:'1',countrycodes:'in',viewbox:'75.3,27.4,76.3,26.5',bounded:'1',limit:'5','accept-language':'en'}).toString();
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),10000);
 try{
 const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
 if(!response.ok)throw new Error('Address search is unavailable. Please retry or use current location.');
 let data=await response.json();
 if(Array.isArray(data)&&!data.length){const simpler=street.replace(/^(?:house|flat|plot|no\.?|number|#)?\s*[\d/\-]+[,\s]+/i,'').trim();if(simpler&&simpler!==street.trim()){await new Promise(resolve=>setTimeout(resolve,1100));url.searchParams.set('q',`${simpler}, ${area}, Jaipur, Rajasthan, India`);const retry=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(retry.ok)data=await retry.json()}}
 const matches:Array<AddressMatch>=(Array.isArray(data)?data:[]).filter(item=>{
 const a=item.address||{},lat=Number(item.lat),lon=Number(item.lon);
 return jaipurAddress(a)&&(!a.postcode||a.postcode===pin)&&inJaipurBounds(lat,lon)&&!!(a.road||a.house_number||['house','building','apartments','school','restaurant','cafe','place_of_worship','hospital'].includes(item.type))&&!['administrative','postcode','suburb','city','neighbourhood'].includes(item.type);
 }).map(item=>({latitude:Number(item.lat),longitude:Number(item.lon),label:String(item.display_name||street)}));
 if(!matches.length)throw new Error('This street is not mapped yet. Choose your delivery entrance on the map below, or use current location.');
 return matches;
 }catch(e){if(e instanceof Error&&e.name==='AbortError')throw new Error('Address search took too long. Please retry or use current location.');throw e}finally{clearTimeout(timer)}
}
