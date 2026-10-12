package com.nexora.food.push
import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import com.nexora.food.BuildConfig
import com.nexora.food.data.FoodRepository
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import org.json.JSONObject
object FoodPush {
 fun configured() = listOf(BuildConfig.FIREBASE_APP_ID, BuildConfig.FIREBASE_API_KEY, BuildConfig.FIREBASE_PROJECT_ID, BuildConfig.FIREBASE_SENDER_ID).all { it.isNotBlank() }
 fun initialize(context: Context): Boolean {
  if (!configured()) return false
  if (FirebaseApp.getApps(context).isEmpty()) FirebaseApp.initializeApp(context, FirebaseOptions.Builder().setApplicationId(BuildConfig.FIREBASE_APP_ID).setApiKey(BuildConfig.FIREBASE_API_KEY).setProjectId(BuildConfig.FIREBASE_PROJECT_ID).setGcmSenderId(BuildConfig.FIREBASE_SENDER_ID).build())
  return true
 }
 private fun prefs(context: Context) = context.getSharedPreferences("nexora_food_push",Context.MODE_PRIVATE)
 suspend fun enable(context: Context, repo: FoodRepository) {
  check(initialize(context)) { "Push delivery is not configured. In-app order updates remain available." }
  check(repo.orders().isNotEmpty()) { "Place your first live order before enabling push." }
  val token = suspendCancellableCoroutine<String> { c -> FirebaseMessaging.getInstance().token.addOnSuccessListener { if(c.isActive)c.resume(it) }.addOnFailureListener { if(c.isActive)c.resumeWithException(it) } }
  TokenRegistration({ t -> repo.rpc("nexora_register_device_token",JSONObject().put("p_token",t).put("p_platform","android").put("p_app_version",BuildConfig.VERSION_NAME)) },{ t -> repo.rpc("nexora_unregister_device_token",JSONObject().put("p_token",t)) }).enable(token)
  prefs(context).edit().putString("token",token).putBoolean("enabled",true).apply()
 }
 suspend fun refresh(context: Context, repo: FoodRepository) { if(prefs(context).getBoolean("enabled",false)) enable(context,repo) }
 suspend fun disable(context: Context, repo: FoodRepository) {
  val p=prefs(context);TokenRegistration({}, { t -> repo.rpc("nexora_unregister_device_token",JSONObject().put("p_token",t)) }).disable(p.getString("token",null));p.edit().clear().apply()
 }
 fun rememberToken(context: Context, token: String) { prefs(context).edit().putString("token",token).apply() }
}
