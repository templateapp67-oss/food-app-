import {supabase,rpc} from './api';
const e=import.meta.env;
export const firebaseConfig={apiKey:e.VITE_FIREBASE_API_KEY,authDomain:e.VITE_FIREBASE_AUTH_DOMAIN,projectId:e.VITE_FIREBASE_PROJECT_ID,messagingSenderId:e.VITE_FIREBASE_MESSAGING_SENDER_ID,appId:e.VITE_FIREBASE_APP_ID};
export const pushConfigured=Object.values(firebaseConfig).every(Boolean)&&!!e.VITE_FIREBASE_VAPID_KEY;
export const pushSupported=()=>typeof Notification!=='undefined'&&'serviceWorker'in navigator&&window.isSecureContext!==false;
let currentToken:string|null=null;let foregroundUnsubscribe:(()=>void)|null=null;
export async function enablePush(){
 const session=await supabase?.auth.getSession();if(!session?.data.session)throw Error('Sign in before enabling push.');
 const orders=await supabase!.from('nexora_food_orders').select('id').eq('user_id',session.data.session.user.id).neq('status','pending_payment').eq('is_demo',false).limit(1);if(orders.error||!orders.data?.length)throw Error('Place your first live order before enabling notifications.');
 if(!pushSupported())throw Error('Push notifications are unavailable in this browser.');
 if(!pushConfigured)throw Error('Push delivery is not configured yet. In-app order updates remain available.');
 const [{initializeApp,getApps},messaging]=await Promise.all([import('firebase/app'),import('firebase/messaging')]);
 if(!await messaging.isSupported())throw Error('This browser does not support Firebase push.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error(permission==='denied'?'Notifications blocked. Enable permission in browser settings.':'Permission not granted. You can retry later.');
 const registration=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{type:'module',scope:'/firebase-cloud-messaging-push-scope/'});
 await new Promise<void>((resolve,reject)=>{if(registration.active)return resolve();const worker=registration.installing||registration.waiting;if(!worker)return reject(Error('Push worker unavailable'));const timer=setTimeout(()=>reject(Error('Push worker activation timed out')),15000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve()}})});
 const app=getApps().find(a=>a.name==='nexora-food')||initializeApp(firebaseConfig,'nexora-food');const m=messaging.getMessaging(app);
 const token=await messaging.getToken(m,{vapidKey:e.VITE_FIREBASE_VAPID_KEY,serviceWorkerRegistration:registration});if(!token)throw Error('Could not register this device.');
 // Store only after backend ownership binding succeeds; tokens never go into localStorage.
 await rpc('nexora_register_device_token',{p_token:token,p_platform:'web',p_app_version:'0.1.0'});currentToken=token;localStorage.setItem('nexora.notifications','true');
 if(!foregroundUnsubscribe)foregroundUnsubscribe=messaging.onMessage(m,async payload=>{const id=payload.data?.order_id;if(!id)return;const session=await supabase?.auth.getSession();if(!session?.data.session)return;const own=await supabase!.from('nexora_food_orders').select('id').eq('id',id).eq('user_id',session.data.session.user.id).maybeSingle();if(own.data)await registration.showNotification('Order update',{body:'Open Nexora Food for your order status.',tag:payload.data?.notification_id,icon:'/pwa-192.png'});});
 return 'Push notifications enabled for order updates.';
}
export async function disablePush(){if(currentToken){await rpc('nexora_unregister_device_token',{p_token:currentToken});currentToken=null;}else if(pushConfigured&&pushSupported()&&Notification.permission==='granted'){
 const [{initializeApp,getApps},m]=await Promise.all([import('firebase/app'),import('firebase/messaging')]);if(await m.isSupported()){const app=getApps().find(a=>a.name==='nexora-food')||initializeApp(firebaseConfig,'nexora-food');const registration=await navigator.serviceWorker.getRegistration('/firebase-cloud-messaging-push-scope/');if(registration){const token=await m.getToken(m.getMessaging(app),{vapidKey:e.VITE_FIREBASE_VAPID_KEY,serviceWorkerRegistration:registration});if(token)await rpc('nexora_unregister_device_token',{p_token:token});await m.deleteToken(m.getMessaging(app));}}}
 foregroundUnsubscribe?.();foregroundUnsubscribe=null;localStorage.removeItem('nexora.notifications');}
export async function logoutWithPush(){await disablePush();const result=await supabase?.auth.signOut();if(result?.error)throw result.error;}
// Firebase getToken checks subscription changes; refresh on foreground/login without prompting.
export async function refreshPush(){if(pushSupported()&&Notification.permission==='granted'&&localStorage.getItem('nexora.notifications')==='true')await enablePush();}
