import {useEffect, useRef, useState, type ReactNode, type MouseEvent} from 'react';
import {Star, Heart, MapPin, Phone, Clock, Images, ArrowLeft, X, ChevronLeft, ChevronRight, TicketPercent, ExternalLink} from 'lucide-react';
import type {Restaurant, Item} from '../model';
import {money} from '../model';
import RestaurantCard from './RestaurantCard';
import RestaurantReviews from './RestaurantReviews';
import {buildRecommendations,isMockRestaurant} from './recommendations';
import './RestaurantDetail.css';

export type DiningDeal = {id:string; title:string; kind:'prebooking'|'walkin'; detail?:string; code?:string};
type Props = {restaurant:Restaurant; items:Item[]; related:Restaurant[]; children:ReactNode; onBack:()=>void; onOpen:(id:string)=>void; onLogin:()=>void; signedIn:boolean; demo:boolean; onFavorite:()=>void; isFavorite:boolean};
const demoDeals:DiningDeal[] = [
  {id:'sample-50',kind:'prebooking',title:'Flat 50% off + Free Drink',detail:'Example only · Mon–Sun · ₹25 booking fee'},
  {id:'sample-guest',kind:'prebooking',title:'Flat 50% off + Free Drink Per Guest',detail:'Example only · Mon–Sun · ₹25 booking fee'},
  {id:'sample-20',kind:'prebooking',title:'Flat 20% off on total bill',detail:'Example only · Mon–Sun · ₹25 booking fee'},
  {id:'sample-10',kind:'walkin',title:'Flat 10% off on total bill',detail:'Example only · Restaurant confirmation required'},
];
const demoPayments = [{title:'10% cashback on bill payment',code:''},{title:'Cashback ₹125',code:'PAYTMNEW'},{title:'Cashback ₹50',code:'PAYTMUPI'},{title:'Flat 10% off',code:'HDFCINFINIA'},{title:'Flat ₹200 off',code:'HDFCCARDS'},{title:'Cashback ₹100',code:'MBKDINE'},{title:'Cashback ₹50',code:'MBKWALLET'},{title:'Flat 10% off',code:'HDFCCCEMI'},{title:'Flat 10% off',code:'HDFCDINERS'},{title:'10% cashback with eligible HDFC credit cards',code:''},{title:'5% cashback with eligible HDFC credit cards',code:''}];
const safeDistance = (value?:number|null) => typeof value==='number' && Number.isFinite(value) && value>=0 ? `${value.toFixed(1)} km` : null;

function DetailPhoto({src,alt}:{src?:string;alt:string}) {
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[src]);
  return src&&!failed?<img src={src} alt={alt} loading="lazy" onError={()=>setFailed(true)}/>:<div className="rd-photo-fallback"><Images aria-hidden="true"/>Photo unavailable</div>;
}

