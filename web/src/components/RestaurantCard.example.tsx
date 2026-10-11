import RestaurantCard, {type RestaurantCardData} from './RestaurantCard';

// Illustrative data only: replace with validated restaurant/offer records from your API.
const restaurant: RestaurantCardData = {
  id: 'example-kitchen', name: 'The Gourmet Kitchen', rating: 4.7, reviewCount: 128,
  imageUrl: '/images/punjab-kitchen.webp', imageAlt: 'Generated restaurant concept',
  cuisines: ['North Indian', 'Continental'], costForTwoPaise: 100000,
  area: 'Vaishali Nagar', city: 'Jaipur', distanceKm: 4.7,
  bookingOffer: {text: 'Flat 25% off on pre-booking', detail: 'Selected slots · Terms apply', moreCount: 4},
  bankOffer: {text: 'Up to 10% off with eligible bank cards'},
  promoOffer: {text: 'Get extra ₹125 off using', code: 'PAYTMNEW'},
  tags: [{label: 'GIRF SPECIAL'}, {label: 'OUT', variant: 'dark'}],
};

export default function RestaurantCardExample() {
  return <div className="dining-card-grid"><RestaurantCard restaurant={restaurant}/></div>;
}
