import {afterEach, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import RestaurantCard, {type RestaurantCardData} from './RestaurantCard';
import RestaurantCardTailwind from './RestaurantCardTailwind';
afterEach(cleanup);
const base:RestaurantCardData = {id:'kitchen',name:'Jaipur Kitchen',rating:4.7,cuisines:['North Indian','Continental'],costForTwoPaise:100000,area:'Vaishali Nagar',city:'Jaipur'};
describe('Restaurant card information and actions',()=>{
 it('displays distinct offer sections, precise area, zero distance and special tags',()=>{render(<RestaurantCard restaurant={{...base,distanceKm:0,tags:[{label:'GIRF SPECIAL'},{label:'OUT',variant:'dark'}],bookingOffer:{text:'Flat 50% off on pre-booking',moreCount:4},bankOffer:{text:'10% off with eligible cards'},promoOffer:{text:'Get extra ₹125 off using',code:'PAYTMNEW'}}}/>);expect(screen.getByText('₹1,000 for two')).toBeDefined();expect(screen.getByText('North Indian · Continental')).toBeDefined();expect(screen.getByText('Vaishali Nagar, Jaipur')).toBeDefined();expect(screen.getByText('• 0.0 km')).toBeDefined();expect(screen.getByText('Flat 50% off on pre-booking')).toBeDefined();expect(screen.getByText('PAYTMNEW')).toBeDefined();expect(screen.getByText('OUT')).toBeDefined();expect(screen.getByText('+ 4 more')).toBeDefined();expect(screen.getByText('4.7').closest('.dining-card__media')).not.toBeNull();expect(screen.getByText('PAYTMNEW').closest('.dining-card__secondary')).not.toBeNull();});
 it('does not fabricate missing or invalid distance, price or offers',()=>{render(<RestaurantCard restaurant={{...base,rating:NaN,costForTwoPaise:Infinity,distanceKm:-1}}/>);expect(screen.getByText('New')).toBeDefined();expect(screen.getByText('Price unavailable')).toBeDefined();expect(screen.queryByText(/km$/)).toBeNull();expect(screen.queryByText(/off/)).toBeNull();expect(screen.queryByRole('button')).toBeNull();});
 it('separates favourite and open actions, with a failed photo fallback',()=>{const open=vi.fn(),favorite=vi.fn();render(<RestaurantCard restaurant={{...base,imageUrl:'https://example.invalid/photo.webp'}} onOpen={open} onFavorite={favorite}/>);fireEvent.click(screen.getByRole('button',{name:'Save Jaipur Kitchen'}));expect(favorite).toHaveBeenCalledWith('kitchen');expect(open).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'View Jaipur Kitchen'}));expect(open).toHaveBeenCalledWith('kitchen');fireEvent.error(screen.getByRole('img',{name:'Jaipur Kitchen exterior'}));expect(screen.getByRole('img',{name:'Photo unavailable for Jaipur Kitchen'})).toBeDefined();});
});

it('renders the Tailwind variant with supplied rating, offers and location',()=>{
 render(<RestaurantCardTailwind restaurant={{...base,distanceKm:5.3,bookingOffer:{text:'Flat 25% off on pre-booking',moreCount:4},bankOffer:{text:'Up to 10% off with bank offers'},promoOffer:{text:'Get extra ₹125 off using',code:'PAYTMNEW'}}}/>);
 expect(screen.getByText('4.7')).toBeDefined();
 expect(screen.getByText('+ 4 more')).toBeDefined();
 expect(screen.getByText('• 5.3 km')).toBeDefined();
 expect(screen.getByText('PAYTMNEW')).toBeDefined();
});