/** Optional fields come from restaurant records. Demo dining deals cannot be redeemed. */
export default function RestaurantDetail({restaurant:r,items,related,children,onBack,onOpen,onLogin,signedIn,demo,onFavorite,isFavorite}:Props) {
  const [tab,setTab]=useState('Dineout');
  const [mockPreview,setMockPreview]=useState<Restaurant|null>(null);
  const mockDialog=useRef<HTMLDialogElement>(null);
  const suggestions=buildRecommendations(r,related);
  function openSuggestion(x:Restaurant){if(isMockRestaurant(x)){setMockPreview(x);mockDialog.current?.showModal()}else onOpen(x.id);}
  const [offerTab,setOfferTab]=useState<'prebooking'|'walkin'>('prebooking');
  const [dealIndex,setDealIndex]=useState(0);
  const [gallery,setGallery]=useState<number|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement|null>(null);
  const photos=[...(r.gallery_urls||[]).map((src,i)=>({src,alt:`${r.name} restaurant photo ${i+1}`})),...(r.cover_url?[{src:r.cover_url,alt:demo?`AI concept exterior of ${r.name}`:`${r.name} exterior`}]:[]),...items.filter(i=>i.image_url).map(i=>({src:i.image_url!,alt:i.name}))].filter((p,i,a)=>a.findIndex(x=>x.src===p.src)===i);
  const deals=demo?demoDeals:(r.dining_offers|| (r.booking_offer?[{id:'booking',kind:'prebooking' as const,title:r.booking_offer.text,detail:r.booking_offer.detail}]:[]));
  const shownDeals=deals.filter(d=>d.kind===offerTab);
  const activeDeal=shownDeals[dealIndex%Math.max(shownDeals.length,1)];
  const payments=demo?demoPayments:[...(r.bank_offer?[{title:r.bank_offer.text,code:''}]:[]),...(r.promo_offer?[{title:r.promo_offer.text,code:r.promo_offer.code||''}]:[])];
  const distance=safeDistance(r.distance_km);
  const directions=`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${r.address}, ${r.city}`)}`;
  const phone=r.phone?.replace(/[\s()-]/g,'');
  const validPhone=phone&&/^\+?\d{7,15}$/.test(phone);
  function openGallery(index:number,e:MouseEvent<HTMLButtonElement>) {trigger.current=e.currentTarget;setGallery(index);dialog.current?.showModal();}
  function closeGallery(){dialog.current?.close();setGallery(null);trigger.current?.focus();}
  function selectTab(value:string){setTab(value);}
  function goMenu(){setTab('Menu');requestAnimationFrame(()=>document.getElementById('rd-menu')?.scrollIntoView({behavior:'smooth'}));}

  return <div className="restaurant-detail">
    <nav className="rd-breadcrumb" aria-label="Breadcrumb"><button onClick={onBack}>Home</button><span>/</span><button onClick={onBack}>Jaipur</button><span>/</span><span aria-current="page">{r.name}</span></nav>
    <button className="back" onClick={onBack}><ArrowLeft size={16}/>Back to discovery</button>
    <nav className="rd-tabs" aria-label="Restaurant sections">{['Dineout','Photos','Menu'].map(t=><button key={t} aria-current={tab===t?'page':undefined} className={tab===t?'active':''} onClick={()=>selectTab(t)}>{t}</button>)}</nav>
    <section className="rd-hero" aria-label="Restaurant overview">
      <div className="rd-hero-photo"><DetailPhoto src={r.cover_url} alt={demo?`AI concept exterior of ${r.name}`:`${r.name} exterior`}/>{photos.length>0&&<button className="rd-images-button" onClick={e=>openGallery(0,e)}><Images size={15}/>Show all images</button>}</div>
      <div className="rd-overview"><p className="eyebrow">NEXORA FOOD · JAIPUR</p><h1>{r.name}</h1><p className="rd-address">{distance&&<strong>{distance} · </strong>}{r.address}{!r.address.includes(r.city)&&`, ${r.city}`}</p><div className="rd-summary"><span className="rd-rating"><Star size={13} fill="currentColor"/>{r.rating_count>0?r.rating_avg.toFixed(1):'—'}</span><span>{r.rating_count>0?`${r.rating_count} reviews`:'Too few ratings'}</span><span>{r.cuisines?.join(' · ')||r.description}</span><strong>{Number.isFinite(r.avg_cost_for_two_paise)?`${money(r.avg_cost_for_two_paise)} for two`:'Price unavailable'}</strong></div><p className="rd-description">{r.description}</p><div className="rd-actions"><span><Clock size={14}/>{r.is_temporarily_closed?'Temporarily closed':r.opening_text||'Hours not provided'}</span><a href={directions} target="_blank" rel="noopener noreferrer"><MapPin size={14}/>Directions</a>{validPhone?<a href={`tel:${phone}`}><Phone size={14}/>Call</a>:<span className="rd-muted">Phone not provided</span>}</div><button className="secondary rd-save" onClick={onFavorite} aria-pressed={isFavorite}><Heart size={15} fill={isFavorite?'currentColor':'none'}/>{isFavorite?'Saved':'Save restaurant'}</button><button className="primary rd-main-cta" onClick={!signedIn?onLogin:goMenu}>{!signedIn?'Login to explore offers & order':'View menu & order online'}</button></div>
    </section>
    <div className="rd-columns"><div className="rd-content">
      {tab==='Dineout'&&<section className="rd-section" id="rd-offers" aria-label="Offers for you"><h2>Offers for you</h2>{demo&&<p className="rd-demo-notice">Sample dining offers · Layout preview only. These deals and bank codes cannot be booked or redeemed on Nexora.</p>}<div className="rd-offer-tabs">{(['prebooking','walkin'] as const).map(t=><button key={t} className={offerTab===t?'active':''} aria-pressed={offerTab===t} onClick={()=>{setOfferTab(t);setDealIndex(0)}}>{t==='prebooking'?'Pre-booking offers':'Walk-in offers'}</button>)}</div>{activeDeal?<article className="rd-deal"><span className="eyebrow"><TicketPercent size={14}/>{demo?'SAMPLE DEAL':'RESTAURANT OFFER'}</span><h3>{activeDeal.title}</h3><p>{activeDeal.detail||'Ask the restaurant for eligibility and terms.'}</p><div className="rd-deal-controls"><button aria-label="Previous offer" onClick={()=>setDealIndex((dealIndex+shownDeals.length-1)%shownDeals.length)} disabled={shownDeals.length<2}><ChevronLeft size={18}/></button><span>{dealIndex%shownDeals.length+1} / {shownDeals.length}</span><button aria-label="Next offer" onClick={()=>setDealIndex((dealIndex+1)%shownDeals.length)} disabled={shownDeals.length<2}><ChevronRight size={18}/></button></div></article>:<div className="rd-empty">No {offerTab==='prebooking'?'pre-booking':'walk-in'} deals have been published for this restaurant.</div>}{payments.length>0&&<div className="rd-payment-grid">{payments.map((p,i)=><div key={`${p.code}-${i}`}><strong>{p.title}</strong>{p.code&&<code>{p.code}</code>}<small>{demo?'Illustrative code · Not redeemable':'Eligibility and terms apply'}</small></div>)}</div>}</section>}
      {(tab==='Menu'||tab==='Dineout')&&<section className="rd-section" id="rd-menu"><div className="rd-section-intro"><h2>Menu</h2><p>{r.cuisines?.join(' · ')||'Freshly prepared food'} · {items.length} dishes</p></div>{!!r.menu_pages?.length&&<div className="rd-menu-pages">{r.menu_pages.map((src,i)=><a key={src} href={src} target="_blank" rel="noopener noreferrer" aria-label={`Open menu page ${i+1}`}><DetailPhoto src={src} alt={`Menu page ${i+1}`}/><span>Page {i+1} / {r.menu_pages!.length}</span></a>)}</div>}{children}</section>}
      {(tab==='Photos'||tab==='Dineout')&&<section className="rd-section"><h2>Photos</h2>{demo&&<p className="rd-muted">AI-generated restaurant concepts and dish photographs.</p>}{photos.length?<div className="rd-photo-grid">{photos.map((p,i)=><button key={p.src} aria-label={`Enlarge ${p.alt}`} onClick={e=>openGallery(i,e)}><DetailPhoto src={p.src} alt={`Gallery photo of ${p.alt}`}/></button>)}</div>:<p>No photos uploaded yet.</p>}</section>}
      {tab==='Dineout'&&<section className="rd-section"><h2>Amenities</h2>{r.amenities?.length?<div className="rd-amenities">{r.amenities.map(a=><span key={a}>✓ {a}</span>)}</div>:<p>Restaurant amenities have not been provided yet.</p>}</section>}
      <RestaurantReviews restaurantId={r.id} demo={demo}/><section className="rd-section"><h2>Location</h2><p>{distance&&`${distance} · `}{r.address}, {r.city}, Rajasthan</p><a className="rd-map-link" href={directions} target="_blank" rel="noopener noreferrer"><MapPin size={18}/>Find on OpenStreetMap<ExternalLink size={14}/></a></section>
    </div><aside className="rd-app-card"><span className="eyebrow">GOOD FOOD, ON THE GO</span><h2>Explore Nexora on your phone</h2><img src="/images/nexora-web-qr.svg" alt="QR code to open Nexora Food website" width={168} height={168}/><p>Scan to open the responsive customer website.</p><a href="https://nexora-food.templateapp67.chatgpt.site" className="rd-web-link">Open Nexora Web<ExternalLink size={14}/></a><small>Android app source is being prepared. Store listings and an installable APK are not available yet.</small></aside></div>
    {([{key:'casual',title:'Recommended options in Casual Dining',data:suggestions.casual},{key:'near',title:`Near ${r.name}`,data:suggestions.near},{key:'north',title:'More North Indian restaurants',data:suggestions.north}]).map(group=><section key={group.key} className="rd-section rd-recommendations" aria-label={group.title}><h2>{group.title}</h2>{group.data.some(isMockRestaurant)&&<p className="rd-mock-note">Mock cards fill empty places and are replaced as matching real restaurants become available. Example distances and offers are not live.</p>}<div className="dining-card-grid">{group.data.map(x=><RestaurantCard key={x.id} restaurant={{id:x.id,name:x.name,imageUrl:x.cover_url,imageAlt:isMockRestaurant(x)?`Mock restaurant concept: ${x.name}`:`${x.name} exterior`,rating:x.rating_count?x.rating_avg:null,cuisines:x.cuisines||[],costForTwoPaise:x.avg_cost_for_two_paise,area:x.address.replace(/,\s*Jaipur\s*$/i,''),city:x.city,distanceKm:x.distance_km,bookingOffer:x.booking_offer,bankOffer:x.bank_offer,promoOffer:x.promo_offer,tags:isMockRestaurant(x)?[{label:'MOCK DATA'}]:x.special_tags}} onOpen={()=>openSuggestion(x)}/>)}</div></section>)}
    <section className="rd-section" aria-label="Brands near you"><h2>Brands near you</h2><div className="rd-brands">{suggestions.brands.map(x=><button key={x.id} onClick={()=>openSuggestion(x)}>{x.name}{isMockRestaurant(x)&&<small>Mock</small>}</button>)}</div></section>
    <dialog ref={mockDialog} className="rd-gallery-dialog rd-mock-dialog" aria-label="Mock restaurant preview" onClose={()=>setMockPreview(null)} onCancel={()=>setMockPreview(null)}><div className="rd-gallery-top"><strong>Mock restaurant preview</strong><button autoFocus aria-label="Close mock preview" onClick={()=>mockDialog.current?.close()}><X/></button></div>{mockPreview&&<><DetailPhoto src={mockPreview.cover_url} alt={`Mock concept of ${mockPreview.name}`}/><h2>{mockPreview.name}</h2><p>{mockPreview.address}</p><p>Illustrative restaurant, image and offers for preview only. Ordering and booking are unavailable for this mock. Real restaurant records automatically replace these examples in the related sections.</p></>}</dialog>
    <dialog className="rd-gallery-dialog" ref={dialog} onCancel={()=>setGallery(null)} onClose={()=>{setGallery(null);trigger.current?.focus()}} aria-label={`${r.name} photo viewer`}><div className="rd-gallery-top"><strong>{r.name} · Photos</strong><button autoFocus aria-label="Close photos" onClick={closeGallery}><X/></button></div>{gallery!==null&&photos[gallery]&&<><DetailPhoto {...photos[gallery]}/><div className="rd-gallery-bottom"><button aria-label="Previous photo" onClick={()=>setGallery((gallery+photos.length-1)%photos.length)} disabled={photos.length<2}><ChevronLeft/></button><span>{gallery+1} / {photos.length} · {photos[gallery].alt}</span><button aria-label="Next photo" onClick={()=>setGallery((gallery+1)%photos.length)} disabled={photos.length<2}><ChevronRight/></button></div></>}</dialog>
  </div>;
}
