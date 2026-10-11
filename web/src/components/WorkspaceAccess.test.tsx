import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import WorkspaceAccess,{workspaceAllowed} from './WorkspaceAccess';
import type {Profile} from '../model';
const profile:Profile={id:'owner',full_name:'Owner',email:'owner@example.invalid',phone:''};
afterEach(cleanup);
describe('Workspace access',()=>{
 it('allows administrators to inspect kitchens while customers and blocked accounts stay restricted',()=>{
  expect(workspaceAllowed('admin',profile,['super_admin'],[])).toBe(true);
  expect(workspaceAllowed('restaurant',profile,['super_admin'],[])).toBe(true);
  expect(workspaceAllowed('rider',profile,['super_admin'],[])).toBe(false);
  for(const role of ['admin','restaurant','rider'])expect(workspaceAllowed(role,profile,['customer'],[])).toBe(false);
  expect(workspaceAllowed('restaurant',profile,['restaurant_staff'],['kitchen'])).toBe(true);
  expect(workspaceAllowed('admin',{...profile,is_blocked:true},['super_admin'],[])).toBe(false);
  expect(workspaceAllowed('admin',null,['super_admin'],[])).toBe(false);
 });
 it('identifies the current account and offers refresh, switch and explicit separate preview',()=>{
  const onRefresh=vi.fn(),onSwitch=vi.fn();render(<WorkspaceAccess role="admin" profile={profile} loading={false} error="Network unavailable" onLogin={vi.fn()} onRefresh={onRefresh} onSwitch={onSwitch} onApply={vi.fn()} previewHref="?preview=demo#/admin"/>);
  expect(screen.getByText(profile.email!)).toBeDefined();expect(screen.queryByRole('button',{name:'Sign in'})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Refresh access'}));expect(onRefresh).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('button',{name:'Switch account'}));expect(onSwitch).toHaveBeenCalledOnce();
  expect(screen.getByRole('link',{name:/Preview Super Admin/}).getAttribute('href')).toBe('?preview=demo#/admin');
  expect(screen.getByRole('alert').textContent).toContain('Network unavailable');
 });
 it('gives riders their own approval instructions and application action',()=>{
  const onApply=vi.fn();render(<WorkspaceAccess role="rider" profile={profile} loading={false} error="" onLogin={vi.fn()} onRefresh={vi.fn()} onSwitch={vi.fn()} onApply={onApply} previewHref="?preview=demo#/rider"/>);
  expect(screen.getByText(/administrator approval/)).toBeDefined();fireEvent.click(screen.getByRole('button',{name:'Apply as a rider'}));expect(onApply).toHaveBeenCalledOnce();
 });
});
