package com.nexora.food.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.nexora.food.R

// Generated concepts are restricted to the demo; live records need their own photos.
private val demoPhotos = mapOf(
 "Dum Chicken Biryani" to R.drawable.photo_dum_chicken_biryani,
 "Paneer Biryani" to R.drawable.photo_paneer_biryani,
 "Butter Chicken" to R.drawable.photo_butter_chicken,
 "Garlic Naan" to R.drawable.photo_garlic_naan,
 "Margherita Pizza" to R.drawable.photo_margherita_pizza,
 "Farmhouse Pizza" to R.drawable.photo_farmhouse_pizza,
 "Pesto Pasta" to R.drawable.photo_pesto_pasta,
 "Garlic Bread" to R.drawable.photo_garlic_bread,
 "Buddha Bowl" to R.drawable.photo_buddha_bowl,
 "Avocado Salad" to R.drawable.photo_avocado_salad,
 "Protein Bowl" to R.drawable.photo_protein_bowl,
 "Berry Smoothie" to R.drawable.photo_berry_smoothie,
 "Classic Chicken Burger" to R.drawable.photo_classic_chicken_burger,
 "Paneer Crunch Burger" to R.drawable.photo_paneer_crunch_burger,
 "Loaded Fries" to R.drawable.photo_loaded_fries,
 "Chocolate Shake" to R.drawable.photo_chocolate_shake,
 "Dal Makhani" to R.drawable.photo_dal_makhani,
 "Paneer Tikka" to R.drawable.photo_paneer_tikka,
 "Chole Bhature" to R.drawable.photo_chole_bhature,
 "Tandoori Roti" to R.drawable.photo_tandoori_roti,
 "Masala Dosa" to R.drawable.photo_masala_dosa,
 "Idli Sambar" to R.drawable.photo_idli_sambar,
 "Medu Vada" to R.drawable.photo_medu_vada,
 "Filter Coffee" to R.drawable.photo_filter_coffee,
 "The Biryani House" to R.drawable.photo_the_biryani_house,
 "Dough & Co." to R.drawable.photo_dough_and_co,
 "Green Table" to R.drawable.photo_green_table,
 "Burger Theory" to R.drawable.photo_burger_theory,
 "Punjab Kitchen" to R.drawable.photo_punjab_kitchen,
 "South Street" to R.drawable.photo_south_street
)
@Composable internal fun DemoPhoto(name: String, enabled: Boolean) {
 if (!enabled) return
 val resource = demoPhotos[name] ?: return
 Image(painter = painterResource(resource), contentDescription = "$name · AI demo image", modifier = Modifier.fillMaxWidth().height(180.dp), contentScale = ContentScale.Crop)
}
