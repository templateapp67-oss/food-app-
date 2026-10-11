import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {DeliveryAddressForm} from './DeliveryAddressForm';
vi.mock('./geolocation',()=>({locateJaipur:async(fill:(value:unknown)=>void)=>{const value={latitude:26.9124,longitude:75.7873,accuracy:0,area:'',pincode:'',street:'',warning:'Current location found. Address lookup is unavailable.'};fill(value);return value},searchJaipurAddress:vi.fn()}));
afterEach(cleanup);
it('keeps a GPS fix with zero reported accuracy when customers complete an unavailable address lookup',async()=>{
 const save=vi.fn().mockResolvedValue(undefined);render(<DeliveryAddressForm busy={false} onSave={save}/>);
 expect(screen.queryByLabelText('Latitude')).toBeNull();expect(screen.queryByLabelText('Longitude')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Use current location'}));await screen.findByRole('alert');
 fireEvent.change(screen.getByLabelText('Jaipur area / locality'),{target:{value:'C Scheme'}});fireEvent.change(screen.getByLabelText('PIN code'),{target:{value:'302001'}});fireEvent.change(screen.getByLabelText('House / flat and street'),{target:{value:'24 Test Street'}});
 fireEvent.click(screen.getByRole('button',{name:'Save address'}));await waitFor(()=>expect(save).toHaveBeenCalledWith(expect.objectContaining({latitude:26.9124,longitude:75.7873,line1:'24 Test Street'})));
});
