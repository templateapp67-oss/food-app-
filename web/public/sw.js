const CACHE='nexora-shell-v5-commercial';
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const response=await fetch('/precache.json',{cache:'no-store'});if(!response.ok)throw new Error('Offline shell manifest unavailable');
 const files=await response.json();const safe=files.filter(path=>typeof path==='string'&&(path.startsWith('/assets/')||path==='/firebase-messaging-sw.js'));
 await cache.addAll(['/','/nexora-food-favicon.png','/nexora-food-logo.png','/manifest.webmanifest','/install-prompt.js',...safe]);
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('nexora-shell-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/downloads/'))return;if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('/')));return}if(!url.pathname.startsWith('/assets/')&&!['/install-prompt.js','/nexora-food-logo.png','/nexora-food-favicon.png','/manifest.webmanifest'].includes(url.pathname))return;event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(async cache=>{await cache.put(event.request,copy);const keys=await cache.keys();if(keys.length>60)await cache.delete(keys[0])}))}return response}))) });
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{const url='/#/orders';for(const client of clients){await client.navigate(url);return client.focus()}return self.clients.openWindow(url)}))});
