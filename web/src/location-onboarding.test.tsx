import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {renderHook,waitFor,cleanup} from '@testing-library/react';
import {useJaipurLocation} from './geolocation';
const position=vi.fn();
beforeEach(()=>{localStorage.clear();sessionStorage.clear();vi.stubGlobal('navigator',{geolocation:{getCurrentPosition:position}});position.mockReset();position.mockImplementation(success=>success({coords:{latitude:26.9124,longitude:75.7873,accuracy:8}}));vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:true,json:async()=>({address:{country_code:'in',city:'Jaipur',suburb:'C Scheme',postcode:'302001'}})}))});
afterEach(()=>{cleanup();vi.unstubAllGlobals()});
it('retries location after login even if the guest attempt was denied and does not repeat on session refresh',async()=>{
 position.mockImplementationOnce((_,reject)=>reject({code:1}));
 const {result,rerender}=renderHook(({id}:{id:string|null})=>useJaipurLocation(true,id),{initialProps:{id:null as string|null}});
 await waitFor(()=>expect(result.current.value?.source).toBe('fallback'));
 expect(localStorage.getItem('nexora.food.location')).toBeNull();
 rerender({id:'signed-in-user'});await waitFor(()=>expect(result.current.value?.area).toBe('C Scheme'));
 expect(result.current.value?.source).toBe('gps');expect(position).toHaveBeenCalledTimes(2);expect(position.mock.calls[1][2].enableHighAccuracy).toBe(true);
 rerender({id:'signed-in-user'});expect(position).toHaveBeenCalledTimes(2);
});
it('detects for a restored authenticated session even when a guest attempt flag already exists',async()=>{
 sessionStorage.setItem('nexora.location.attempted','true');const {result}=renderHook(()=>useJaipurLocation(true,'restored-user'));
 await waitFor(()=>expect(result.current.value?.area).toBe('C Scheme'));expect(position).toHaveBeenCalledOnce();
});
it('uses an explicitly marked Jaipur hub if permission is denied without inventing a delivery address',async()=>{
 position.mockImplementation((_,reject)=>reject({code:1}));const{result}=renderHook(()=>useJaipurLocation(true,'new-user'));
 await waitFor(()=>expect(result.current.busy).toBe(false));expect(result.current.value).toMatchObject({area:'Jaipur',source:'fallback',pincode:'',street:''});expect(result.current.error).toContain('permission denied');expect(localStorage.getItem('nexora.food.location')).toBeNull();
});
