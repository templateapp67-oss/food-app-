import {ShieldCheck} from 'lucide-react';
import type {Profile} from '../model';
type Props={role:'admin'|'restaurant'|'rider';profile:Profile|null;loading:boolean;error:string;onLogin:()=>void;onRefresh:()=>void;onSwitch:()=>void;onApply:()=>void;previewHref:string};
export function workspaceAllowed(role:string,profile:Profile|null,roles:string[],members:string[]){
 if(role==='customer')return true;
 if(!profile||profile.is_blocked)return false;
 const admin=roles.includes('admin')||roles.includes('super_admin');
 return role==='admin'?admin:role==='restaurant'?admin||members.length>0:roles.includes('rider');
}
export default function WorkspaceAccess({role,profile,loading,error,onLogin,onRefresh,onSwitch,onApply,previewHref}:Props){
 const name=role==='admin'?'Super Admin':role==='restaurant'?'Restaurant':'Rider';
 return <main className="access-page"><ShieldCheck size={44}/><p className="eyebrow">{name.toUpperCase()} WORKSPACE</p><h1>{loading?'Checking workspace access…':profile?`${name} access required`:'Sign in to your workspace'}</h1>
 {profile&&<p>Signed in as <strong>{profile.email||profile.full_name}</strong></p>}
 <p>{profile?.is_blocked?'This account is blocked. Contact platform support.':role==='restaurant'?'Register your restaurant or ask an administrator to assign you to an existing kitchen.':role==='rider'?'Apply as a rider. Your live delivery workspace opens after administrator approval.':'Use your platform administrator account. Customer accounts cannot manage the platform.'}</p>
 {error&&<p role="alert">Access could not be loaded: {error}</p>}
 {!profile?<button className="primary" disabled={loading} onClick={onLogin}>Sign in</button>:<><button className="primary" disabled={loading} onClick={onRefresh}>Refresh access</button><button className="secondary" disabled={loading} onClick={onSwitch}>Switch account</button>{!profile.is_blocked&&role!=='admin'&&<button className="secondary" onClick={onApply}>{role==='restaurant'?'Register your restaurant':'Apply as a rider'}</button>}</>}
 <p>Want to see the dashboard first? Sample preview uses separate data and does not change live orders or permissions.</p><a className="secondary" href={previewHref}>Preview {name} dashboard · sample data</a>
 </main>;
}
