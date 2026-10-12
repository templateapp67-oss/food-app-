import {afterEach,it,expect} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
import {PopularFoodGrid} from './MockFoodDiscovery';
import JaipurNeighbourhoods from './JaipurNeighbourhoods';
import {items} from '../demo';
afterEach(cleanup);
it('shows only active live menu data without default sample food fallbacks',()=>{const real={...items[0],id:'real-item',name:'Rambharose Special Thali',is_demo:false};render(<PopularFoodGrid items={[...items,real]} allowSamples={false} onSearch={()=>{}}/>);expect(screen.getByRole('button',{name:/Rambharose Special Thali/})).toBeDefined();expect(screen.queryByText('Margherita Pizza')).toBeNull();expect(screen.queryByText(/Sample/)).toBeNull()});
it('keeps actual Jaipur location cards but hides sample suggestions in live mode',()=>{render(<JaipurNeighbourhoods restaurants={[]} allowSamples={false} selected="" onSelect={()=>{}}/>);expect(screen.getAllByRole('button')).toHaveLength(12);expect(screen.queryByText('Sample preview')).toBeNull();expect(screen.getAllByText('No active restaurants yet')).toHaveLength(12)});
