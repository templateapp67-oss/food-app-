import {supabase} from '../api';
export async function uploadFoodImage(bucket:'nexora-food-menu'|'nexora-food-restaurants'|'nexora-food-avatars',owner:string,file:File) {
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024||file.size===0)throw new Error('Use a JPEG, PNG or WebP image under 5 MB.');
 if(!supabase)throw new Error('Live backend is not connected.');
 const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
 const path=`${owner}/${crypto.randomUUID()}.${ext}`;
 const{error}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});if(error)throw error;
 return {path,url:supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl};
}
