package com.nexora.food.data
import android.content.Context
import com.nexora.food.BuildConfig
import com.nexora.food.core.SessionStore
import com.nexora.food.domain.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URI
class FoodRepository(private val context:Context){
 val configured=BuildConfig.SUPABASE_URL.startsWith("https://")&&BuildConfig.SUPABASE_PUBLISHABLE_KEY.isNotBlank()
 val demo=BuildConfig.DEMO_ENABLED&&!configured
 private val sessions=SessionStore(context.applicationContext)
 private val prefs=context.getSharedPreferences(if(demo)"nexora_demo_cart"else"nexora_live_cart",Context.MODE_PRIVATE)
 private val refreshLock=Mutex()
 private var session=sessions.read()?.let{runCatching{JSONObject(it)}.getOrNull()}
 suspend fun request(path:String,body:JSONObject?=null,method:String=if(body==null)"GET"else"POST",authenticated:Boolean=true):String=withContext(Dispatchers.IO){
  check(configured){"Live backend is not configured."}
  if(authenticated)refreshSession()
  val conn=URI(BuildConfig.SUPABASE_URL.trimEnd('/')+path).toURL().openConnection()as HttpURLConnection
  try{conn.requestMethod=method;conn.connectTimeout=15000;conn.readTimeout=20000;conn.setRequestProperty("apikey",BuildConfig.SUPABASE_PUBLISHABLE_KEY);conn.setRequestProperty("Content-Type","application/json");session?.optString("access_token")?.takeIf{it.isNotBlank()}?.let{conn.setRequestProperty("Authorization","Bearer $it")};if(body!=null){conn.doOutput=true;conn.outputStream.use{it.write(body.toString().toByteArray())}};val code=conn.responseCode;val raw=(if(code in 200..299)conn.inputStream else conn.errorStream)?.bufferedReader()?.use{it.readText()}.orEmpty();if(code !in 200..299){val message=runCatching{JSONObject(raw).optString("message",JSONObject(raw).optString("msg","Request failed"))}.getOrDefault("Request failed");throw IllegalStateException(message)};raw}finally{conn.disconnect()}
 }
 private suspend fun refreshSession(){val current=session?:return;val expires=current.optLong("expires_at",0);if(expires>System.currentTimeMillis()/1000+60)return;refreshLock.withLock{val s=session?:return@withLock;if(s.optLong("expires_at")>System.currentTimeMillis()/1000+60)return@withLock;try{val next=JSONObject(request("/auth/v1/token?grant_type=refresh_token",JSONObject().put("refresh_token",s.getString("refresh_token")),authenticated=false));next.put("expires_at",System.currentTimeMillis()/1000+next.optLong("expires_in",3600));session=next;sessions.save(next.toString())}catch(e:Exception){session=null;sessions.clear();throw IllegalStateException("Session expired. Sign in again.",e)}}}
 private suspend fun persistAuth(data:JSONObject){check(data.optString("access_token").isNotBlank()){ "Confirm your email, then sign in." };data.put("expires_at",System.currentTimeMillis()/1000+data.optLong("expires_in",3600));session=data;sessions.save(data.toString());rpc("nexora_ensure_account")}
 suspend fun signIn(email:String,password:String){require(email.contains("@")&&password.isNotBlank()){ "Enter your email and password." };persistAuth(JSONObject(request("/auth/v1/token?grant_type=password",JSONObject().put("email",email.trim()).put("password",password),authenticated=false)))}
 suspend fun signUp(name:String,email:String,password:String):Boolean{require(name.trim().isNotEmpty()&&email.contains("@")&&password.length>=8){ "Enter your name, email and a password with at least 8 characters." };val data=JSONObject(request("/auth/v1/signup",JSONObject().put("email",email.trim()).put("password",password).put("data",JSONObject().put("full_name",name.trim())),authenticated=false));if(data.optString("access_token").isBlank())return false;persistAuth(data);return true}
 suspend fun deletionStatus():JSONObject {
 val receipt=prefs.getString("deletion_receipt",null)
 if(receipt!=null){val status=runCatching{JSONObject(request("/functions/v1/nexora-food-public-deletion",JSONObject().put("action","status").put("receipt",receipt),authenticated=false))}.getOrNull()
 if(status?.optString("status")=="completed"){session=null;sessions.clear();prefs.edit().remove("deletion_receipt").apply();return JSONObject().put("request",status)} }
 val result=JSONObject(rpc("nexora_deletion_status"));val deletion=result.optJSONObject("request")
 if(deletion!=null&&receipt==null&&deletion.optString("status") in listOf("requested","processing","blocked_active_orders")){
 val value=rpc("nexora_deletion_receipt",JSONObject().put("p_request",deletion.getString("id"))).trim('"');prefs.edit().putString("deletion_receipt",value).apply() }
 return result
 }
 suspend fun requestDeletion(password:String,word:String){val email=session?.optJSONObject("user")?.optString("email")?:error("Email sign-in required");signIn(email,password);rpc("nexora_request_deletion",JSONObject().put("p_confirmation",word))}
 suspend fun cancelDeletion(id:String){rpc("nexora_cancel_deletion",JSONObject().put("p_request",id));prefs.edit().remove("deletion_receipt").apply()}
 suspend fun submitReview(order:String,rating:Int,body:String){rpc("nexora_submit_review",JSONObject().put("p_order",order).put("p_rating",rating).put("p_body",body))}
 suspend fun otp(phone:String){require(validPhone(phone)){"Enter a valid 10-digit mobile number."};request("/auth/v1/otp",JSONObject().put("phone","+91$phone").put("create_user",true),authenticated=false)}
 suspend fun verify(phone:String,code:String){require(Regex("^[0-9]{6}$").matches(code)){"Enter a 6-digit verification code."};val data=JSONObject(request("/auth/v1/verify",JSONObject().put("phone","+91$phone").put("token",code).put("type","sms"),authenticated=false));data.put("expires_at",System.currentTimeMillis()/1000+data.optLong("expires_in",3600));session=data;sessions.save(data.toString())}
 suspend fun logout(){com.nexora.food.push.FoodPush.disable(context,this);runCatching{request("/auth/v1/logout",JSONObject())};session=null;sessions.clear()}
 private fun uid()=session?.optJSONObject("user")?.optString("id")
 suspend fun rpc(name:String,body:JSONObject=JSONObject())=request("/rest/v1/rpc/${name.replaceFirst("nexora_", "nexora_food_")}",body)
 private fun rows(text:String):List<JSONObject>{val a=JSONArray(text);return(0 until a.length()).map{a.getJSONObject(it)}}
 suspend fun restaurants():List<Restaurant>{if(demo)return listOf(Restaurant("demo-r1","The Biryani House","Authentic dum biryani and comforting Indian classics.","Jaipur",25,"4.8"),Restaurant("demo-r2","Dough & Co.","Hand-stretched dough. Fresh ingredients. Wood-fired goodness.","Jaipur",30,"4.7"),Restaurant("demo-r3","Green Table","Fresh bowls and vibrant salads.","Jaipur",20,"4.9"));return rows(request("/rest/v1/nexora_food_restaurants?status=eq.active&city=ilike.Jaipur&select=*&limit=100")).map{Restaurant(it.getString("id"),it.getString("name"),it.optString("description"),it.getString("city"),it.getInt("prep_time_min"),it.optString("rating_avg"),it.optBoolean("is_temporarily_closed"))}}
 suspend fun dishes():List<Dish>{if(demo)return listOf(Dish("demo-i1","demo-r1","Dum Chicken Biryani","Freshly prepared and full of flavour.",24900,false,true),Dish("demo-i2","demo-r1","Paneer Biryani","Comfort in every bite.",22900,true,true),Dish("demo-i3","demo-r2","Margherita Pizza","Fresh basil and mozzarella.",29900,true,true),Dish("demo-i4","demo-r3","Buddha Bowl","Colourful grains and greens.",24900,true,true));return rows(request("/rest/v1/nexora_food_menu_items?deleted_at=is.null&select=*&limit=300")).map{Dish(it.getString("id"),it.getString("restaurant_id"),it.getString("name"),it.optString("description"),it.getLong("price_paise"),it.getBoolean("is_veg"),it.getBoolean("is_available"))}}
 suspend fun orders():List<FoodOrder>{if(demo)return rows(prefs.getString("orders","[]")?:"[]").map(::order);if(uid()==null)return emptyList();return rows(request("/rest/v1/nexora_food_orders?user_id=eq.${uid()}&select=*&order=created_at.desc&limit=100")).map(::order)}
 private fun order(o:JSONObject)=FoodOrder(o.getString("id"),o.getString("order_number"),o.getString("restaurant_name_snapshot"),o.getString("status"),o.getLong("total_paise"),o.getString("payment_status"))
 suspend fun addresses():List<Address>{if(demo)return listOf(Address("demo-a1","24, Park Avenue","C Scheme","Jaipur","302001"));if(uid()==null)return emptyList();return rows(request("/rest/v1/nexora_food_user_addresses?user_id=eq.${uid()}&city=ilike.Jaipur&deleted_at=is.null&select=*&limit=30")).map{Address(it.getString("id"),it.getString("line1"),it.getString("locality"),it.getString("city"),it.getString("pincode"))}}
 suspend fun profile():Profile?{if(demo)return Profile("demo-user",prefs.getString("name","Food lover")?:"Food lover","",prefs.getString("email","")?:"");if(uid()==null)return null;return rows(request("/rest/v1/nexora_food_profiles?id=eq.${uid()}&select=id,full_name,phone,email")).firstOrNull()?.let{Profile(it.getString("id"),it.optString("full_name"),it.optString("phone"),it.optString("email"))}}
 suspend fun saveProfile(name:String,email:String){require(name.trim().isNotEmpty()){ "Enter your name." };if(demo){prefs.edit().putString("name",name).putString("email",email).apply();return};rpc("nexora_save_account",JSONObject().put("p_name",name).put("p_phone",profile()?.phone.orEmpty()))}
 private fun lines(cart:List<CartLine>)=JSONArray(cart.map{JSONObject().put("item_id",it.itemId).put("quantity",it.quantity).apply{it.variantId?.let{v->put("variant_id",v)};put("addon_ids",JSONArray(it.addonIds))}})
 fun saveCart(cart:List<CartLine>){prefs.edit().putString("cart",lines(cart).toString()).apply()}
 fun restoreCart():List<CartLine> =runCatching{rows(prefs.getString("cart","[]")?:"[]").map{CartLine(it.getString("item_id"),it.getInt("quantity"),it.optString("variant_id").takeIf{v->v.isNotBlank()},(0 until it.optJSONArray("addon_ids").let{a->a?.length()?:0}).map{idx->it.getJSONArray("addon_ids").getString(idx)})}}.getOrDefault(emptyList())
 suspend fun quote(restaurant:String,cart:List<CartLine>,address:Address,coupon:String,dishes:List<Dish>):Quote{require(ServiceArea.supports(address.city)){"Nexora Food currently supports Jaipur only."};require(validateCart(cart)){"Invalid cart."};if(demo){val sub=cart.sumOf{l->(dishes.find{it.id==l.itemId}?.pricePaise?:0)*l.quantity};val discount=if(coupon.uppercase()=="DEMO20")minOf(10000,sub/5)else 0;require(coupon.isBlank()||discount>0){"Use DEMO20 in demo mode."};return Quote("demo-quote",sub,2900,0,discount,0,sub+2900-discount)};val q=JSONObject(rpc("nexora_quote_cart",JSONObject().put("p_restaurant",restaurant).put("p_lines",lines(cart)).put("p_address",address.id).put("p_coupon",coupon.ifBlank{null}).put("p_points",0)));return Quote(q.getString("quote_id"),q.getLong("items_subtotal_paise"),q.getLong("delivery_fee_paise"),q.getLong("tax_paise"),q.getLong("discount_coupon_paise"),q.getLong("discount_loyalty_paise"),q.getLong("total_paise"))}
 suspend fun place(restaurant:Restaurant,cart:List<CartLine>,address:Address,coupon:String,q:Quote):String{require(ServiceArea.supports(address.city)&&ServiceArea.supports(restaurant.city)){"Nexora Food currently supports Jaipur only."};val key=prefs.getString("checkout_key",null)?:java.util.UUID.randomUUID().toString().also{prefs.edit().putString("checkout_key",it).apply()};if(demo){val id=java.util.UUID.randomUUID().toString();val a=JSONArray(prefs.getString("orders","[]"));a.put(JSONObject().put("id",id).put("order_number","DEMO-"+System.currentTimeMillis().toString().takeLast(6)).put("restaurant_name_snapshot",restaurant.name).put("status","placed").put("payment_status","cod_pending").put("total_paise",q.total));prefs.edit().putString("orders",a.toString()).remove("checkout_key").apply();return id};val result=JSONObject(rpc("nexora_place_order",JSONObject().put("p_restaurant",restaurant.id).put("p_lines",lines(cart)).put("p_address",address.id).put("p_coupon",coupon.ifBlank{null}).put("p_points",0).put("p_method","cod").put("p_key",key).put("p_quote",q.id)));prefs.edit().remove("checkout_key").apply();return result.getString("id")}
 suspend fun cancel(id:String,reason:String){rpc("nexora_transition_order",JSONObject().put("p_order",id).put("p_to","cancelled").put("p_reason",reason))}
 suspend fun rewards():JSONObject=if(demo)JSONObject().put("balance_points",0).put("tier","Bronze")else JSONObject(rpc("nexora_loyalty_summary"))
}
