package com.nexora.food.push
import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.nexora.food.MainActivity
import com.nexora.food.R
import com.nexora.food.data.FoodRepository
import kotlinx.coroutines.*
class FoodMessagingService: FirebaseMessagingService() {
 override fun onNewToken(token: String) {
  FoodPush.rememberToken(this,token)
  CoroutineScope(SupervisorJob()+Dispatchers.IO).launch { runCatching { FoodPush.refresh(applicationContext,FoodRepository(applicationContext)) } }
 }
 override fun onMessageReceived(message: RemoteMessage) {
  val order=message.data["order_id"]?:return;val notification=message.data["notification_id"]?:return
  if(!Regex("^[0-9a-f-]{36}$",RegexOption.IGNORE_CASE).matches(order))return
  CoroutineScope(SupervisorJob()+Dispatchers.IO).launch {
   // Never trust a notification deep link; fetch only the signed-in customer's owned orders.
   val orders=runCatching { FoodRepository(applicationContext).orders() }.getOrNull()?:return@launch
   if(orders.none { it.id==order })return@launch
   if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return@launch
   val p=getSharedPreferences("nexora_food_push_seen",MODE_PRIVATE);if(p.contains(notification))return@launch;p.edit().putBoolean(notification,true).apply()
   val manager=getSystemService(NotificationManager::class.java);manager.createNotificationChannel(NotificationChannel("food_orders","Food order updates",NotificationManager.IMPORTANCE_DEFAULT))
   val intent=Intent(applicationContext,MainActivity::class.java).setData(Uri.parse("nexorafood://order/$order")).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
   val pending=PendingIntent.getActivity(applicationContext,order.hashCode(),intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
   manager.notify(notification.hashCode(),Notification.Builder(applicationContext,"food_orders").setSmallIcon(R.drawable.nexora_icon).setContentTitle("Order update").setContentText("Open Nexora Food for your order status.").setContentIntent(pending).setAutoCancel(true).build())
  }
 }
}
