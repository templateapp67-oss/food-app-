package com.nexora.food.push
class TokenRegistration(private val register: suspend (String) -> Unit, private val unregister: suspend (String) -> Unit) {
 suspend fun enable(token: String) { require(token.length in 20..4096 && token.none { it.isWhitespace() }) { "Invalid push token" }; register(token) }
 suspend fun disable(token: String?) { if (!token.isNullOrBlank()) unregister(token) }
}
