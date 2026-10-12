import type {Restaurant} from '../model';
export default function RestaurantListingStatus({restaurants,onManage}:{restaurants:Restaurant[];onManage:()=>void}){
 const pending=restaurants.filter(r=>r.status!=='active');
 if(!pending.length)return null;
 return <section className="notice" aria-label="Your restaurant listing status"><strong>Your restaurant listing status</strong>{pending.map(r=><p key={r.id}><strong>{r.name}</strong> · {r.address}<br/>Status: {r.status}. {r.status==='pending'?'Awaiting platform approval. Your restaurant appears in customer search after activation.':'This listing is not currently active in customer search.'}</p>)}<p>Search uses the saved restaurant name and address. Check these details before requesting approval.</p><button className="secondary" onClick={onManage}>Manage restaurant listing</button></section>;
}
