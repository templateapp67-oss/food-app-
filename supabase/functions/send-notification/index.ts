import{json,service,env,equal}from'../_shared/http.ts';
const b64=(v:string)=>btoa(v).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
async function accessToken(sa:{private_key:string;client_email:string}){const now=Math.floor(Date.now()/1000);const data=b64(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+b64(JSON.stringify({iss:sa.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600}));const pem=sa.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(data)));const jwt=data+'.'+b64(String.fromCharCode(...sig));const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt})});const result=await response.json();if(!response.ok)throw new Error('FCM authentication failed');return result.access_token}

Deno.serve(async(req:Request)=>{
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(req.method!=='POST'||!key||!equal(req.headers.get('authorization')||'','Bearer '+key))return json({error:'Internal service only'},403);
 const db=service();try{
 const body=await req.json();if(Object.keys(body).some(k=>k!=='notification_id')||! /^[0-9a-f-]{36}$/i.test(body.notification_id||''))return json({error:'notification_id required'},400);
 const {data:jobs,error}=await db.rpc('nexora_food_claim_push',{p_notification:body.notification_id});if(error)throw error;
 if(!jobs?.length)return json({results:[],status:'no_work'});
 let access:string|undefined;let sa:{project_id:string;private_key:string;client_email:string}|undefined;
 try{sa=JSON.parse(env('FIREBASE_SERVICE_ACCOUNT'));if(!sa?.project_id||!sa.private_key||!sa.client_email)throw Error();access=await accessToken(sa)}catch{}
 const results=[];
 for(const job of jobs){let result='configuration_missing';
 const allowed=await db.rpc('nexora_food_push_allowed',{p_notification:job.notification_id,p_token:job.token_id,p_claim:job.claim});if(allowed.error)throw allowed.error;if(!allowed.data)result='failed';
 if(access&&sa&&allowed.data){try{
 const response=await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({message:{token:job.token,data:{order_id:job.order_id,event:job.event,notification_id:job.notification_id,title:'Order update',body:'Open Nexora Food for your order status.'},android:{priority:'HIGH'},webpush:{headers:{Urgency:'high'}}}})});
 if(response.ok)result='sent';else{const error=await response.json().catch(()=>({}));const codes=(error?.error?.details||[]).map((x:{errorCode?:string})=>x.errorCode);const invalid=codes.includes('UNREGISTERED')||(codes.includes('INVALID_ARGUMENT')&&/registration token|message[.]token/i.test(JSON.stringify(error?.error?.details||[])+String(error?.error?.message||'')));result=invalid?'invalid':response.status===429||response.status>=500?'retry':'failed';}
 }catch{result='unknown';}}
 const finished=await db.rpc('nexora_food_finish_push',{p_notification:body.notification_id,p_token:job.token_id,p_claim:job.claim,p_result:result});
 if(finished.error)throw finished.error;results.push({token_id:job.token_id,status:result});
 }
 return json({results});
 }catch{return json({error:'Dispatch could not complete; durable queue retained'},503)}
});
