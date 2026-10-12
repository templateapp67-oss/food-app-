package com.nexora.food.ui
import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.nexora.food.data.FoodRepository
import com.nexora.food.domain.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*
import org.json.JSONObject
data class FoodState(val restaurants:List<Restaurant> = emptyList(),val dishes:List<Dish> = emptyList(),val orders:List<FoodOrder> = emptyList(),val addresses:List<Address> = emptyList(),val profile:Profile?=null,val cart:List<CartLine> = emptyList(),val quote:Quote?=null,val points:Int=0,val tier:String="Bronze",val deletion:JSONObject?=null,val loading:Boolean=false,val error:String?=null,val message:String?=null)
class FoodViewModel(app:Application):AndroidViewModel(app){
 private val repo=FoodRepository(app)
 val demo=repo.demo
 val configured=repo.configured
 private val mutable=MutableStateFlow(FoodState(cart=repo.restoreCart()))
 val state:StateFlow<FoodState> = mutable.asStateFlow()
 private var tracking:Job?=null
 init{com.nexora.food.push.FoodPush.initialize(app);refresh()}
 private fun action(block:suspend()->Unit){viewModelScope.launch{mutable.update{it.copy(loading=true,error=null,message=null)};try{block()}catch(c:CancellationException){throw c}catch(e:Exception){mutable.update{it.copy(error=e.message?:"Something went wrong. Please retry.")}}finally{mutable.update{it.copy(loading=false)}}}}
 fun refresh(){action{load()}}
 private suspend fun load(){runCatching{com.nexora.food.push.FoodPush.refresh(getApplication(),repo)};val rs=repo.restaurants();val dishes=repo.dishes();val profile=repo.profile();val orders=repo.orders();val addresses=repo.addresses();val reward=if(profile!=null)repo.rewards()else JSONObject();mutable.update{it.copy(restaurants=rs,dishes=dishes,profile=profile,orders=orders,addresses=addresses,points=reward.optInt("balance_points"),tier=reward.optString("tier","Bronze"))}}
 fun startTracking(){if(tracking?.isActive==true)return;tracking=viewModelScope.launch{while(isActive){delay(15000);runCatching{repo.orders()}.onSuccess{orders->mutable.update{it.copy(orders=orders)}}}}}
 fun stopTracking(){tracking?.cancel();tracking=null}
 fun add(d:Dish,replace:Boolean=false){if(!d.available)return;val oldRestaurant=state.value.dishes.find{it.id==state.value.cart.firstOrNull()?.itemId}?.restaurantId;if(oldRestaurant!=null&&oldRestaurant!=d.restaurantId&&!replace){mutable.update{it.copy(error="Your cart contains another kitchen. Clear it before adding from this restaurant.")};return};val cart=if(replace)emptyList()else state.value.cart;val old=cart.find{it.itemId==d.id};val next=if(old!=null)cart.map{if(it.itemId==d.id)it.copy(quantity=minOf(20,it.quantity+1))else it}else cart+CartLine(d.id,1);repo.saveCart(next);mutable.update{it.copy(cart=next,quote=null)}}
 fun change(id:String,delta:Int){val cart=state.value.cart.map{if(it.itemId==id)it.copy(quantity=minOf(20,it.quantity+delta))else it}.filter{it.quantity>0};repo.saveCart(cart);mutable.update{it.copy(cart=cart,quote=null)}}
 fun clearCart(){repo.saveCart(emptyList());mutable.update{it.copy(cart=emptyList(),quote=null)}}
 fun quote(address:Address,coupon:String){action{val s=state.value;val restaurant=s.dishes.find{it.id==s.cart.firstOrNull()?.itemId}?.restaurantId?:error("Add a dish first.");val q=repo.quote(restaurant,s.cart,address,coupon,s.dishes);mutable.update{it.copy(quote=q)}}}
 fun place(address:Address,coupon:String){if(state.value.loading)return;action{val s=state.value;val q=s.quote?:error("Review your cart first.");val restaurant=s.restaurants.find{r->r.id==s.dishes.find{it.id==s.cart.firstOrNull()?.itemId}?.restaurantId}?:error("Kitchen unavailable.");repo.place(restaurant,s.cart,address,coupon,q);clearCart();load();mutable.update{it.copy(message=if(demo)"Demo order created. No payment or delivery takes place."else"Order placed.")}}}
 fun signIn(email:String,password:String,onDone:()->Unit){action{repo.signIn(email,password);load();onDone()}}
 fun signUp(name:String,email:String,password:String,onDone:()->Unit){action{val signedIn=repo.signUp(name,email,password);if(signedIn){load();onDone()}else mutable.update{it.copy(message="Check your email to confirm your account, then sign in.")}}}
 fun review(order:String,rating:Int,body:String){action{repo.submitReview(order,rating,body);mutable.update{it.copy(message="Review saved.")}}}
 fun sendCode(phone:String,onSent:()->Unit){action{repo.otp(phone);onSent()}}
 fun verify(phone:String,code:String,onDone:()->Unit){action{repo.verify(phone,code);load();onDone()}}
 fun saveProfile(name:String,email:String){action{repo.saveProfile(name,email);load();mutable.update{it.copy(message="Profile saved.")}}}
 fun saveAddress(data:JSONObject){action{repo.rpc("nexora_save_address",JSONObject().put("p_address",data));load();mutable.update{it.copy(message="Address saved.")}}}
 fun cancel(o:FoodOrder,reason:String){action{require(reason.trim().length>=3){"Enter a cancellation reason."};if(demo)error("Demo order cancellation is available on the Web workspace.");repo.cancel(o.id,reason);load()}}
 fun deletionStatus(){action{val deletion=repo.deletionStatus();mutable.update{it.copy(deletion=deletion)};if(deletion.optJSONObject("request")?.optString("status")=="completed"){load();mutable.update{it.copy(message="Account deletion completed. You are signed out.")}}}}
 fun requestDeletion(password:String,word:String){action{if(demo)error("Demo account cannot be deleted.");repo.requestDeletion(password,word);mutable.update{it.copy(deletion=repo.deletionStatus(),message="Deletion request recorded.")}}}
 fun cancelDeletion(id:String){action{repo.cancelDeletion(id);mutable.update{it.copy(deletion=repo.deletionStatus())}}}
 fun pushPermissionDenied(){mutable.update{it.copy(message="Notification permission denied. Enable it in Android app settings to receive push alerts. In-app updates remain available.")}}
 fun enablePush(){action{com.nexora.food.push.FoodPush.enable(getApplication(),repo);mutable.update{it.copy(message="Order push enabled.")}}}
 fun logout(){action{repo.logout();clearCart();load()}}
 fun dismissError(){mutable.update{it.copy(error=null,message=null)}}
}
