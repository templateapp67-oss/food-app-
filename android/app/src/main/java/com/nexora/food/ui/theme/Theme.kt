package com.nexora.food.ui.theme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
private val colors=darkColorScheme(primary=Color(0xFFFF7138),onPrimary=Color(0xFF101114),secondary=Color(0xFFFFC15A),background=Color(0xFF101114),surface=Color(0xFF191B20),surfaceVariant=Color(0xFF22252B),onSurface=Color.White,onSurfaceVariant=Color(0xFFB7BBC4),outline=Color(0xFF343841),error=Color(0xFFF06464))
@Composable fun NexoraTheme(content: @Composable () -> Unit){MaterialTheme(colorScheme=colors,content=content)}
