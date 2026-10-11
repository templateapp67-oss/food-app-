import {useState,type ReactNode} from 'react';
import type {Item} from '../model';
export default function MenuBrowser({items,children}:{items:Item[];children:(items:Item[])=>ReactNode}){
 const [query,setQuery]=useState(''),[category,setCategory]=useState('All'),[veg,setVeg]=useState(false),[best,setBest]=useState(false);
 const categoryOf=(item:Item)=>item.is_demo&&['Biryani','Pizza','Burgers','South Indian','North Indian','Healthy','Desserts'].includes(item.description)?item.description:'Menu';
 const categories=['All',...new Set(items.map(categoryOf))];
 const filtered=items.filter(i=>(category==='All'||categoryOf(i)===category)&&(!veg||i.is_veg)&&(!best||i.is_bestseller)&&(!query||`${i.name} ${i.description}`.toLowerCase().includes(query.toLowerCase())));
 return <><label className="search-box rd-menu-search"><input aria-label="Search this restaurant menu" placeholder="Search for dishes" value={query} onChange={e=>setQuery(e.target.value)}/></label><nav className="rd-menu-filters" aria-label="Menu categories">{categories.map(c=><button key={c} className="secondary" aria-pressed={c===category} onClick={()=>setCategory(c)}>{c}</button>)}<button className="secondary" aria-pressed={veg} onClick={()=>setVeg(!veg)}>Vegetarian dishes</button><button className="secondary" aria-pressed={best} onClick={()=>setBest(!best)}>Bestsellers</button></nav>{filtered.length?children(filtered):<p role="status">No dishes match these filters.</p>}</>;
}
