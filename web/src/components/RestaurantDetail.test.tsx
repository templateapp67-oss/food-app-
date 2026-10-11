import {afterEach, beforeAll, describe, expect, it, vi} from 'vitest';
import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import RestaurantDetail from './RestaurantDetail';
import {restaurants} from '../demo';
afterEach(cleanup);
beforeAll(()=>{
  HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
});
const r={...restaurants[0],phone:'+91 98765 43210',opening_text:'Open till 11 PM',distance_km:5.1,amenities:['Reservation available']};
const callbacks={onBack:vi.fn(),onOpen:vi.fn(),onLogin:vi.fn(),onFavorite:vi.fn()};
describe('Restaurant detail sections',()=>{
 it('switches sample deal tabs and opens a navigable photo dialog',()=>{
  render(<RestaurantDetail {...callbacks} restaurant={r} items={[]} related={[]} signedIn={false} isFavorite={false} demo><div>Ordering menu</div></RestaurantDetail>);
  expect(screen.getByText('Flat 50% off + Free Drink')).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'Next offer'}));
  expect(screen.getByText('Flat 50% off + Free Drink Per Guest')).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'Walk-in offers'}));
  expect(screen.getByText('Flat 10% off on total bill')).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'Show all images'}));
  expect(screen.getByRole('dialog',{name:/photo viewer/})).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'Close photos'}));
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Photos'}));
  expect(screen.queryByText('Ordering menu')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Menu'}));
  expect(screen.getByText('Ordering menu')).toBeDefined();
 });
 it('does not publish demo offers to a live restaurant, and uses real supplied contact fields',()=>{
  render(<RestaurantDetail {...callbacks} restaurant={r} items={[]} related={[]} signedIn={false} isFavorite={false} demo={false}><div>Order food</div></RestaurantDetail>);
  expect(within(screen.getByRole('region',{name:'Offers for you'})).queryByText('PAYTMNEW')).toBeNull();
  expect(screen.getByText(/No pre-booking deals/)).toBeDefined();
  expect(screen.getByRole('link',{name:'Call'}).getAttribute('href')).toBe('tel:+919876543210');
  expect(screen.getByRole('link',{name:'Directions'}).getAttribute('href')).toContain('openstreetmap.org');
  expect(screen.getByText('Open till 11 PM')).toBeDefined();
  expect(screen.getByText('✓ Reservation available')).toBeDefined();
  fireEvent.click(screen.getByRole('button',{name:'Login to explore offers & order'}));
  expect(callbacks.onLogin).toHaveBeenCalled();
 });
});
