package com.nexora.food
import com.nexora.food.domain.*
import org.junit.Assert.*
import org.junit.Test
class ValidationTest{
 @Test fun phones(){assertTrue(validPhone("9876543210"));assertFalse(validPhone("1234567890"));assertFalse(validPhone("987654321"))}
 @Test fun cartBounds(){assertFalse(validateCart(emptyList()));assertFalse(validateCart(listOf(CartLine("one",0))));assertFalse(validateCart(listOf(CartLine("one",21))));assertTrue(validateCart(listOf(CartLine("one",20))))}
}
