import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {DeliveryAddressForm} from './DeliveryAddressForm';
const {locate,search}=vi.hoisted(()=>({locate:vi.fn(),search:vi.fn()}));vi.mock('./geolocation',()=>({locateJaipur:locate,searchJaipurAddress:search}));
beforeEach(()=>{vi.resetAllMocks();locate.mockImplementation(async(fill:(value:unknown)=>void)=>{const value={latitude:26.9124,longitude:75.7873,accuracy:0,area:'',pincode:'',street:'',warning:'Current location found. Address lookup is unavailable.'};fill(value);return value})});
afterEach(cleanup);
it('keeps a GPS fix with zero reported accuracy when customers complete an unavailable address lookup',async()=>{
 const save=vi.fn().mockResolvedValue(undefined);render(<DeliveryAddressForm busy={false} onSave={save}/>);
 expect(screen.queryByLabelText('Latitude')).toBeNull();expect(screen.queryByLabelText('Longitude')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Use current location'}));await screen.findByRole('alert');
 fireEvent.change(screen.getByLabelText('Jaipur area / locality'),{target:{value:'C Scheme'}});fireEvent.change(screen.getByLabelText('PIN code'),{target:{value:'302001'}});fireEvent.change(screen.getByLabelText('House / flat and street'),{target:{value:'24 Test Street'}});
 fireEvent.click(screen.getByRole('button',{name:'Save address'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({latitude:26.9124,longitude:75.7873,line1:'24 Test Street'})));
});
it('prefills and locks an authenticated GPS area and saves without a street search',async()=>{
 const save=vi.fn().mockResolvedValue(undefined);render(<DeliveryAddressForm busy={false} onSave={save} initialLocation={{latitude:26.9124,longitude:75.7873,accuracy:8,area:'C Scheme',pincode:'302001',street:'Park Avenue',source:'gps'}}/>);
 expect((screen.getByLabelText('Jaipur area / locality')as HTMLSelectElement).disabled).toBe(true);expect((screen.getByLabelText('PIN code')as HTMLInputElement).value).toBe('302001');fireEvent.change(screen.getByLabelText('House / flat and street'),{target:{value:'24 Park Avenue'}});fireEvent.click(screen.getByRole('button',{name:'Save address'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({latitude:26.9124,line1:'24 Park Avenue'})));
});
it('does not prefill delivery coordinates from a default discovery hub',()=>{
 render(<DeliveryAddressForm busy={false} onSave={vi.fn()} initialLocation={{latitude:26.9124,longitude:75.7873,accuracy:0,area:'Jaipur',pincode:'',street:'',source:'fallback'}}/>);expect((document.querySelector('input[name=latitude]')as HTMLInputElement).value).toBe('');expect((screen.getByLabelText('Jaipur area / locality')as HTMLSelectElement).disabled).toBe(false);
});
it('fills a form already open when background GPS resolves while preserving a typed flat number',()=>{
 const props={busy:false,onSave:vi.fn()};const{rerender}=render(<DeliveryAddressForm {...props} initialLocation={null}/>);fireEvent.change(screen.getByLabelText('House / flat and street'),{target:{value:'Flat 24'}});rerender(<DeliveryAddressForm {...props} initialLocation={{latitude:26.9124,longitude:75.7873,area:'C Scheme',pincode:'302001',street:'Park Avenue',accuracy:8,source:'gps'}}/>);expect((screen.getByLabelText('House / flat and street')as HTMLInputElement).value).toBe('Flat 24');expect((screen.getByLabelText('Jaipur area / locality')as HTMLSelectElement).value).toBe('C Scheme');expect((screen.getByLabelText('Jaipur area / locality')as HTMLSelectElement).disabled).toBe(true);expect((screen.getByLabelText('PIN code')as HTMLInputElement).value).toBe('302001');
});

it('drops old GPS coordinates when a customer chooses a different delivery area',()=>{
 render(<DeliveryAddressForm busy={false} onSave={vi.fn()} initialLocation={{latitude:26.9124,longitude:75.7873,area:'C Scheme',pincode:'302001',street:'Park Avenue',accuracy:8,source:'gps'}}/>);
 fireEvent.click(screen.getByRole('button',{name:'Change area manually'}));fireEvent.change(screen.getByLabelText('Jaipur area / locality'),{target:{value:'Jhotwara'}});
 expect((document.querySelector('input[name=latitude]')as HTMLInputElement).value).toBe('');
 expect(screen.getByRole('button',{name:'Save address'})).toBeDefined();
});

it('saves a complete manual address after GPS denial without requiring geocoding',async()=>{
 locate.mockRejectedValue(new Error('Location permission denied'));search.mockRejectedValue(new Error('Address lookup offline'));const save=vi.fn().mockResolvedValue(undefined);render(<DeliveryAddressForm busy={false} onSave={save}/>);
 fireEvent.change(screen.getByLabelText('House / flat and street'),{target:{value:'118 Durga Vihar D'}});fireEvent.change(screen.getByLabelText('Jaipur area / locality'),{target:{value:'Jhotwara'}});fireEvent.change(screen.getByLabelText('PIN code'),{target:{value:'302012'}});
 fireEvent.click(screen.getByRole('button',{name:'Use current location'}));await screen.findByRole('alert');
 expect((screen.getByLabelText('Jaipur area / locality')as HTMLSelectElement).value).toBe('Jhotwara');expect((screen.getByLabelText('PIN code')as HTMLInputElement).value).toBe('302012');
 fireEvent.click(screen.getByRole('button',{name:'Save address'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({line1:'118 Durga Vihar D',locality:'Jhotwara',pincode:'302012',latitude:null,longitude:null})));expect(search).not.toHaveBeenCalled();
});
