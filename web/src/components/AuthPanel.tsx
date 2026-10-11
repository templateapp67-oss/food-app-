import {useState} from 'react';
import {supabase,rpc,configured} from '../api';

export default function AuthPanel({onSuccess,onDemo}:{onSuccess:()=>void;onDemo:()=>void}) {
 const [mode,setMode]=useState<'login'|'signup'|'reset'>('login');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 if(!configured)return <><p>Live authentication is not configured.</p><button className="primary full" onClick={onDemo}>Explore Demo workspace</button></>;
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);setBusy(true);setError('');setNotice('');try{
  const email=String(f.get('email')).trim(),password=String(f.get('password')||'');
  if(mode==='reset'){const{error}=await supabase!.auth.resetPasswordForEmail(email,{redirectTo:location.origin});if(error)throw error;setNotice('If this email has an account, password reset instructions will be sent.');return;}
  if(mode==='signup'){
   const fullName=String(f.get('name')).trim();if(!fullName)throw new Error('Enter your full name.');
   if(password.length<8)throw new Error('Use a password with at least 8 characters.');
   const{data,error}=await supabase!.auth.signUp({email,password,options:{data:{full_name:fullName},emailRedirectTo:location.origin}});if(error)throw error;
   if(!data.session){setNotice('Check your email to confirm your account, then sign in.');return;}
  }else{const{error}=await supabase!.auth.signInWithPassword({email,password});if(error)throw error;}
  await rpc('nexora_ensure_account');onSuccess();
 }catch(e){setError(e instanceof Error?e.message:'Authentication failed. Try again.')}finally{setBusy(false)}}
 return <><div className="rd-offer-tabs"><button onClick={()=>{setMode('login');setError('');setNotice('')}} aria-pressed={mode==='login'} className={mode==='login'?'active':''}>Sign in</button><button onClick={()=>{setMode('signup');setError('');setNotice('')}} aria-pressed={mode==='signup'} className={mode==='signup'?'active':''}>Create account</button></div><p className="small muted">Use your email and password. Existing accounts on the connected Nexora platform can sign in here.</p><form onSubmit={submit}>{mode==='signup'&&<label>Full name<input name="name" required maxLength={120} autoComplete="name" placeholder="Vijay Kumar"/></label>}<label>Email<input name="email" type="email" required autoComplete="email" placeholder="you@example.com"/></label>{mode!=='reset'&&<label>Password<input name="password" type="password" required minLength={mode==='signup'?8:1} autoComplete={mode==='signup'?'new-password':'current-password'} placeholder={mode==='signup'?'At least 8 characters':'Enter your password'}/></label>}{error&&<p role="alert" className="error-banner">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}<button className="primary full" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':mode==='reset'?'Send reset instructions':'Sign in'}</button>{mode!=='signup'&&<button type="button" className="secondary full" disabled={busy} onClick={()=>{setMode(mode==='reset'?'login':'reset');setError('');setNotice('')}}>{mode==='reset'?'Back to sign in':'Forgot password?'}</button>}</form></>;
}
