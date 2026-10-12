/// <reference lib="webworker" />
import {initializeApp} from 'firebase/app';
import {getMessaging,onBackgroundMessage} from 'firebase/messaging/sw';
const worker=self as unknown as ServiceWorkerGlobalScope;
const e=import.meta.env;
const config={apiKey:e.VITE_FIREBASE_API_KEY,authDomain:e.VITE_FIREBASE_AUTH_DOMAIN,projectId:e.VITE_FIREBASE_PROJECT_ID,messagingSenderId:e.VITE_FIREBASE_MESSAGING_SENDER_ID,appId:e.VITE_FIREBASE_APP_ID};
worker.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(worker.clients.openWindow('/#/orders'));});
if(Object.values(config).every(Boolean))onBackgroundMessage(getMessaging(initializeApp(config)),async payload=>{
 const d=payload.data;if(!d?.notification_id||!d.order_id)return;
 // Durable client dedupe even if provider retries the same FCM message.
 const cache=await caches.open('nexora-push-received');const key=new Request(worker.location.origin+'/push-received/'+encodeURIComponent(d.notification_id));if(await cache.match(key))return;
 await cache.put(key,new Response('1'));const keys=await cache.keys();if(keys.length>200)await cache.delete(keys[0]);
 await worker.registration.showNotification('Order update',{body:'Open Nexora Food for your order status.',icon:'/pwa-192.png',badge:'/pwa-192.png',tag:d.notification_id,data:{order_id:d.order_id}});
});
worker.addEventListener('install',()=>worker.skipWaiting());worker.addEventListener('activate',event=>event.waitUntil(worker.clients.claim()));
