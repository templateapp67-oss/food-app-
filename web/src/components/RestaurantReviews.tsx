import {useEffect,useState} from 'react';
import {supabase} from '../api';
export default function RestaurantReviews({restaurantId,demo}:{restaurantId:string;demo:boolean}){
 const[rows,setRows]=useState<{id:string;rating:number;body:string;created_at:string}[]>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;if(demo||!supabase)return;supabase.from('nexora_food_restaurant_reviews').select('id,rating,body,created_at').eq('restaurant_id',restaurantId).eq('status','visible').order('created_at',{ascending:false}).limit(30).then(({data,error})=>{if(!active)return;if(error)setError(error.message);else setRows(data||[])});return()=>{active=false}},[restaurantId,demo]);
 return <section className="rd-section"><h2>Customer reviews</h2>{error&&<p role="alert">{error}</p>}{!rows.length?<p>No customer reviews yet. Customers can review their delivered orders from My orders.</p>:<div className="rd-review-list">{rows.map(x=><article key={x.id}><strong>★ {x.rating} · Verified order</strong><p>{x.body}</p><small>{new Date(x.created_at).toLocaleDateString('en-IN')}</small></article>)}</div>}</section>;
}
