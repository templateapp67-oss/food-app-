import {createClient} from '@supabase/supabase-js';
import {foodBackend} from './backend-config';
import type {CartLine,Quote,Address} from './model';
const env=import.meta.env;
const url=env.VITE_SUPABASE_URL||foodBackend.url;
const publicKey=env.VITE_SUPABASE_PUBLISHABLE_KEY||foodBackend.publishableKey;
export const configured=env.MODE!=='test'&&!!url&&!!publicKey;
export const supabase=configured?createClient(url,publicKey,{auth:{storageKey:'nexora.food.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
export const demoAllowed=env.MODE==='test'||env.VITE_DEMO_ENABLED==='true'||(env.VITE_DEMO_ENABLED!=='false'&&new URLSearchParams(location.search).get('preview')==='demo');
export async function rpc<T>(name:string,args:Record<string,unknown>={}):Promise<T>{if(!supabase)throw new Error('Live backend is not configured.');const {data,error}=await supabase.rpc(name.replace(/^nexora_/,'nexora_food_'),args);if(error)throw new Error(error.message);return data as T}
export async function quoteCart(restaurant:string,lines:CartLine[],address:Address,coupon:string,points:number){return rpc<Quote>('nexora_quote_cart',{p_restaurant:restaurant,p_lines:lines,p_address:address.id,p_coupon:coupon||null,p_points:points})}
export async function placeOrder(restaurant:string,lines:CartLine[],address:Address,coupon:string,points:number,key:string,method:string,quote:string){const payload={p_restaurant:restaurant,p_lines:lines,p_address:address.id,p_coupon:coupon||null,p_points:points,p_key:key,p_method:method,p_quote:quote};if(method!=='cod')throw new Error('Only Cash on Delivery is available right now.');return rpc<GatewayOrder>('nexora_place_order',payload)}
export type GatewayOrder={id:string;order_number:string;gateway_order_id?:string;key_id?:string;amount?:number};
type RazorpayOptions={key:string;order_id:string;amount:number;currency:string;name:string;handler:(result:unknown)=>void;modal:{ondismiss:()=>void}};
type RazorpayInstance={open:()=>void;on:(event:string,handler:()=>void)=>void};
export async function launchPayment(order:GatewayOrder){if(!order.gateway_order_id||!order.key_id||!order.amount)throw new Error('Payment order is not ready.');const w=window as unknown as {Razorpay?:new(options:RazorpayOptions)=>RazorpayInstance};if(!w.Razorpay)await new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Could not load payment checkout.'));document.head.appendChild(script)});if(!w.Razorpay)throw new Error('Payment checkout unavailable.');await new Promise<void>((resolve,reject)=>{const instance=new w.Razorpay!({key:order.key_id!,order_id:order.gateway_order_id!,amount:order.amount!,currency:'INR',name:'Nexora Food',handler:()=>resolve(),modal:{ondismiss:()=>reject(new Error('Payment checkout closed. The server order remains pending until it expires.'))}});instance.on('payment.failed',()=>reject(new Error('Payment was not confirmed. Check your order before retrying.')));instance.open()});const{data,error}=await supabase!.functions.invoke('nexora-food-verify-payment',{body:{order_id:order.id}});if(error||data?.status!=='placed'||data?.payment_status!=='paid')throw new Error('Confirming your payment. Check My Orders; payment success is not yet verified.');}

// Read all RLS-visible catalog rows in stable pages; search must not lose newer listings at row 100.
export async function readCatalog(table:'nexora_food_restaurants'|'nexora_food_menu_items'){
 if(!supabase)throw new Error('Live backend is not configured.');
 const data:any[]=[];const pageSize=500;
 for(let offset=0;;offset+=pageSize){
  let query=supabase.from(table).select('*').order('name').order('id').range(offset,offset+pageSize-1);
  if(table==='nexora_food_menu_items')query=query.is('deleted_at',null);
  const page=await query;if(page.error)return {data:[],error:page.error};
  data.push(...(page.data||[]));if((page.data||[]).length<pageSize)return {data,error:null};
 }
}
