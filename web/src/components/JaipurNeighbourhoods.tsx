import {useState} from 'react';
import {ArrowRight,MapPin,Search} from 'lucide-react';
import {jaipurCatalog,isJaipur} from '../locations';
import {matchesRestaurantArea} from '../restaurantDiscovery';
import type {Restaurant} from '../model';
const featured=['C Scheme','Malviya Nagar','Vaishali Nagar','Mansarovar','Raja Park','Jagatpura','Bani Park','Tonk Road','Shyam Nagar','Civil Lines'];
const samples=['North Indian · Thali','Biryani · Chinese','Pizza · Café','South Indian · Thali','Street food · Sweets'];
const normalize=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
export default function JaipurNeighbourhoods({restaurants,selected,onSelect}:{restaurants:Restaurant[];selected:string;onSelect:(area:string)=>void}){
 const[search,setSearch]=useState('');
 const counts=new Map<string,number>();
 for(const area of jaipurCatalog){const n=restaurants.filter(r=>!r.is_demo&&r.status==='active'&&isJaipur(r.city)&&matchesRestaurantArea(r,area.name)).length;if(n)counts.set(area.name,n)}
 const all=[...jaipurCatalog].sort((a,b)=>{const live=Number(counts.has(b.name))-Number(counts.has(a.name));if(live)return live;const ai=featured.indexOf(a.name),bi=featured.indexOf(b.name);return(ai<0?999:ai)-(bi<0?999:bi)});
 const term=normalize(search),places=term?all.filter(a=>[a.name,...a.aliases].some(name=>normalize(name).includes(term))):all.slice(0,10);
 return <section className="jaipur-areas" aria-labelledby="jaipur-areas-title"><div className="section-heading"><div><p className="eyebrow">ONE CITY. SO MANY FLAVOURS.</p><h2 id="jaipur-areas-title">Explore Jaipur neighbourhoods</h2></div><span className="city-badge"><MapPin size={14}/>Jaipur only</span></div><p>Explore 10 featured places, or search all Jaipur neighbourhoods. Sample food suggestions are replaced automatically when live restaurants are listed.</p><label className="search-box neighbourhood-search"><Search size={18}/><input aria-label="Search Jaipur neighbourhoods" placeholder="Search any Jaipur place, e.g. Jagatpura" value={search} onChange={e=>setSearch(e.target.value)}/></label><p className="muted" role="status">{term?`${places.length} matching places`:'10 featured places'}</p><div className="locality-grid">{places.map((a,i)=><button key={a.name} aria-label={`Food in ${a.name}`} aria-pressed={selected===a.name} onClick={()=>onSelect(a.name)}><span><strong>Food in {a.name}</strong>{counts.has(a.name)?<small>{counts.get(a.name)} live {counts.get(a.name)===1?'restaurant':'restaurants'}</small>:<><small>{samples[i%samples.length]}</small><small className="locality-preview">Sample preview</small></>}</span><ArrowRight size={14}/></button>)}</div>{!places.length&&<p>No Jaipur places match this search. Try another name.</p>}</section>
}
