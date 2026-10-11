plugins { alias(libs.plugins.android.application); alias(libs.plugins.kotlin.android); alias(libs.plugins.kotlin.compose) }
fun config(name: String) = providers.gradleProperty(name).orElse(providers.environmentVariable(name)).orElse("").get()
fun quoted(value: String) = "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\""
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
 buildFeatures { compose = true; buildConfig = true }
 compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
 kotlinOptions { jvmTarget = "17" }
}
dependencies {
 implementation(libs.compose.ui); implementation(libs.compose.foundation); implementation(libs.compose.preview)
 implementation(libs.material3); implementation(libs.activity); implementation(libs.lifecycle.vm); implementation(libs.lifecycle.runtime); implementation(libs.coroutines)
 debugImplementation(libs.compose.tooling)
 androidTestImplementation("androidx.test:runner:1.6.2")
 androidTestImplementation("androidx.test.ext:junit:1.2.1")
 androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
 testImplementation(libs.junit)
}
