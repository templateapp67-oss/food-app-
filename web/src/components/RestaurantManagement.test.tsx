import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,waitFor} from '@testing-library/react';
import RestaurantManagement from './RestaurantManagement';
import {restaurants} from '../demo';
const rows=['pending','under_review','active','suspended','rejected'].map((status,i)=>({...restaurants[0],id:String(i),name:'Kitchen '+i,status,rejection_reason:status==='rejected'?'Incomplete details':null}));
afterEach(()=>{cleanup();vi.restoreAllMocks()});
function mount(onDecision=vi.fn().mockResolvedValue(undefined)){render(<RestaurantManagement restaurants={rows} busy={false} onAdd={vi.fn()} onPhotos={vi.fn()} onZone={vi.fn()} onDecision={onDecision}/>);return onDecision}
describe('Restaurant approvals management',()=>{
 it('filters pending and under-review together and keeps other statuses separate',()=>{
  mount();fireEvent.click(screen.getByRole('button',{name:'Pending (2)'}));expect(screen.getByText('Kitchen 0')).toBeDefined();expect(screen.getByText('Kitchen 1')).toBeDefined();expect(screen.queryByText('Kitchen 2')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Active (1)'}));expect(screen.getByText('Kitchen 2')).toBeDefined();expect(screen.queryByText('Kitchen 0')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'All (5)'}));expect(screen.getByText('Rejection reason: Incomplete details')).toBeDefined();
 });
 it('approves a pending application with an audited decision reason',async()=>{
  const decision=mount();fireEvent.click(screen.getByRole('button',{name:'Approve Kitchen 0'}));await waitFor(()=>expect(decision).toHaveBeenCalledWith(rows[0],'active','Approved from restaurant management'));
 });
 it('requires a rejection reason and sends the rejected status without activating the restaurant',async()=>{
  const decision=mount(),prompt=vi.spyOn(window,'prompt');prompt.mockReturnValueOnce(null).mockReturnValueOnce('x').mockReturnValueOnce(' Invalid documents ');
  fireEvent.click(screen.getByRole('button',{name:'Reject Kitchen 1'}));expect(decision).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Reject Kitchen 1'}));expect(screen.getByRole('alert').textContent).toContain('at least 3');expect(decision).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Reject Kitchen 1'}));await waitFor(()=>expect(decision).toHaveBeenCalledWith(rows[1],'rejected','Invalid documents'));
 });
 it('shows a real Rambharose Cafe pending entry and updates counts after approval',()=>{
  const restaurant={...rows[0],name:'Rambharose Cafe',address:'Jhotwara, Jaipur',is_demo:false};const props={busy:false,onAdd:vi.fn(),onPhotos:vi.fn(),onZone:vi.fn(),onDecision:vi.fn()};const {rerender}=render(<RestaurantManagement {...props} restaurants={[restaurant]}/>);
  fireEvent.click(screen.getByRole('button',{name:'Pending (1)'}));expect(screen.getByText('Rambharose Cafe')).toBeDefined();expect(screen.getByRole('button',{name:'Approve Rambharose Cafe'})).toBeDefined();expect(screen.getByRole('button',{name:'Reject Rambharose Cafe'})).toBeDefined();expect(screen.queryByLabelText('Demo restaurant management')).toBeNull();rerender(<RestaurantManagement {...props} restaurants={[{...restaurant,status:'active'}]}/>);expect(screen.getByRole('button',{name:'Pending (0)'})).toBeDefined();fireEvent.click(screen.getByRole('button',{name:'Active (1)'}));expect(screen.getByText('Rambharose Cafe')).toBeDefined();
 });

});
