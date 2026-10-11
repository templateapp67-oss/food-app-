import catalog from './jaipur-localities.json';
// User-supplied locality centres start the map view; they are not delivery pins.
export const launchCity='Jaipur';
export const launchState='Rajasthan';
export const jaipurCatalog=catalog;
export const jaipurLocalities=catalog.map(place=>place.name);
const normalize=(name:string)=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
export const findJaipurLocality=(name:string)=>catalog.find(place=>[place.name,...place.aliases].some(alias=>normalize(alias)===normalize(name)));
export const nearestJaipurLocality=(lat:number,lng:number)=>catalog.map(place=>({place,distance:Math.hypot((place.lat-lat)*111,(place.lng-lng)*99)})).sort((a,b)=>a.distance-b.distance)[0];
export const inJaipurBounds=(lat:number,lng:number)=>Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=26.5&&lat<=27.4&&lng>=75.3&&lng<=76.3;
export const validJaipurPin=(pin:string)=>/^30[23]\d{3}$/.test(pin);
export const isJaipur=(city:string)=>city.trim().toLowerCase()==='jaipur';
export function requireJaipur(city:string){if(!isJaipur(city))throw new Error('Nexora Food currently supports Jaipur only. Please choose a Jaipur delivery address.');}
