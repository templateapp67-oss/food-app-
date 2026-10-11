package com.nexora.food.domain

object ServiceArea {
 const val city = "Jaipur"
 const val state = "Rajasthan"
 val localities = listOf("C Scheme", "Malviya Nagar", "Vaishali Nagar", "Mansarovar", "Raja Park", "Tonk Road", "Jagatpura", "Pratap Nagar", "Sanganer", "Civil Lines", "Bani Park", "Vidhyadhar Nagar", "Shastri Nagar", "Jhotwara", "Sodala", "Ajmer Road", "Adarsh Nagar", "Jawahar Nagar")
 fun supports(city: String) = city.trim().equals(this.city, ignoreCase = true)
}
