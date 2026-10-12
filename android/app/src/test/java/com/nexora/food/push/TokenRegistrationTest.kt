package com.nexora.food.push
import org.junit.Test
import org.junit.Assert.*
import kotlinx.coroutines.runBlocking
class TokenRegistrationTest {
 @Test fun registersAndUnregistersSameToken()=runBlocking { val calls=mutableListOf<String>();val logic=TokenRegistration({calls.add("register:$it")},{calls.add("unregister:$it")});val token="a".repeat(80);logic.enable(token);logic.disable(token);assertEquals(listOf("register:$token","unregister:$token"),calls) }
 @Test fun invalidTokenNeverCallsBackend()=runBlocking { var called=false;val logic=TokenRegistration({called=true},{});try{logic.enable("bad token");fail("Must reject")}catch(_:IllegalArgumentException){};assertFalse(called) }
}
