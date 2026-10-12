import {foodBackend} from '../../../web/src/backend-config';
import {test,expect,type Locator} from '@playwright/test';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGP8VWHEgA0wYRUdtBIATLcBtDv3dbgAAAAASUVORK5CYII=','base64');
async function activate(locator:Locator,touch:boolean){if(touch)await locator.tap();else await locator.click()}
test.beforeEach(async({page})=>{await page.addInitScript(()=>{localStorage.setItem('nexora.demo','true');localStorage.setItem('nexora.dark','false');const nativeFetch=window.fetch.bind(window);window.fetch=(input,init)=>String(input).startsWith('https://nominatim.openstreetmap.org/reverse')?Promise.resolve(new Response(JSON.stringify({address:{country_code:'in',city:'Jaipur',suburb:'C Scheme',postcode:'302001'}}),{headers:{'Content-Type':'application/json'}})):nativeFetch(input,init)});await page.route('https://nominatim.openstreetmap.org/reverse?**',route=>route.fulfill({json:{address:{country_code:'in',city:'Jaipur',suburb:'C Scheme',postcode:'302001'}}}));await page.goto('/?preview=demo');await expect(page.getByText(/DEMO WORKSPACE/)).toBeVisible()});
test('discovery fits the viewport and opens a restaurant with touch or mouse',async({page},info)=>{await expect(page.getByRole('button',{name:'View The Biryani House'})).toBeVisible();const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>innerWidth+2&&getComputedStyle(e).position!=='fixed').map(e=>({tag:e.tagName,className:e.className,right:e.getBoundingClientRect().right})).slice(0,20)}));expect(layout.scrollWidth,JSON.stringify(layout)).toBeLessThanOrEqual(layout.width+2);await activate(page.getByRole('button',{name:'View The Biryani House'}),!!info.project.use.hasTouch);await expect(page.getByRole('heading',{name:'The Biryani House',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Show all images'})).toBeVisible()});
test('cart checkout creates only a labelled local demo order',async({page},info)=>{await activate(page.getByRole('button',{name:'View The Biryani House'}),!!info.project.use.hasTouch);await page.getByRole('button',{name:'Add',exact:true}).first().click();await page.getByRole('button',{name:/^Cart/}).click();await page.getByRole('button',{name:'Continue to checkout'}).click();await expect(page.getByRole('dialog',{name:'Demo checkout'})).toBeVisible();await page.getByRole('button',{name:'Create demo order'}).click();await expect(page.getByText(/Demo order created/)).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.orders')||'[]')[0].payment_status)).toBe('cod_pending')});
test('GPS permission populates a Jaipur address without leaving the launch city',async({page})=>{await page.getByRole('button',{name:'Delivery location',exact:true}).click();await page.getByRole('button',{name:'Add a new address'}).click();await page.getByRole('button',{name:'Use current location'}).click();await expect(page.locator('input[name=latitude]')).toHaveValue('26.9124');await expect(page.locator('input[name=longitude]')).toHaveValue('75.7873');await expect(page.getByLabel('City',{exact:true})).toHaveValue('Jaipur');await expect(page.getByLabel('Jaipur area / locality',{exact:true})).toHaveValue('C Scheme');await expect(page.getByLabel('Jaipur area / locality',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Change area manually'}).click();await expect(page.getByLabel('Jaipur area / locality',{exact:true})).toBeEnabled();expect(await page.getByLabel('City',{exact:true}).getAttribute('readonly')).not.toBeNull()});
test('restaurant can directly choose cover, gallery and menu page photos',async({page})=>{await page.getByLabel('Workspace').selectOption('restaurant');await page.getByRole('button',{name:'Photos',exact:true}).click();for(const label of ['Restaurant cover photo','Restaurant gallery','Menu page photos'])await page.getByLabel(label,{exact:true}).setInputFiles({name:label+'.png',mimeType:'image/png',buffer:png});await expect(page.getByText('Ready to upload')).toHaveCount(3);await page.getByRole('button',{name:'Save restaurant photos'}).click();await expect(page.getByRole('status')).toContainText('Photos saved on this device');const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.restaurants')||'[]')[0]);expect(saved.cover_url).toMatch(/^data:image\/png/);expect(saved.gallery_urls.some((u:string)=>u.startsWith('data:image/png'))).toBe(true);expect(saved.menu_pages.some((u:string)=>u.startsWith('data:image/png'))).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true)});
test('personal photo picker previews and saves a photo across reloads',async({page},info)=>{await activate(page.getByRole('button',{name:'Open profile'}),!!info.project.use.hasTouch);const picker=page.getByLabel('Profile photo',{exact:true});await expect(picker).toBeEnabled();await picker.setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});await expect(page.getByAltText('Selected profile photo')).toBeVisible();await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('.profile-details').getByRole('status')).toContainText('Profile and photo saved on this device');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.profile')||'{}').avatar_url)).toMatch(/^data:image\/png/);await page.reload();await expect(page.getByAltText('Your profile photo')).toBeVisible();await expect(page.getByAltText('Your profile',{exact:true})).toHaveCount(2);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true)});

test('production follows the configured Live mode even with a stale demo preference',async({page})=>{await page.addInitScript(()=>{const native=window.fetch.bind(window);window.fetch=(input,init)=>String(input).includes('/rest/v1/rpc/nexora_food_public_config')?Promise.resolve(new Response(JSON.stringify({'cod.enabled':true,'experience.customer_mode':'live'}),{headers:{'Content-Type':'application/json'}})):native(input,init)});await page.goto('/');await expect(page.getByText('LIVE BACKEND · Supabase connected')).toBeVisible();await expect(page.getByText(/DEMO WORKSPACE/)).toHaveCount(0);await expect(page.getByRole('button',{name:'Explore demo',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Install app',exact:true})).toBeVisible();await expect(page.locator('link[rel=manifest]')).toHaveAttribute('href','/manifest.webmanifest')});
test('install button follows the native event and disappears after installation',async({page})=>{await page.evaluate(()=>{const e=new Event('beforeinstallprompt');Object.assign(e,{prompt:()=>Promise.resolve(),userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(e)});await page.getByRole('button',{name:'Install app',exact:true}).click();await expect(page.getByRole('button',{name:'Install app',exact:true})).toHaveCount(0)});

test('PWA manifest and worker are valid and the live APK download is available',async({page,request})=>{await expect.poll(()=>page.evaluate(async()=>!!(await navigator.serviceWorker.getRegistration())?.active)).toBe(true);const manifest=await request.get('/manifest.webmanifest');expect(manifest.status()).toBe(200);expect((await manifest.json()).display).toBe('standalone');const worker=await request.get('/sw.js');expect(worker.status()).toBe(200);expect(await worker.text()).toContain('notificationclick');if(process.env.PLAYWRIGHT_BASE_URL){const apk=await request.get('/downloads/nexora-food-debug.apk');expect(apk.status()).toBe(200);const body=await apk.body();expect(body.length).toBe(13828490);expect(body.subarray(0,2).toString()).toBe('PK')}});

test('GPS coordinates remain usable when reverse geocoding is unavailable',async({page})=>{await expect(page.getByRole('button',{name:'Delivery location',exact:true})).toContainText('C Scheme, Jaipur');await page.evaluate(()=>{localStorage.removeItem('nexora.food.location');const original=window.fetch.bind(window);window.fetch=(input,init)=>String(input).startsWith('https://nominatim.openstreetmap.org/reverse')?Promise.reject(new Error('Address lookup offline')):original(input,init)});await page.getByRole('button',{name:'Delivery location',exact:true}).click();await page.getByRole('button',{name:'Add a new address'}).click();await page.getByRole('button',{name:'Use current location'}).click();await expect(page.locator('input[name=latitude]')).toHaveValue('26.9124');await expect(page.locator('input[name=longitude]')).toHaveValue('75.7873');await expect(page.getByRole('alert')).toContainText('Current location found');const area=page.getByLabel('Jaipur area / locality',{exact:true});await expect(area).toBeEnabled();await area.selectOption('C Scheme');await page.getByLabel('PIN code',{exact:true}).fill('302001');await page.getByLabel('House / flat and street',{exact:true}).fill('24, test street');await page.getByRole('button',{name:'Save address',exact:true}).click();await expect(page.getByText('Address saved',{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.addresses')||'[]').at(-1).latitude)).toBe(26.9124)});

test('GPS denial lets customers search a normal street address without entering coordinates',async({page})=>{
 await page.evaluate(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_success:unknown,reject:(error:{code:number})=>void)=>reject({code:1})}});const original=window.fetch.bind(window);window.fetch=(input,init)=>String(input).startsWith('https://nominatim.openstreetmap.org/search')?Promise.resolve(new Response(JSON.stringify([{lat:'26.9124',lon:'75.7873',type:'house',display_name:'24, Park Avenue, C Scheme, Jaipur, 302001',address:{country_code:'in',city:'Jaipur',road:'Park Avenue',house_number:'24',postcode:'302001'}}]),{headers:{'Content-Type':'application/json'}})):original(input,init)});
 await page.getByRole('button',{name:'Delivery location',exact:true}).click();await page.getByRole('button',{name:'Add a new address'}).click();await page.getByRole('button',{name:'Use current location'}).click();await expect(page.getByRole('alert')).toContainText('permission denied');await expect(page.getByLabel('Latitude',{exact:true})).toHaveCount(0);await expect(page.getByLabel('Longitude',{exact:true})).toHaveCount(0);
 await page.getByLabel('House / flat and street',{exact:true}).fill('24, Park Avenue');await page.getByLabel('Jaipur area / locality',{exact:true}).selectOption('C Scheme');await page.getByLabel('PIN code',{exact:true}).fill('302001');await page.getByRole('button',{name:'Find delivery pin from address',exact:true}).click();await expect(page.getByRole('region',{name:'Confirm delivery location'})).toBeVisible();await page.getByRole('button',{name:'Use this delivery location'}).click();await page.getByRole('button',{name:'Save address',exact:true}).click();await expect(page.getByText('Address saved',{exact:true})).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.addresses')||'[]').at(-1));expect(saved.latitude).toBe(26.9124);expect(saved.line1).toBe('24, Park Avenue');await expect(page.getByRole('button',{name:'Delivery location',exact:true})).toContainText('C Scheme, Jaipur');await page.reload();await expect(page.getByRole('button',{name:'Delivery location',exact:true})).toContainText('C Scheme, Jaipur');
});
for(const mode of ['login','signup'] as const)test(`${mode} retries a denied guest GPS attempt and locks the detected header area`,async({page})=>{
 await page.addInitScript(()=>{
  localStorage.removeItem('nexora.food.location');sessionStorage.removeItem('nexora.location.attempted');let attempts=0;Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success:(p:unknown)=>void,reject:(e:unknown)=>void)=>{attempts++;if(attempts===1)reject({code:1});else success({coords:{latitude:26.9124,longitude:75.7873,accuracy:8}})}}});
  const native=window.fetch.bind(window),id='00000000-0000-4000-8000-000000000123';
  window.fetch=(input,init)=>{const url=String(input);if(!url.startsWith('https://zilwgiuiygqqardzutxi.supabase.co'))return native(input,init);
   const user={id,email:'qa@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'QA customer'}};
   const payload=btoa(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}));
   let body:unknown=[];if(url.includes('/auth/v1/token')||url.includes('/auth/v1/signup'))body={access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'qa-test-refresh',token_type:'bearer',expires_in:3600,user};else if(url.includes('/auth/v1/user'))body=user;else if(url.includes('nexora_food_profiles'))body={id,full_name:'QA customer',email:'qa@example.test',phone:''};else if(url.includes('nexora_food_public_config'))body={'cod.enabled':true};else if(url.includes('nexora_food_workspace_context'))body={workspace:'customer',ready:true,application_submitted:false,path:'/'};else if(url.includes('nexora_food_save_address')){const a=JSON.parse(String(init?.body)).p_address;localStorage.setItem('qa.saved-addresses',JSON.stringify([a]));body=a.id}else if(url.includes('nexora_food_user_addresses'))body=JSON.parse(localStorage.getItem('qa.saved-addresses')||'[]');else if(url.includes('/rpc/'))body=id;
   return Promise.resolve(new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}}));
  };
 });
 await page.goto('/');const badge=page.getByRole('button',{name:'Delivery location',exact:true});await expect(badge).toContainText('Jaipur · default hub');
 await page.getByRole('button',{name:'Sign in / Sign up',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Good food starts with hello.'});
 if(mode==='signup'){await dialog.getByRole('button',{name:'Create account',exact:true}).first().click();await dialog.getByLabel('Full name').fill('QA customer')}
 await dialog.getByLabel('Email',{exact:true}).fill('qa@example.test');await dialog.getByLabel('Password',{exact:true}).fill('qa-password-123');await dialog.locator('form').getByRole('button',{name:mode==='signup'?'Create account':'Sign in',exact:true}).click();
 await expect(dialog).toHaveCount(0);await expect(badge).toContainText('C Scheme, Jaipur');await badge.click();await page.getByRole('button',{name:'Add a new address'}).click();await expect(page.getByLabel('Jaipur area / locality',{exact:true})).toHaveValue('C Scheme');await expect(page.getByLabel('Jaipur area / locality',{exact:true})).toBeDisabled();await expect(page.getByLabel('PIN code',{exact:true})).toHaveValue('302001');await page.getByLabel('House / flat and street',{exact:true}).fill('24 Park Avenue');await page.getByRole('button',{name:'Save address',exact:true}).click();await expect(page.getByText('Address saved',{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('qa.saved-addresses')||'[]')[0].line1)).toBe('24 Park Avenue');await page.reload();await expect(page.getByRole('button',{name:'Delivery location',exact:true})).toContainText('C Scheme, Jaipur');
});
test('unmapped street can be saved with a customer-selected map pin',async({page},info)=>{
 await page.evaluate(()=>{const native=window.fetch.bind(window);window.fetch=(input,init)=>String(input).startsWith('https://nominatim.openstreetmap.org/search')?Promise.resolve(new Response('[]',{headers:{'Content-Type':'application/json'}})):native(input,init)});
 await page.getByRole('button',{name:'Delivery location',exact:true}).click();await page.getByRole('button',{name:'Add a new address'}).click();const area=page.getByLabel('Jaipur area / locality',{exact:true});await expect(area.locator('option')).toHaveCount(127);await expect(area).toHaveValue('C Scheme');await page.getByRole('button',{name:'Change area manually'}).click();await area.selectOption('Shyam Nagar');await page.getByLabel('House / flat and street',{exact:true}).fill('24, Unmapped Test Lane');await page.getByLabel('PIN code',{exact:true}).fill('302019');await page.getByRole('button',{name:'Find delivery pin from address',exact:true}).click();await expect(page.getByRole('dialog',{name:'Add delivery address'}).getByRole('status')).toContainText('not mapped yet');const confirm=page.getByRole('button',{name:'Confirm map location',exact:true});await expect(confirm).toBeDisabled();const map=page.getByRole('application',{name:'Delivery map',exact:true});await map.scrollIntoViewIfNeeded();const box=(await map.boundingBox())!;if(info.project.use.hasTouch)await page.touchscreen.tap(box.x+box.width/2+16,box.y+box.height/2+16);else await map.click({position:{x:box.width/2+16,y:box.height/2+16}});await confirm.click();await page.getByRole('button',{name:'Save address',exact:true}).click();await expect(page.getByText('Address saved',{exact:true})).toBeVisible();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.addresses')||'[]').at(-1));expect(saved.locality).toBe('Shyam Nagar');expect(saved.latitude).not.toBe(26.892);expect(saved.longitude).not.toBe(75.766);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});

test.describe('live profile with isolated backend fixtures',()=>{
 // WebKit service-worker image requests bypass Playwright routing; keep fake signed URLs off the network.
 test.use({serviceWorkers:'block'});
 test('live profile saves a private upload and edited details across reloads',async({page},info)=>{
 await page.addInitScript(()=>{
  const native=window.fetch.bind(window),id='00000000-0000-4000-8000-000000000123';
  window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('https://zilwgiuiygqqardzutxi.supabase.co'))return native(input,init);
   const user={id,email:'qa@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'QA customer'}};
   const payload=btoa(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}));
   const profile=JSON.parse(localStorage.getItem('qa.saved-profile')||JSON.stringify({id,full_name:'QA customer',email:user.email,phone:''}));
   let body:unknown=[];
   if(url.includes('/auth/v1/token'))body={access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'qa-test-refresh',token_type:'bearer',expires_in:3600,user};
   else if(url.includes('/auth/v1/user'))body=user;
   else if(url.includes('/storage/v1/object/sign/'))body={signedURL:'/object/sign/nexora-food-avatars/avatar.png?token=qa'};
   else if(url.includes('/storage/v1/object/nexora-food-avatars/')){localStorage.setItem('qa.upload-path',url.split('/nexora-food-avatars/')[1]);body={Key:'avatar.png'}}
   else if(url.includes('nexora_food_save_account')){const args=JSON.parse(String(init?.body));profile.full_name=args.p_name;profile.phone=args.p_phone;if(args.p_avatar)profile.avatar_url=args.p_avatar;localStorage.setItem('qa.saved-profile',JSON.stringify(profile));body=null}
   else if(url.includes('nexora_food_profiles')){body=profile;localStorage.setItem('qa.profile-reads',String(Number(localStorage.getItem('qa.profile-reads')||0)+1))}
   else if(url.includes('nexora_food_public_config'))body={'cod.enabled':true};
   else if(url.includes('nexora_food_workspace_context'))body={workspace:'customer',ready:true,application_submitted:false,path:'/'};else if(url.includes('nexora_food_save_address')){const a=JSON.parse(String(init?.body)).p_address;localStorage.setItem('qa.saved-addresses',JSON.stringify([a]));body=a.id}else if(url.includes('nexora_food_user_addresses'))body=JSON.parse(localStorage.getItem('qa.saved-addresses')||'[]');else if(url.includes('/rpc/'))body=id;
   return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
  };
 });
 await page.route('**/storage/v1/object/sign/nexora-food-avatars/avatar.png?token=qa',route=>route.fulfill({contentType:'image/png',body:png}));
 await page.goto('/');await page.getByRole('button',{name:'Sign in / Sign up',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Good food starts with hello.'});await dialog.getByLabel('Email',{exact:true}).fill('qa@example.test');await dialog.getByLabel('Password',{exact:true}).fill('qa-password-123');await dialog.locator('form').getByRole('button',{name:'Sign in',exact:true}).click();await expect(dialog).toHaveCount(0);
 await activate(page.getByRole('button',{name:'Open profile'}),!!info.project.use.hasTouch);await page.getByLabel('Name',{exact:true}).fill('Updated live customer');await page.getByLabel('Phone',{exact:true}).fill('+91 98765-43210');await page.getByLabel('Profile photo',{exact:true}).setInputFiles({name:'avatar.png',mimeType:'image/png',buffer:png});await expect(page.getByAltText('Selected profile photo')).toBeVisible();const reads=await page.evaluate(()=>Number(localStorage.getItem('qa.profile-reads')));await expect.poll(()=>page.evaluate(()=>Number(localStorage.getItem('qa.profile-reads'))),{timeout:20000}).toBeGreaterThan(reads);await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Updated live customer');await expect(page.getByAltText('Selected profile photo')).toBeVisible();await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.locator('.profile-details').getByRole('status')).toContainText('Profile saved.');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('qa.saved-profile')!));expect(saved.phone).toBe('+919876543210');expect(saved.avatar_url).toBe(await page.evaluate(()=>localStorage.getItem('qa.upload-path')));expect(saved.avatar_url).toMatch(/^00000000-0000-4000-8000-000000000123\//);
 await page.reload();await activate(page.getByRole('button',{name:'Open profile'}),!!info.project.use.hasTouch);await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Updated live customer');await expect(page.getByLabel('Phone',{exact:true})).toHaveValue('+919876543210');await expect(page.getByAltText('Your profile photo')).toBeVisible();await expect(page.getByAltText('Your profile',{exact:true})).toHaveCount(2);
});

});

test('install fallback matches the device and closes cleanly',async({page},info)=>{
 await page.getByRole('button',{name:'Install app',exact:true}).click();const help=page.getByRole('region',{name:'App installation steps'});await expect(help).toBeVisible();
 if(info.project.name==='iPhone mobile web'){await expect(help).toContainText('Install on iPhone / iPad');await expect(help).toContainText('Share button');await expect(page.getByRole('link',{name:/Download Android APK/})).toHaveCount(0)}
 else if(info.project.name==='Android mobile web'){await expect(help).toContainText('Install on Android');await expect(help).toContainText('three-dot menu');await expect(help).not.toContainText('Safari')}
 else await expect(help).toContainText('Install in your browser');
 await page.getByRole('button',{name:'Close install instructions'}).click();await expect(help).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});


test('restaurant cards open dedicated links and menu search survives route navigation',async({page},info)=>{
 await activate(page.getByRole('button',{name:'View Dough & Co.'}),!!info.project.use.hasTouch);
 await expect(page).toHaveURL(/#\/restaurant\/demo-r2$/);
 await expect(page.getByRole('heading',{level:1,name:'Dough & Co.'})).toBeVisible();
 await page.getByRole('navigation',{name:'Restaurant sections'}).getByRole('button',{name:'Menu',exact:true}).click();
 await page.getByLabel('Search this restaurant menu').fill('Farmhouse');
 await expect(page.getByRole('img',{name:'Farmhouse Pizza',exact:true})).toBeVisible();
 await expect(page.getByRole('img',{name:'Margherita Pizza',exact:true})).toHaveCount(0);
 await page.reload();await expect(page.getByRole('heading',{level:1,name:'Dough & Co.'})).toBeVisible();
 await page.getByRole('button',{name:'Back to discovery'}).click();
 await expect(page.getByRole('button',{name:'View Dough & Co.'})).toBeVisible();
 await page.goBack();await expect(page.getByRole('heading',{level:1,name:'Dough & Co.'})).toBeVisible();
 await page.goForward();await expect(page.getByRole('button',{name:'View Dough & Co.'})).toBeVisible();
});


test('restaurant workspace persists preparation and menu stock and fits mobile',async({page})=>{
 await page.getByLabel('Workspace').selectOption('restaurant');
 await page.getByLabel('Preparation time (minutes)').fill('35');
 await page.getByLabel('Pause new orders').check();
 await page.getByRole('button',{name:'Save kitchen status'}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.restaurants')||'[]')[0].prep_time_min)).toBe(35);
 await page.getByRole('button',{name:'Menu',exact:true}).click();
 const stock=page.getByRole('button',{name:'Toggle availability Dum Chicken Biryani'});await stock.click();await expect(stock).toHaveAttribute('aria-pressed','false');
 await page.reload();await page.getByRole('button',{name:'Menu',exact:true}).click();await expect(page.getByRole('button',{name:'Toggle availability Dum Chicken Biryani'})).toHaveAttribute('aria-pressed','false');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});

test('admin dispatch and rider delivery lifecycle persist through all three workspaces',async({page})=>{
 await page.getByLabel('Workspace').selectOption('rider');await page.getByRole('switch').click();await expect(page.getByRole('switch')).toHaveAttribute('aria-checked','true');
 await page.getByLabel('Workspace').selectOption('admin');await page.getByRole('button',{name:'Dispatch',exact:true}).click();await page.getByLabel('Management reason').fill('Browser fixture delivery');await page.getByLabel('Online available rider').selectOption('demo-user');await page.getByRole('button',{name:'Send dispatch request'}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.operations')||'{}').assignments?.length)).toBe(1);
 await page.getByLabel('Workspace').selectOption('restaurant');await page.getByRole('button',{name:'Ready for pickup'}).click();
 await page.getByLabel('Workspace').selectOption('rider');
 for(const name of ['Accept delivery','Reached restaurant','Picked up','Out for delivery','Delivered · COD collected'])await page.getByRole('button',{name,exact:true}).click();
 await page.getByRole('button',{name:'Earnings',exact:true}).click();await expect(page.getByText('Delivery earnings & tips')).toBeVisible();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.orders')||'[]')[0].status)).toBe('delivered');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.operations')||'{}').riderLedger.length)).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
});


test.describe('multi-role signup with isolated backend fixtures',()=>{
 test.use({serviceWorkers:'block'});
 for(const workspace of ['customer','restaurant','rider','admin'])test(`signup routes ${workspace} into its validated workspace`,async({page})=>{
  await page.addInitScript(()=>{
   const native=window.fetch.bind(window),id='00000000-0000-4000-8000-000000000456';
   window.fetch=async(input,init)=>{
    const url=String(input);if(!url.startsWith('https://zilwgiuiygqqardzutxi.supabase.co'))return native(input,init);
    const args=init?.body?JSON.parse(String(init.body)):{};
    if(url.includes('/auth/v1/signup'))localStorage.setItem('qa.signup-workspace',args.data?.registration_workspace||'customer');
    const workspace=localStorage.getItem('qa.signup-workspace')||'customer';
    const user={id,email:'roles@example.test',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email',providers:['email']},user_metadata:{full_name:'Role customer',registration_workspace:workspace}};
    const payload=btoa(JSON.stringify({sub:id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600}));
    let body:unknown=[];
    if(url.includes('/auth/v1/signup')||url.includes('/auth/v1/token'))body={access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'roles-test-refresh',token_type:'bearer',expires_in:3600,user};
    else if(url.includes('/auth/v1/user'))body=user;
    else if(url.includes('nexora_food_profiles'))body={id,full_name:'Role customer',email:user.email,phone:''};
    else if(url.includes('nexora_food_user_roles'))body=[{role:'customer'}];
    else if(url.includes('nexora_food_public_config'))body={'cod.enabled':true};
    else if(url.includes('nexora_food_workspace_context'))body={workspace,ready:workspace==='customer',application_submitted:false,path:workspace==='customer'?'/':`/${workspace}`};
    else if(url.includes('/rpc/'))body=null;
    return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
   };
  });
  await page.goto('/');await page.getByRole('button',{name:'Sign in / Sign up',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Good food starts with hello.'});await dialog.getByRole('button',{name:'Create account',exact:true}).click();await dialog.getByLabel('Register as').selectOption(workspace);await dialog.getByLabel('Full name').fill('Role customer');await dialog.getByLabel('Email',{exact:true}).fill('roles@example.test');await dialog.getByLabel('Password',{exact:true}).fill('roles-password-123');await dialog.locator('form').getByRole('button',{name:'Create account',exact:true}).click();await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(workspace==='customer'?/#\/$/:new RegExp('#/'+workspace+'$'));
  if(workspace!=='customer')await expect(page.getByRole('heading',{name:workspace==='restaurant'?'Welcome to your restaurant workspace':workspace==='rider'?'Welcome to your rider workspace':'Your admin access request is saved'})).toBeVisible();
  await expect(page.getByText('This workspace needs assigned access')).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 });
});

test('live approved restaurants appear immediately in locality and name search without demo fallback',async({page})=>{
 await page.addInitScript(()=>{
  const native=window.fetch.bind(window);localStorage.setItem('qa.live-listing-status','pending');
  window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('https://zilwgiuiygqqardzutxi.supabase.co'))return native(input,init);
   let body:unknown=[];
   if(url.includes('nexora_food_public_config'))body={'cod.enabled':true};
   else if(url.includes('/rest/v1/nexora_food_restaurants')&&localStorage.getItem('qa.live-listing-status')==='active')body=[{id:'real-cafe',name:'Rambharose Cafe',city:'Jaipur',address:'Jhotwara, Jaipur',status:'active',description:'Live Jaipur restaurant',is_demo:false,is_temporarily_closed:false,prep_time_min:20,rating_avg:0,rating_count:0,avg_cost_for_two_paise:30000,min_order_paise:0,is_veg_only:true,cuisines:['North Indian']}];
   return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
  };
 });
 await page.goto('/');await expect(page.getByRole('button',{name:'View Rambharose Cafe'})).toHaveCount(0);await expect(page.getByRole('button',{name:'View Dough & Co.'})).toHaveCount(0);await expect(page.getByText('Sample preview',{exact:true})).toHaveCount(0);
 await page.evaluate(()=>{localStorage.setItem('qa.live-listing-status','active');window.dispatchEvent(new Event('focus'))});
 await expect(page.getByRole('button',{name:'View Rambharose Cafe'})).toBeVisible();await page.getByLabel('Global restaurant and food search').fill('jHoTwArA');await page.getByRole('button',{name:'Search food',exact:true}).click();await expect(page.getByRole('button',{name:'View Rambharose Cafe'})).toBeVisible();await page.getByLabel('Global restaurant and food search').fill('rambharose cafe');await page.getByRole('button',{name:'Search food',exact:true}).click();await expect(page.getByRole('button',{name:'View Rambharose Cafe'})).toBeVisible();await expect(page.getByText('SAMPLE PREVIEW',{exact:true})).toHaveCount(0);
});

test('the Super Admin customer-mode setting switches visitors between complete demo and original live data',async({page})=>{
 await page.addInitScript(()=>{
  const native=window.fetch.bind(window);localStorage.setItem('qa.customer-mode','demo');
  window.fetch=async(input,init)=>{
   const url=String(input);if(!url.startsWith('https://zilwgiuiygqqardzutxi.supabase.co'))return native(input,init);
   let body:unknown=[];
   if(url.includes('nexora_food_public_config'))body={'cod.enabled':true,'experience.customer_mode':localStorage.getItem('qa.customer-mode')};
   else if(url.includes('/rest/v1/nexora_food_restaurants'))body=[{id:'original-cafe',name:'Rambharose Cafe',city:'Jaipur',address:'Jhotwara, Jaipur',status:'active',description:'Original restaurant',is_demo:false,is_temporarily_closed:false,prep_time_min:20,rating_avg:0,rating_count:0,avg_cost_for_two_paise:30000,min_order_paise:0,is_veg_only:true,cuisines:['North Indian']}];
   return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
  };
 });
 await page.goto('/');await expect(page.getByText(/DEMO WORKSPACE/)).toBeVisible();await expect(page.getByRole('button',{name:'View Dough & Co.'})).toBeVisible();await expect(page.getByRole('button',{name:'View Rambharose Cafe'})).toHaveCount(0);await expect(page.getByRole('button',{name:'Sign in / Sign up',exact:true})).toBeVisible();
 await page.evaluate(()=>{localStorage.setItem('qa.customer-mode','live');window.dispatchEvent(new Event('focus'))});await expect(page.getByRole('button',{name:'View Rambharose Cafe'})).toBeVisible();await expect(page.getByRole('button',{name:'View Dough & Co.'})).toHaveCount(0);
 await page.evaluate(()=>{localStorage.setItem('qa.customer-mode','demo');window.dispatchEvent(new Event('focus'))});await expect(page.getByRole('button',{name:'View Dough & Co.'})).toBeVisible();await expect(page.getByRole('button',{name:'View Rambharose Cafe'})).toHaveCount(0);
});

test('manual address saves with GPS and geocoding unavailable, then confirms a pin without GPS',async({page})=>{
 await page.evaluate(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_:unknown,reject:(e:unknown)=>void)=>reject({code:1})}});const original=window.fetch.bind(window);window.fetch=(input,init)=>String(input).includes('nominatim.openstreetmap.org')?Promise.reject(new Error('lookup offline')):original(input,init)});
 await page.getByRole('button',{name:'Delivery location',exact:true}).click();await page.getByRole('button',{name:'Add a new address'}).click();await page.getByRole('button',{name:'Use current location',exact:true}).click();await expect(page.getByRole('alert')).toContainText('permission denied');
 await page.getByLabel('House / flat and street').fill('118 Durga Vihar D');await page.getByLabel('Jaipur area / locality').selectOption('Jhotwara');await page.getByLabel('PIN code',{exact:true}).fill('302012');await page.getByRole('button',{name:'Save address',exact:true}).click();await expect(page.getByText('Address saved',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Delivery location',exact:true})).toContainText('Jhotwara, Jaipur');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.addresses')||'[]').at(-1));expect(saved.latitude).toBeNull();expect(saved.longitude).toBeNull();await page.reload();await expect(page.getByRole('button',{name:'Delivery location',exact:true})).toContainText('Jhotwara, Jaipur');
 await page.getByRole('button',{name:'Delivery location',exact:true}).click();await page.getByRole('button',{name:/118 Durga Vihar D/}).click();await expect(page.getByRole('dialog',{name:'Confirm your delivery pin'})).toBeVisible();await page.getByRole('application',{name:'Delivery map'}).click({position:{x:120,y:130}});await page.getByRole('button',{name:'Confirm map location'}).click();await expect(page.getByText('Delivery pin saved',{exact:true})).toBeVisible();const confirmed=await page.evaluate(()=>JSON.parse(localStorage.getItem('nexora.demo.addresses')||'[]').find((a:{id:string})=>a.id===localStorage.getItem('nexora.delivery.address.guest')));expect(confirmed.latitude).not.toBeNull();expect(confirmed.id).toBe(saved.id);
});

test('published Live catalog displays the approved original Rambharose Cafe in Jhotwara',async({page,request})=>{
 test.skip(!process.env.PLAYWRIGHT_BASE_URL,'Real catalog verification runs only against the published site');
 const config=await request.post(foodBackend.url+'/rest/v1/rpc/nexora_food_public_config',{headers:{apikey:foodBackend.publishableKey},data:{}});expect(config.ok()).toBe(true);test.skip((await config.json())['experience.customer_mode']!=='live','The owner currently selected Demo for visitors');
 await page.goto('/');await expect(page.getByLabel('Restaurant listing mode')).toContainText('Live restaurants');await page.getByRole('button',{name:'Food in Jhotwara'}).click();await expect(page.getByRole('button',{name:'View Rambharose Cafe',exact:true})).toBeVisible();await page.getByLabel('Global restaurant and food search').fill('rambharose cafe');await page.getByRole('button',{name:'Search food',exact:true}).click();await expect(page.getByRole('button',{name:'View Rambharose Cafe',exact:true})).toBeVisible();await page.getByRole('button',{name:'View Rambharose Cafe',exact:true}).click();await expect(page.getByRole('heading',{name:'Rambharose Cafe',exact:true})).toBeVisible();
});
