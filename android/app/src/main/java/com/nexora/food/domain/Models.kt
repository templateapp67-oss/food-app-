package com.nexora.food.domain
import java.util.Locale
import java.text.NumberFormat
data class Restaurant(val id:String,val name:String,val description:String,val city:String,val prepMinutes:Int,val rating:String,val closed:Boolean=false)
data class Dish(val id:String,val restaurantId:String,val name:String,val description:String,val pricePaise:Long,val veg:Boolean,val available:Boolean)
data class CartLine(val itemId:String,val quantity:Int,val variantId:String?=null,val addonIds:List<String> = emptyList())
data class Address(val id:String,val line1:String,val locality:String,val city:String,val pincode:String)
data class FoodOrder(val id:String,val number:String,val restaurant:String,val status:String,val totalPaise:Long,val paymentStatus:String)
data class Profile(val id:String,val name:String,val phone:String,val email:String)
data class Quote(val id:String,val subtotal:Long,val delivery:Long,val tax:Long,val couponDiscount:Long,val loyaltyDiscount:Long,val total:Long)
fun money(paise:Long):String=NumberFormat.getCurrencyInstance(Locale("en","IN")).format(java.math.BigDecimal.valueOf(paise,2))
fun validPhone(phone:String)=Regex("^[6-9][0-9]{9}$").matches(phone)
fun validateCart(lines:List<CartLine>)=lines.isNotEmpty() && lines.all { it.quantity in 1..20 }
