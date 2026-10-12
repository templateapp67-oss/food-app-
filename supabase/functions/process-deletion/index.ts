import {json,service,equal} from '../_shared/http.ts';
Deno.serve(async(req:Request)=>{
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(req.method!=='POST'||!key||!equal(req.headers.get('authorization')||'','Bearer '+key))return json({error:'Internal service only'},403);
 const db=service();let id:string|undefined;
 try{
 const body=await req.json();id=body.request_id;if(Object.keys(body).some(k=>k!=='request_id')||! /^[0-9a-f-]{36}$/i.test(id||''))return json({error:'request_id required'},400);
 const {data:work,error}=await db.rpc('nexora_food_prepare_deletion',{p_request:id});if(error)throw error;if(!work?.ready)return json({status:'blocked_or_no_work'});
 if(!work.storage_done){if(work.avatar_paths?.length){const {error}=await db.storage.from('nexora-food-avatars').remove(work.avatar_paths);if(error)throw error;}
 const {error}=await db.rpc('nexora_food_finish_deletion',{p_request:id,p_stage:'storage_done'});if(error)throw error;}
 const existing=await db.auth.admin.getUserById(work.user_id);
 if(existing.error&&existing.error.status!==404)throw existing.error;
 if(existing.data?.user){const {error}=await db.auth.admin.deleteUser(work.user_id);if(error)throw error;}
 const done=await db.rpc('nexora_food_finish_deletion',{p_request:id,p_stage:'completed'});if(done.error)throw done.error;
 return json({status:'completed'});
 }catch{if(id)await db.rpc('nexora_food_finish_deletion',{p_request:id,p_stage:'retry'});return json({error:'Cleanup incomplete; will retry safely'},503)}
});
