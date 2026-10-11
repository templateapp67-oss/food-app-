package com.nexora.food
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.lifecycle.viewmodel.compose.viewModel
import com.nexora.food.ui.FoodApp
import com.nexora.food.ui.theme.NexoraTheme
class MainActivity:ComponentActivity(){override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);enableEdgeToEdge();setContent{NexoraTheme{FoodApp(viewModel(),intent?.data?.takeIf{it.scheme=="nexorafood"&&it.host=="order"}?.lastPathSegment)}}}}
