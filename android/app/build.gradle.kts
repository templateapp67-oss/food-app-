plugins { alias(libs.plugins.android.application); alias(libs.plugins.kotlin.android); alias(libs.plugins.kotlin.compose) }
fun config(name: String) = providers.gradleProperty(name).orElse(providers.environmentVariable(name)).orElse("").get()
fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
// google-services.json is injected by CI/owner and is never committed.
val googleFile = file("google-services.json")
val googleConfig = if (googleFile.exists()) groovy.json.JsonSlurper().parse(googleFile) as Map<*, *> else emptyMap<Any, Any>()
val googleProject = googleConfig["project_info"] as? Map<*, *> ?: emptyMap<Any, Any>()
val clients = googleConfig["client"] as? List<*> ?: emptyList<Any>()
fun firebaseClient(packageName: String): Map<*, *> = clients.mapNotNull { it as? Map<*, *> }.firstOrNull {
 val info = it["client_info"] as? Map<*, *>; val androidInfo = info?.get("android_client_info") as? Map<*, *>
 androidInfo?.get("package_name") == packageName
} ?: emptyMap<Any, Any>()
android {
 namespace = "com.nexora.food"
 compileSdk = 36
 defaultConfig {
  applicationId = "com.nexora.food"
  minSdk = 26
  targetSdk = 36
  versionCode = 1
  versionName = "0.1.0"
  testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  buildConfigField("String", "SUPABASE_URL", quoted(config("SUPABASE_URL").ifBlank { "https://zilwgiuiygqqardzutxi.supabase.co" }))
  buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", quoted(config("SUPABASE_PUBLISHABLE_KEY").ifBlank { "sb_publishable_Xck8H8PcTCCnEwkvBfiSLw_c973vJkH" }))
 }
 buildTypes {
  debug { applicationIdSuffix = ".debug"; buildConfigField("boolean", "DEMO_ENABLED", "true") }
  release {
   isMinifyEnabled = true
   isShrinkResources = true
   buildConfigField("boolean", "DEMO_ENABLED", "false")
   proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
  }
 }
 buildTypes.all {
 val client = firebaseClient(if (name == "debug") "com.nexora.food.debug" else "com.nexora.food")
 val info = client["client_info"] as? Map<*, *>
 val key = (client["api_key"] as? List<*>)?.firstOrNull() as? Map<*, *>
 buildConfigField("String", "FIREBASE_APP_ID", quoted(info?.get("mobilesdk_app_id")?.toString().orEmpty()))
 buildConfigField("String", "FIREBASE_API_KEY", quoted(key?.get("current_key")?.toString().orEmpty()))
 buildConfigField("String", "FIREBASE_PROJECT_ID", quoted(googleProject["project_id"]?.toString().orEmpty()))
 buildConfigField("String", "FIREBASE_SENDER_ID", quoted(googleProject["project_number"]?.toString().orEmpty()))
 }
 buildFeatures { compose = true; buildConfig = true }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
dependencies {
 implementation(platform("com.google.firebase:firebase-bom:34.18.0"))
 implementation("com.google.firebase:firebase-messaging")
 implementation(libs.compose.ui); implementation(libs.compose.foundation); implementation(libs.compose.preview)
 implementation(libs.material3); implementation(libs.activity); implementation(libs.lifecycle.vm); implementation(libs.lifecycle.runtime); implementation(libs.coroutines)
 debugImplementation(libs.compose.tooling)
 androidTestImplementation("androidx.test:runner:1.6.2")
 androidTestImplementation("androidx.test.ext:junit:1.2.1")
 androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
 testImplementation(libs.junit)
}
