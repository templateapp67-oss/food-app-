package com.nexora.food.core
import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
class SessionStore(context:Context){
 private val prefs=context.getSharedPreferences("nexora_secure_session",Context.MODE_PRIVATE)
 private fun key():SecretKey {val store=KeyStore.getInstance("AndroidKeyStore").apply{load(null)};val existing=store.getKey("nexora_session",null)as?SecretKey;if(existing!=null)return existing;return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").apply{init(KeyGenParameterSpec.Builder("nexora_session",KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())}.generateKey()}
 fun save(value:String){val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,key());val data=cipher.doFinal(value.toByteArray());prefs.edit().putString("iv",Base64.encodeToString(cipher.iv,Base64.NO_WRAP)).putString("data",Base64.encodeToString(data,Base64.NO_WRAP)).apply()}
 fun read():String?=runCatching{val iv=prefs.getString("iv",null)?:return null;val data=prefs.getString("data",null)?:return null;val cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,key(),javax.crypto.spec.GCMParameterSpec(128,Base64.decode(iv,Base64.NO_WRAP)));String(cipher.doFinal(Base64.decode(data,Base64.NO_WRAP)))}.getOrNull()
 fun clear(){prefs.edit().clear().apply()}
}
