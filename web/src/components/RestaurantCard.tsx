import {useEffect, useState} from 'react';
import {Star, MapPin, TicketPercent, Heart, Clock} from 'lucide-react';
import './RestaurantCard.css';

export type CardOffer = {text: string; detail?: string; moreCount?: number};
export type RestaurantCardData = {
  id: string;
  name: string;
  imageUrl?: string;
  imageAlt?: string;
  rating?: number | null;
  reviewCount?: number;
  cuisines: string[];
  costForTwoPaise?: number | null;
  area: string;
  city: string;
  distanceKm?: number | null;
  bookingOffer?: CardOffer;
  bankOffer?: CardOffer;
  promoOffer?: CardOffer & {code?: string};
  tags?: {label: string; variant?: 'orange' | 'dark'}[];
  prepMinutes?: number;
  temporarilyClosed?: boolean;
};

type Props = {
  restaurant: RestaurantCardData;
  onOpen?: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
};

const validNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const rupees = new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0});

/** Offers are supplied by the caller; this component never fabricates discounts or distance. */
export default function RestaurantCard({restaurant: r, onOpen, onFavorite, isFavorite = false}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [r.imageUrl]);
  const rating = validNumber(r.rating) && r.rating > 0 && r.rating <= 5 ? r.rating.toFixed(1) : 'New';
  const distance = validNumber(r.distanceKm) ? `${r.distanceKm.toFixed(1)} km` : null;
  const image = r.imageUrl && !imageFailed ? (
    <img src={r.imageUrl} alt={r.imageAlt || `${r.name} exterior`} width={960} height={640}
      loading="lazy" decoding="async" onError={() => setImageFailed(true)}/>
  ) : <div className="dining-card__placeholder" role="img" aria-label={`Photo unavailable for ${r.name}`}><MapPin size={26}/><span>{r.name}</span></div>;

  const details = <>
    <span className="dining-card__title"><span className="dining-card__name">{r.name}</span></span>
    <span className="dining-card__row"><span className="dining-card__cuisines" title={r.cuisines.join(', ')}>{r.cuisines.length ? r.cuisines.join(' · ') : 'Cuisine details unavailable'}</span><span className="dining-card__separator" aria-hidden="true">|</span><span className="dining-card__cost">{validNumber(r.costForTwoPaise) ? `${rupees.format(r.costForTwoPaise / 100)} for two` : 'Price unavailable'}</span></span>
    <span className="dining-card__row dining-card__location"><span><MapPin size={13} aria-hidden="true"/>{[r.area, r.city].filter(Boolean).join(', ')}</span>{distance && <span className="dining-card__distance">• {distance}</span>}</span>
    {validNumber(r.prepMinutes) && <span className="dining-card__prep"><Clock size={12} aria-hidden="true"/>{r.prepMinutes} min prep</span>}
  </>;

  return <article className="dining-card">
    <div className="dining-card__media">
      {onOpen ? <button type="button" className="dining-card__cover" onClick={() => onOpen(r.id)} aria-label={`View ${r.name}`}>{image}</button> : <div className="dining-card__cover">{image}</div>}
      <span className="dining-card__rating" title={r.reviewCount ? `${r.reviewCount} reviews` : 'Restaurant rating'}><Star size={12} fill="currentColor" aria-hidden="true"/>{rating}</span>
      {!!r.tags?.length && <div className="dining-card__tags">{r.tags.map((t, i) => <span key={`${t.label}-${i}`} className={`dining-card__tag dining-card__tag--${t.variant || 'orange'}`}>{t.label}</span>)}</div>}
      {onFavorite && <button type="button" className="dining-card__favorite" onClick={() => onFavorite(r.id)} aria-label={`Save ${r.name}`} aria-pressed={isFavorite}><Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true"/></button>}
      {r.temporarilyClosed && <span className="dining-card__closed">Temporarily closed</span>}
    </div>
    {onOpen ? <button type="button" className="dining-card__details" onClick={() => onOpen(r.id)}>{details}</button> : <div className="dining-card__details">{details}</div>}
    {(r.bookingOffer?.text || r.bankOffer?.text || r.promoOffer?.text) && <div className="dining-card__offers">
      {r.bookingOffer?.text && <div className="dining-card__booking"><TicketPercent size={16} aria-hidden="true"/><div className="dining-card__booking-copy"><strong>{r.bookingOffer.text}</strong>{r.bookingOffer.detail && <small>{r.bookingOffer.detail}</small>}</div>{validNumber(r.bookingOffer.moreCount) && Number.isInteger(r.bookingOffer.moreCount) && r.bookingOffer.moreCount > 0 && <span className="dining-card__more">+ {r.bookingOffer.moreCount} more</span>}</div>}
      {(r.bankOffer?.text || r.promoOffer?.text) && <div className="dining-card__secondary">
      {r.bankOffer?.text && <div className="dining-card__bank"><strong>{r.bankOffer.text}</strong>{r.bankOffer.detail && <small>{r.bankOffer.detail}</small>}</div>}
      {r.promoOffer?.text && <div className="dining-card__promo"><span>{r.promoOffer.text}</span>{r.promoOffer.code && <code>{r.promoOffer.code}</code>}{r.promoOffer.detail && <small>{r.promoOffer.detail}</small>}</div>}
      </div>}
    </div>}
  </article>;
}
