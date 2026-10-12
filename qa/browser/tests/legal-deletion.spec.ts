import {test,expect} from '@playwright/test';
for(const route of ['terms','privacy','refund-policy','delete-account'])test('public '+route+' works logged out',async({page})=>{
 await page.goto('/#/'+route);await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.getByText('Draft — requires owner/legal review',{exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Legal policies'}).first()).toBeVisible();
});
test('public deletion never accepts email as deletion authorization',async({page})=>{
 await page.goto('/#/delete-account');await expect(page.getByRole('heading',{name:'Cannot sign in?'})).toBeVisible();await expect(page.getByText(/An email alone cannot delete an account/)).toBeVisible();await page.getByRole('button',{name:'Sign in to request deletion'}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
});

test.describe('Mocked identity flow',()=>{
 test.use({serviceWorkers:'block'});
 test('identity-confirmed deletion UI and pending cancellation with mocked Auth/RPC',async({page})=>{
 const user={id:'00000000-0000-4000-8000-000000000051',email:'deletion-browser-qa@example.invalid',aud:'authenticated',role:'authenticated',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{full_name:'Deletion UI QA'},created_at:new Date().toISOString()};
 const jwt=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.testsignature';
 const session={access_token:jwt,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user};
 let request:any=null;let reauthenticated=false;let confirmed=false;let cancelled=false;
 await page.addInitScript(s=>localStorage.setItem('nexora.food.auth',JSON.stringify(s)),session);
 await page.route('https://zilwgiuiygqqardzutxi.supabase.co/**',async route=>{
  const url=new URL(route.request().url());let data:any=[];
  if(url.pathname==='/auth/v1/user')data=user;
  else if(url.pathname==='/auth/v1/token'){reauthenticated=true;data=session;}
  else if(url.pathname.endsWith('/nexora_food_profiles'))data={id:user.id,full_name:'Deletion UI QA',email:user.email,phone:'',avatar_url:null,is_blocked:false};
  else if(url.pathname.endsWith('/nexora_food_public_config'))data={'experience.customer_mode':'live','cod.enabled':true};
  else if(url.pathname.endsWith('/nexora_food_workspace_context'))data={workspace:'customer',ready:true,path:'/'};
  else if(url.pathname.endsWith('/nexora_food_user_roles'))data=[{role:'customer'}];
  else if(url.pathname.endsWith('/nexora_food_deletion_status'))data={request,blockers:[],retention:{reviewed:false,public_text:'Test retention awaiting legal review',financial_retention_days:null}};
  else if(url.pathname.endsWith('/nexora_food_request_deletion')){const body=route.request().postDataJSON();confirmed=reauthenticated&&body.p_confirmation==='DELETE';request={id:'00000000-0000-4000-8000-000000000052',status:'requested',stage:'requested',requested_at:new Date().toISOString(),updated_at:new Date().toISOString()};data=request.id;}
  else if(url.pathname.endsWith('/nexora_food_deletion_receipt'))data='a'.repeat(64);
  else if(url.pathname.endsWith('/nexora_food_cancel_deletion')){cancelled=true;request={...request,status:'cancelled'};data=null;}
  else if(url.pathname.includes('/rpc/'))data=null;
  await route.fulfill({status:200,headers:{'Content-Type':'application/json','Access-Control-Allow-Origin':'*'},body:JSON.stringify(data)});
 });
 await page.goto('/#/delete-account');await expect(page.getByLabel('Re-enter password')).toBeVisible();
 await page.getByLabel('Re-enter password').fill('mock-password');await page.getByLabel('Type DELETE to confirm',{exact:true}).fill('WRONG');await expect(page.getByRole('button',{name:'Confirm deletion request',exact:true})).toBeDisabled();
 await page.getByLabel('Type DELETE to confirm',{exact:true}).fill('DELETE');await page.getByRole('button',{name:'Confirm deletion request',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Request status: requested'})).toBeVisible();expect(confirmed).toBe(true);
 await page.getByRole('button',{name:'Cancel pending request'}).click();await expect(page.getByRole('heading',{name:'Request status: cancelled'})).toBeVisible();expect(cancelled).toBe(true);
});

});
