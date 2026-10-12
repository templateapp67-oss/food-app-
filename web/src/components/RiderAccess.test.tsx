import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import RiderAccess from './RiderAccess';
import {rpc} from '../api';
vi.mock('../api',()=>({rpc:vi.fn()}));
afterEach(()=>{cleanup();vi.resetAllMocks()});
const profile={id:'customer-1',full_name:'Vijay Kumar',phone:'',email:'test@example.test',is_blocked:false};
const base={profile,partner:null,hasRole:false,loading:false,error:'',onLogin:vi.fn(),onRefresh:vi.fn().mockResolvedValue(undefined),onCustomer:vi.fn(),previewHref:'?preview=demo#/rider'};
describe('Rider access onboarding',()=>{
 it('offers login without exposing a dispatch or application form',()=>{render(<RiderAccess {...base} profile={null}/>);expect(screen.queryByLabelText('Full name')).toBeNull();fireEvent.click(screen.getByText('Sign in / Register as rider'));expect(base.onLogin).toHaveBeenCalled()});
 it('normalizes Indian phone and submits only application details',async()=>{vi.mocked(rpc).mockResolvedValue(undefined);render(<RiderAccess {...base}/>);fireEvent.change(screen.getByLabelText('Indian mobile number'),{target:{value:'+91 9876543210'}});fireEvent.click(screen.getByText('Submit rider application'));await waitFor(()=>expect(rpc).toHaveBeenCalledWith('nexora_submit_rider_application',{p_name:'Vijay Kumar',p_phone:'9876543210'}));await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('Application saved'));expect(base.onRefresh).toHaveBeenCalled()});
 it('explains paused accounts without claiming application edits activate access',()=>{render(<RiderAccess {...base} hasRole partner={{name:'Vijay',phone:'9876543210',is_active:false,is_online:false}}/>);expect(screen.getByRole('heading',{level:1}).textContent).toBe('Rider access paused');expect(screen.getByText(/updating this form does not reactivate/)).toBeDefined()});
 it('blocked users cannot submit an application',()=>{render(<RiderAccess {...base} profile={{...profile,is_blocked:true}}/>);expect(screen.queryByLabelText('Full name')).toBeNull();expect(screen.getByRole('heading',{level:1}).textContent).toContain('blocked')});
 it('keeps failed application open with its server error',async()=>{vi.mocked(rpc).mockRejectedValue(new Error('Account blocked'));render(<RiderAccess {...base}/>);fireEvent.change(screen.getByLabelText('Indian mobile number'),{target:{value:'9876543210'}});fireEvent.click(screen.getByText('Submit rider application'));await waitFor(()=>expect(screen.getByRole('alert').textContent).toBe('Account blocked'));expect(screen.getByLabelText('Indian mobile number')).toBeDefined()});
});
