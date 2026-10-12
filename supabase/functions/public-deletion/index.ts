import {json,service,cors,env} from '../_shared/http.ts';
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});if(req.method!=='POST')return json({error:'POST required'},405);
 const origin=Deno.env.get('WEB_ORIGIN')||'https://nexora-food.templateapp67.chatgpt.site';const requestOrigin=req.headers.get('origin');if(requestOrigin&&requestOrigin!==origin)return json({error:'Origin not allowed'},403);
 if(Number(req.headers.get('content-length')||0)>8192)return json({error:'Request too large'},413);
 try{
 const raw=await req.text();if(raw.length>8192)return json({error:'Request too large'},413);const body=JSON.parse(raw);const db=service();
 if(body.action==='status'){if(typeof body.receipt!=='string'||!/^[a-f0-9]{64}$/.test(body.receipt))return json({error:'Invalid receipt'},400);const {data,error}=await db.rpc('nexora_food_deletion_receipt_status',{p_hash:await hash(body.receipt)});if(error||!data)return json({error:'Receipt expired or unavailable'},404);return json(data);}
 if(!requestOrigin)return json({error:'Browser verification origin required'},403);
 if(body.action==='verify'){
 if(typeof body.token!=='string'||! /^[a-f0-9]{64}$/.test(body.token))return json({error:'Invalid verification link'},400);
 const {error}=await db.rpc('nexora_food_verify_deletion_challenge',{p_token_hash:await hash(body.token),p_confirmation:body.confirmation});if(error)return json({error:'Verification expired, already used, or request blocked. Sign in for details.'},400);
 return json({status:'requested',message:'Verified deletion request recorded. Completion depends on account blockers and reviewed retention policy.'});
 }
 if(body.action!=='request')return json({error:'Unknown action'},400);
 const apiKey=Deno.env.get('RESEND_API_KEY'),from=Deno.env.get('FOOD_DELETION_EMAIL_FROM'),captchaSecret=Deno.env.get('FOOD_TURNSTILE_SECRET'),pepper=Deno.env.get('FOOD_RATE_LIMIT_PEPPER');
 if(!apiKey||!from||!captchaSecret||!pepper)return json({error:'Email verification is not configured. Sign in to request deletion, or contact the owner through Help & support.'},503);
 if(typeof body.email!=='string'||body.email.length>254||! /^[^ @]+@[^ @]+\.[^ @]+$/.test(body.email)||typeof body.captcha!=='string')return json({error:'Valid email and security check required'},400);
 const captcha=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:captchaSecret,response:body.captcha})}).then(r=>r.json());if(!captcha.success||captcha.hostname!==new URL(origin).hostname||captcha.action!=='food_deletion')return json({error:'Security check failed'},400);
 const token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x=>x.toString(16).padStart(2,'0')).join('');
 // Platform-provided forwarding header, never a caller-supplied address field.
 const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
 const {data,error}=await db.rpc('nexora_food_create_deletion_challenge',{p_email:body.email,p_ip_hash:await hash(pepper+':'+ip),p_token_hash:await hash(token)});if(error)return json({error:'Too many requests. Try later.'},429);
 if(data.send_email){const link=origin+'/#/delete-account?token='+token;
 const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json','Idempotency-Key':'food-deletion/'+data.id},body:JSON.stringify({from,to:[body.email],subject:'Confirm your Nexora Food deletion request',text:'You requested account deletion. Open this link, review the explanation and type DELETE to confirm. The link expires in 30 minutes. If you did not request this, ignore it.\n\n'+link})});if(!res.ok)return json({error:'Verification email could not be sent. Try later or sign in.'},503);}
 return json({message:'If this email belongs to a verified Food account, a confirmation link will be sent. No deletion occurs until you verify and confirm.'});
 }catch{return json({error:'Verification unavailable; please try later'},503)}
});
