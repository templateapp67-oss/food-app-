package com.nexora.food
import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.Until
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.assertTrue
import org.junit.Assert.assertNotNull
import org.junit.runner.RunWith
import java.io.File
@RunWith(AndroidJUnit4::class)
class CustomerSmokeTest {
 private lateinit var device:UiDevice
 @Before fun launch(){val instrumentation=InstrumentationRegistry.getInstrumentation();device=UiDevice.getInstance(instrumentation);val context=instrumentation.targetContext;context.startActivity(Intent(context,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK));assertTrue("App did not launch",device.wait(Until.hasObject(By.text("Home")),15000))}
 @After fun evidence(){val context=InstrumentationRegistry.getInstrumentation().targetContext;device.takeScreenshot(File(context.getExternalFilesDir(null),"customer-smoke.png"));device.setOrientationNatural()}
 private fun tap(label:String) {
  device.waitForIdle()
  val target=device.wait(Until.findObject(By.text(label)),10000)
  assertNotNull("Button not available: $label",target)
  target.click()
 }
 @Test fun customerTabsAndEmailLoginAreReachable(){tap("Profile");assertTrue(device.wait(Until.hasObject(By.text("Sign in")),5000));tap("Sign in");assertTrue(device.wait(Until.hasObject(By.text("Sign in to Nexora Food")),5000));assertTrue(device.hasObject(By.text("Email")));assertTrue(device.hasObject(By.text("Password")));tap("Create account");assertTrue(device.wait(Until.hasObject(By.text("Create your Food account")),5000));assertTrue(device.hasObject(By.text("Full name")))}
 @Test fun rotationKeepsNavigationReachable(){device.setOrientationLeft();device.waitForIdle();assertTrue(device.wait(Until.hasObject(By.text("Orders")),5000));tap("Orders");assertTrue(device.wait(Until.hasObject(By.text("Your orders")),5000));device.setOrientationNatural();device.waitForIdle();tap("Rewards");assertTrue(device.wait(Until.hasObject(By.text("Nexora Rewards")),5000))}
}
