import {useEffect, useState} from 'react';
import {Star, MapPin, TicketPercent, Heart, Clock} from 'lucide-react';

import type {RestaurantCardData} from './RestaurantCard';

type Props = {
  restaurant: RestaurantCardData;
  onOpen?: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
};

const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const rupees = new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0});

/** Offers are supplied by the caller; this component never fabricates discounts or distance. */
export default function RestaurantCardTailwind({restaurant: r, onOpen, onFavorite, isFavorite = false}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [r.imageUrl]);
  const rating = validNumber(r.rating) && r.rating > 0 && r.rating <= 5 ? r.rating.toFixed(1) : 'New';
  const distance = validNumber(r.distanceKm) ? `${r.distanceKm.toFixed(1)} km` : null;
  const image = r.imageUrl && !imageFailed ? (
    <img className="block h-full w-full object-cover transition duration-300 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none" src={r.imageUrl} alt={r.imageAlt || `${r.name} exterior`} width={960} height={640}
      loading="lazy" decoding="async" onError={() => setImageFailed(true)}/>
  ) : <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-stone-100 p-5 text-sm text-stone-500" role="img" aria-label={`Photo unavailable for ${r.name}`}><MapPin size={26}/><span>{r.name}</span></div>;

  const details = <>
    <span className="mb-2 block"><span className="block break-words text-lg font-extrabold leading-snug tracking-tight">{r.name}</span></span>
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs leading-relaxed text-slate-500"><span className="min-w-0 break-words" title={r.cuisines.join(', ')}>{r.cuisines.length ? r.cuisines.join(' · ') : 'Cuisine details unavailable'}</span><span className="text-slate-300" aria-hidden="true">|</span><span className="shrink-0 whitespace-nowrap font-semibold">{validNumber(r.costForTwoPaise) ? `${rupees.format(r.costForTwoPaise / 100)} for two` : 'Price unavailable'}</span></span>
    <span className="mt-1.5 flex flex-wrap items-start gap-x-2 gap-y-1 text-xs leading-relaxed text-slate-500"><span className="flex min-w-0 items-start gap-1 break-words"><MapPin size={13} aria-hidden="true"/>{[r.area, r.city].filter(Boolean).join(', ')}</span>{distance && <span className="shrink-0 whitespace-nowrap">• {distance}</span>}</span>
    {validNumber(r.prepMinutes) && <span className="mt-2 flex items-center gap-1 text-xs text-slate-500"><Clock size={12} aria-hidden="true"/>{r.prepMinutes} min prep</span>}
  </>;

  return <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
    <div className="relative aspect-video overflow-hidden bg-stone-100">
      {onOpen ? <button type="button" className="block h-full w-full overflow-hidden bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orange-500" onClick={() => onOpen(r.id)} aria-label={`View ${r.name}`}>{image}</button> : <div className="block h-full w-full overflow-hidden bg-transparent p-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orange-500">{image}</div>}
      <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-xs font-bold text-white shadow" title={r.reviewCount ? `${r.reviewCount} reviews` : 'Restaurant rating'}><Star size={12} fill="currentColor" aria-hidden="true"/>{rating}</span>
      {!!r.tags?.length && <div className="pointer-events-none absolute left-3 top-3 flex max-w-[calc(100%-64px)] flex-wrap gap-1.5">{r.tags.map((t, i) => <span key={`${t.label}-${i}`} className={`rounded px-2 py-1 text-[10px] font-extrabold tracking-wide text-white shadow ${t.variant === 'dark' ? 'bg-slate-900' : 'bg-orange-600'}`}>{t.label}</span>)}</div>}
      {onFavorite && <button type="button" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white p-0 text-slate-700 shadow aria-pressed:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500" onClick={() => onFavorite(r.id)} aria-label={`Save ${r.name}`} aria-pressed={isFavorite}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true"/></button>}
      {r.temporarilyClosed && <span className="pointer-events-none absolute bottom-3 left-3 max-w-[65%] rounded bg-slate-900/90 px-2 py-1 text-xs text-white">Temporarily closed</span>}
    </div>
    {onOpen ? <button type="button" className="block w-full bg-transparent p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orange-500" onClick={() => onOpen(r.id)}>{details}</button> : <div className="block w-full bg-transparent p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-orange-500">{details}</div>}
    {(r.bookingOffer?.text || r.bankOffer?.text || r.promoOffer?.text) && <div className="mt-auto grid gap-2 px-4 pb-4">
      {r.bookingOffer?.text && <div className="flex items-start gap-2 rounded-lg bg-emerald-600 p-2.5 text-xs leading-relaxed text-white"><TicketPercent size={16} aria-hidden="true"/><div className="min-w-0 flex-1 break-words"><strong>{r.bookingOffer.text}</strong>{r.bookingOffer.detail && <small className="mt-1 block text-[10px] leading-relaxed opacity-85">{r.bookingOffer.detail}</small>}</div>{validNumber(r.bookingOffer.moreCount) && Number.isInteger(r.bookingOffer.moreCount) && r.bookingOffer.moreCount > 0 && <span className="ml-auto shrink-0 whitespace-nowrap text-[10px] font-bold">+ {r.bookingOffer.moreCount} more</span>}</div>}
      {(r.bankOffer?.text || r.promoOffer?.text) && <div className="overflow-hidden rounded-lg border border-emerald-100 bg-emerald-50">
      {r.bankOffer?.text && <div className="p-2.5 text-xs leading-relaxed text-emerald-800"><strong>{r.bankOffer.text}</strong>{r.bankOffer.detail && <small className="mt-1 block text-[10px] leading-relaxed opacity-85">{r.bankOffer.detail}</small>}</div>}
      {r.promoOffer?.text && <div className="p-2.5 text-xs leading-relaxed text-violet-700 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-emerald-100"><span>{r.promoOffer.text}</span>{r.promoOffer.code && <code className="ml-1 inline-block rounded border border-dashed border-violet-300 px-1 font-sans font-bold">{r.promoOffer.code}</code>}{r.promoOffer.detail && <small className="mt-1 block text-[10px] leading-relaxed opacity-85">{r.promoOffer.detail}</small>}</div>}
      </div>}
    </div>}
  </article>;
}
