package com.nexora.food.ui
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.nexora.food.R
import com.nexora.food.domain.*
import org.json.JSONObject
@OptIn(ExperimentalMaterial3Api::class)
@Composable fun FoodApp(vm:FoodViewModel,deepLinkOrder:String?=null){
 val state by vm.state.collectAsStateWithLifecycle()
 var deletionOpen by rememberSaveable{mutableStateOf(false)}
 var deletionPassword by remember{mutableStateOf("")}
 var deletionWord by remember{mutableStateOf("")}
 val pushPermission=androidx.activity.compose.rememberLauncherForActivityResult(androidx.activity.result.contract.ActivityResultContracts.RequestPermission()){granted->if(granted)vm.enablePush()}
 var tab by rememberSaveable{mutableStateOf(if(deepLinkOrder!=null)2 else 0)}
 var selected by rememberSaveable{mutableStateOf<String?>(null)}
 var query by rememberSaveable{mutableStateOf("")}
 var cartOpen by rememberSaveable{mutableStateOf(false)}
 var login by rememberSaveable{mutableStateOf(false)}
 var addressOpen by rememberSaveable{mutableStateOf(false)}
 var selectedAddress by rememberSaveable{mutableStateOf<String?>(null)}
 var coupon by rememberSaveable{mutableStateOf("")}
 var authEmail by rememberSaveable{mutableStateOf("")}
 var authPassword by rememberSaveable{mutableStateOf("")}
 var authName by rememberSaveable{mutableStateOf("")}
 var createAccount by rememberSaveable{mutableStateOf(false)}
 var phone by rememberSaveable{mutableStateOf("")}
 var otp by rememberSaveable{mutableStateOf("")}
 var sent by rememberSaveable{mutableStateOf(false)}
 var countdown by rememberSaveable{mutableIntStateOf(0)}
 LaunchedEffect(countdown){if(countdown>0){kotlinx.coroutines.delay(1000);countdown--}}
 val address=state.addresses.find{it.id==selectedAddress}?:state.addresses.firstOrNull()
 LaunchedEffect(deepLinkOrder,state.orders){if(deepLinkOrder!=null&&state.orders.any{it.id==deepLinkOrder})tab=2}
 LaunchedEffect(deletionOpen){while(deletionOpen){kotlinx.coroutines.delay(15000);vm.deletionStatus()}}
 val labels=listOf(stringResource(R.string.home),stringResource(R.string.search),stringResource(R.string.orders),stringResource(R.string.rewards),stringResource(R.string.profile))
 val icons=listOf("⌂","⌕","▤","✧","◯")
 BackHandler(enabled=selected!=null||cartOpen){if(cartOpen)cartOpen=false else selected=null}
 DisposableEffect(tab){if(tab==2)vm.startTracking();onDispose{vm.stopTracking()}}
 Scaffold(topBar={Column{if(vm.demo)Text(stringResource(R.string.demo_notice),fontSize=10.sp,color=MaterialTheme.colorScheme.secondary,modifier=Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceVariant).padding(10.dp));TopAppBar(title={Column{Text(stringResource(R.string.app_name),fontWeight=FontWeight.Bold);Text(address?.let{"${it.locality}, ${it.city}"}?:"Choose delivery address",fontSize=11.sp,color=MaterialTheme.colorScheme.onSurfaceVariant)}},actions={TextButton(onClick={addressOpen=true}){Text("Address")}})}},bottomBar={NavigationBar{labels.forEachIndexed{i,l->NavigationBarItem(selected=tab==i,onClick={tab=i;selected=null},icon={Text(icons[i],fontSize=22.sp)},label={Text(l,fontSize=10.sp)})}}},floatingActionButton={if(state.cart.isNotEmpty()&&!cartOpen)ExtendedFloatingActionButton(onClick={cartOpen=true}){Text("${state.cart.sumOf{it.quantity}} items · ${stringResource(R.string.cart)}")}}){padding->
  LazyColumn(modifier=Modifier.fillMaxSize().padding(padding),contentPadding=PaddingValues(16.dp),verticalArrangement=Arrangement.spacedBy(16.dp)){
   if(!vm.configured&&!vm.demo)item{InfoCard(stringResource(R.string.backend_missing));OutlinedButton(onClick=vm::refresh){Text(stringResource(R.string.retry))}}
   if(state.loading)item{LinearProgressIndicator(modifier=Modifier.fillMaxWidth())}
   state.error?.let{message->item{InfoCard(message,true);TextButton(onClick=vm::dismissError){Text("Dismiss")}}}
   state.message?.let{message->item{InfoCard(message);TextButton(onClick=vm::dismissError){Text("Dismiss")}}}
   when{
    selected!=null->{val r=state.restaurants.find{it.id==selected};item{TextButton(onClick={selected=null}){Text("← Back")};Text(r?.name.orEmpty(),fontSize=26.sp,fontWeight=FontWeight.Bold);DemoPhoto(r?.name.orEmpty(),vm.demo);Text(r?.description.orEmpty(),color=MaterialTheme.colorScheme.onSurfaceVariant)};items(state.dishes.filter{it.restaurantId==selected},key={it.id}){d->DishCard(d,state.cart.find{it.itemId==d.id}?.quantity?:0,onAdd={vm.add(d)},onRemove={vm.change(d.id,-1)},demo=vm.demo)}}
    tab==0||tab==1->{if(tab==0)item{Card(colors=CardDefaults.cardColors(containerColor=MaterialTheme.colorScheme.surfaceVariant)){Column(Modifier.padding(24.dp)){Text("NEXORA FOOD · JAIPUR ONLY",fontSize=10.sp,color=MaterialTheme.colorScheme.primary);Spacer(Modifier.height(14.dp));Text(stringResource(R.string.discover),fontSize=30.sp,fontWeight=FontWeight.Bold);Text(stringResource(R.string.tagline),modifier=Modifier.padding(top=12.dp),color=MaterialTheme.colorScheme.onSurfaceVariant)}}};item{OutlinedTextField(value=query,onValueChange={query=it},label={Text(stringResource(R.string.search_hint))},singleLine=true,modifier=Modifier.fillMaxWidth());Text("Good food near you",fontSize=22.sp,fontWeight=FontWeight.Bold,modifier=Modifier.padding(top=22.dp))};val filtered=state.restaurants.filter{it.name.contains(query,true)||state.dishes.any{d->d.restaurantId==it.id&&d.name.contains(query,true)}};if(filtered.isEmpty()&&!state.loading)item{InfoCard("No restaurants match your search. Try another dish or area.")};items(filtered,key={it.id}){r->Card(Modifier.fillMaxWidth().clickable{selected=r.id}){Column(Modifier.padding(20.dp)){DemoPhoto(r.name,vm.demo);if(vm.demo)Text("AI demo concept",fontSize=10.sp,color=MaterialTheme.colorScheme.onSurfaceVariant);Text(r.name,fontSize=20.sp,fontWeight=FontWeight.Bold);Text(r.description,modifier=Modifier.padding(top=8.dp),color=MaterialTheme.colorScheme.onSurfaceVariant);Text("${r.prepMinutes} min preparation · ${r.city}",fontSize=12.sp,modifier=Modifier.padding(top=12.dp));if(r.closed)Text("Temporarily closed",color=MaterialTheme.colorScheme.error)}}}}
    tab==2->{item{Text("Your orders",fontSize=28.sp,fontWeight=FontWeight.Bold)};if(state.orders.isEmpty())item{InfoCard("Your first delicious memory awaits. Explore a kitchen and place an order.")};items(state.orders,key={it.id}){o->Card(Modifier.fillMaxWidth()){Column(Modifier.padding(20.dp)){Text(o.restaurant,fontSize=19.sp,fontWeight=FontWeight.Bold);Text(o.number,fontSize=11.sp,color=MaterialTheme.colorScheme.onSurfaceVariant);Text(o.status.replace('_',' '),color=MaterialTheme.colorScheme.secondary,modifier=Modifier.padding(top=12.dp));Text(money(o.totalPaise),fontWeight=FontWeight.Bold);Text("Payment: ${o.paymentStatus.replace('_',' ')}",fontSize=11.sp);if(o.status in listOf("placed","confirmed","pending_payment"))TextButton(onClick={vm.cancel(o,"Changed my plans")}){Text("Cancel order")}}}}}
    tab==3->{item{Text("Nexora Rewards",fontSize=28.sp,fontWeight=FontWeight.Bold);Card(Modifier.fillMaxWidth()){Column(Modifier.padding(28.dp)){Text("✧",fontSize=50.sp,color=MaterialTheme.colorScheme.secondary);Text("${state.points} points",fontSize=32.sp,fontWeight=FontWeight.Bold);Text(state.tier,color=MaterialTheme.colorScheme.secondary);Text("Earn on eligible delivered orders. Reward rules are configured by the platform.",modifier=Modifier.padding(top=16.dp))}}}}
    else->{item{Text("Your Nexora",fontSize=28.sp,fontWeight=FontWeight.Bold)};if(state.profile==null)item{InfoCard("Sign in to order and track across devices.");Button(onClick={login=true}){Text(stringResource(R.string.sign_in))}}else item{ProfileEditor(state.profile,vm);OutlinedButton(onClick={addressOpen=true}){Text("Saved addresses")};TextButton(onClick={deletionOpen=true;vm.deletionStatus()}){Text("Request account deletion")};if(state.orders.isNotEmpty()&&!vm.demo){Text("Optional preparation and delivery alerts");TextButton(onClick={if(android.os.Build.VERSION.SDK_INT>=33)pushPermission.launch(android.Manifest.permission.POST_NOTIFICATIONS)else vm.enablePush()}){Text("Enable order notifications")}}
 TextButton(onClick=vm::logout){Text("Log out")}}}
   }
  }
 }
 if(cartOpen)ModalBottomSheet(onDismissRequest={cartOpen=false}){LazyColumn(contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(12.dp)){
  item{Text("Your good-food bag",fontSize=24.sp,fontWeight=FontWeight.Bold)}
  items(state.cart,key={it.itemId}){line->val dish=state.dishes.find{it.id==line.itemId};Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Column(Modifier.weight(1f)){Text(dish?.name?:"Unavailable item");Text(money((dish?.pricePaise?:0)*line.quantity),fontSize=12.sp)};TextButton(onClick={vm.change(line.itemId,-1)}){Text("−")};Text(line.quantity.toString());TextButton(onClick={vm.change(line.itemId,1)}){Text("+")}}}
  item{OutlinedTextField(coupon,{coupon=it},label={Text("Coupon code")},modifier=Modifier.fillMaxWidth());Text("Deliver to: ${address?.line1?:"Choose address"}");TextButton(onClick={addressOpen=true}){Text("Change delivery address")}}
  state.quote?.let{q->item{SummaryRow("Subtotal",q.subtotal);SummaryRow("Coupon discount",-q.couponDiscount);SummaryRow("Delivery",q.delivery);SummaryRow("Tax",q.tax);HorizontalDivider();SummaryRow("Total",q.total);if(vm.demo)InfoCard("Sample order only. No payment or delivery takes place.");Button(onClick={address?.let{vm.place(it,coupon)}},enabled=!state.loading&&address!=null,modifier=Modifier.fillMaxWidth()){Text(if(vm.demo)"Create demo COD order"else"Place COD order")}}}?:item{Button(onClick={address?.let{vm.quote(it,coupon)}},enabled=!state.loading&&state.cart.isNotEmpty()&&address!=null,modifier=Modifier.fillMaxWidth()){Text(stringResource(R.string.continue_checkout))}}
  item{TextButton(onClick=vm::clearCart){Text("Clear cart")};state.error?.let{InfoCard(it,true)};state.message?.let{InfoCard(it)};Spacer(Modifier.height(32.dp))}
 }}
 if(login)AlertDialog(onDismissRequest={login=false},title={Text(if(createAccount)"Create your Food account"else"Sign in to Nexora Food")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){if(createAccount)OutlinedTextField(authName,{authName=it},label={Text("Full name")});OutlinedTextField(authEmail,{authEmail=it},label={Text("Email")},singleLine=true);OutlinedTextField(authPassword,{authPassword=it},label={Text("Password")},singleLine=true,visualTransformation=androidx.compose.ui.text.input.PasswordVisualTransformation());state.error?.let{Text(it,color=MaterialTheme.colorScheme.error)};state.message?.let{Text(it)}}},confirmButton={Button(onClick={if(createAccount)vm.signUp(authName,authEmail,authPassword){login=false;authPassword=""}else vm.signIn(authEmail,authPassword){login=false;authPassword=""}},enabled=vm.configured&&!state.loading){Text(if(createAccount)"Create account"else"Sign in")}},dismissButton={TextButton(onClick={createAccount=!createAccount;vm.dismissError()}){Text(if(createAccount)"Already registered? Sign in"else"Create account")}})
 if(deletionOpen)AlertDialog(onDismissRequest={deletionOpen=false;deletionPassword=""},title={Text("Account deletion")},text={Column(verticalArrangement=Arrangement.spacedBy(12.dp)){
 Text("Removes profile, avatar, addresses, tokens, favourites, history and support personal content. Financial records remain anonymized. Active orders/COD dues and shared-account links can block processing.")
 Text(state.deletion?.optJSONObject("retention")?.optString("public_text")?:"Retention period awaits owner/legal review.")
 state.deletion?.optJSONObject("request")?.let{r->Text("Status: ${r.optString("status")} · ${r.optString("requested_at")}");Text(r.optString("blocker_code"));if(r.optString("status") in listOf("requested","blocked_active_orders")&&r.optString("stage")=="requested")TextButton(onClick={vm.cancelDeletion(r.getString("id"))}){Text("Cancel pending request")}}
 OutlinedTextField(deletionPassword,{deletionPassword=it},label={Text("Re-enter password")},visualTransformation=androidx.compose.ui.text.input.PasswordVisualTransformation())
 OutlinedTextField(deletionWord,{deletionWord=it},label={Text("Type DELETE")})
 state.error?.let{Text(it,color=MaterialTheme.colorScheme.error)}
 }},confirmButton={Button(enabled=deletionWord=="DELETE"&&deletionPassword.isNotBlank()&&!state.loading,onClick={vm.requestDeletion(deletionPassword,deletionWord);deletionPassword=""}){Text("Confirm deletion request")}},dismissButton={TextButton(onClick={deletionOpen=false;deletionPassword=""}){Text("Close")}})
 if(addressOpen)AddressDialog(vm,state.addresses,onSelect={selectedAddress=it;addressOpen=false},onDismiss={addressOpen=false})
}
@Composable private fun InfoCard(text:String,error:Boolean=false){Surface(color=if(error)MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant,shape=MaterialTheme.shapes.medium,modifier=Modifier.fillMaxWidth()){Text(text,Modifier.padding(16.dp),fontSize=13.sp,color=if(error)MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurfaceVariant)}}
@Composable private fun SummaryRow(label:String,amount:Long){Row(Modifier.fillMaxWidth().padding(vertical=7.dp),horizontalArrangement=Arrangement.SpaceBetween){Text(label);Text(money(amount),fontWeight=FontWeight.SemiBold)}}
@Composable private fun DishCard(d:Dish,quantity:Int,onAdd:()->Unit,onRemove:()->Unit,demo:Boolean=false){Card(Modifier.fillMaxWidth()){Column(Modifier.padding(20.dp)){DemoPhoto(d.name,demo);Text(if(d.veg)"● Vegetarian"else"● Non-vegetarian",fontSize=10.sp,color=if(d.veg)MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.error);Text(d.name,fontSize=19.sp,fontWeight=FontWeight.Bold);Text(d.description,fontSize=12.sp,modifier=Modifier.padding(vertical=10.dp),color=MaterialTheme.colorScheme.onSurfaceVariant);Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Text(money(d.pricePaise),fontWeight=FontWeight.Bold);if(quantity>0)Row(verticalAlignment=Alignment.CenterVertically){TextButton(onClick=onRemove){Text("−")};Text(quantity.toString());TextButton(onClick=onAdd){Text("+")}}else Button(onClick=onAdd,enabled=d.available){Text(stringResource(R.string.add))}}}}}
@Composable private fun ProfileEditor(profile:Profile?,vm:FoodViewModel){var name by remember(profile?.name){mutableStateOf(profile?.name.orEmpty())};var email by remember(profile?.email){mutableStateOf(profile?.email.orEmpty())};Column(verticalArrangement=Arrangement.spacedBy(14.dp)){OutlinedTextField(name,{name=it},label={Text("Name")},modifier=Modifier.fillMaxWidth());OutlinedTextField(email,{email=it},label={Text("Email")},readOnly=!vm.demo,modifier=Modifier.fillMaxWidth());Button(onClick={vm.saveProfile(name,email)}){Text("Save profile")}}}
@Composable
private fun AddressDialog(
 vm: FoodViewModel,
 addresses: List<Address>,
 onSelect: (String) -> Unit,
 onDismiss: () -> Unit
) {
 var add by remember { mutableStateOf(false) }
 var street by remember { mutableStateOf("") }
 var area by remember { mutableStateOf("") }
 var areaMenu by remember { mutableStateOf(false) }
 var pin by remember { mutableStateOf("") }
 var lat by remember { mutableStateOf("") }
 var lng by remember { mutableStateOf("") }
 var error by remember { mutableStateOf("") }
 AlertDialog(
  onDismissRequest = onDismiss,
  title = { Text("Delivery in Jaipur") },
  text = {
   LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
    items(addresses.filter { ServiceArea.supports(it.city) }) { address ->
     TextButton(onClick = { onSelect(address.id) }) {
      Text("${address.line1}, ${address.locality}, ${address.city} ${address.pincode}")
     }
    }
    if (add) {
     item {
      OutlinedTextField(street, { street = it }, label = { Text("House / street") })
      Box {
       OutlinedButton(onClick = { areaMenu = true }) { Text(area.ifBlank { "Choose Jaipur area" }) }
       DropdownMenu(expanded = areaMenu, onDismissRequest = { areaMenu = false }) {
        ServiceArea.localities.forEach { locality ->
         DropdownMenuItem(text = { Text(locality) }, onClick = { area = locality; areaMenu = false })
        }
       }
      }
      Text("Jaipur, Rajasthan · Food ordering")
      OutlinedTextField(pin, { pin = it }, label = { Text("PIN code") })
      OutlinedTextField(lat, { lat = it }, label = { Text("Latitude") })
      OutlinedTextField(lng, { lng = it }, label = { Text("Longitude") })
      if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error)
     }
    }
   }
  },
  confirmButton = {
   TextButton(
    enabled = !vm.demo,
    onClick = {
     if (!add) {
      add = true
     } else {
      val latitude = lat.toDoubleOrNull()
      val longitude = lng.toDoubleOrNull()
      if (street.isBlank() || area !in ServiceArea.localities || !Regex("^302[0-9]{3}$").matches(pin)
       || latitude == null || longitude == null || latitude !in 26.5..27.4 || longitude !in 75.3..76.3) {
       error = "Enter your street, Jaipur area, 302xxx PIN code and Jaipur coordinates."
      } else {
       vm.saveAddress(JSONObject().put("type", "home").put("line1", street).put("locality", area)
        .put("city", ServiceArea.city).put("state", ServiceArea.state).put("pincode", pin)
        .put("latitude", latitude).put("longitude", longitude))
       add = false
      }
     }
    }
   ) { Text(if (add) "Save address" else "Add address") }
  },
  dismissButton = { TextButton(onClick = onDismiss) { Text("Close") } }
 )
}
