package com.example.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val WholesaleColorScheme = darkColorScheme(
    primary = WholesaleGold,
    onPrimary = Color.Black,
    primaryContainer = DarkBlueCard,
    onPrimaryContainer = WholesaleGoldLight,
    secondary = WholesaleSkyBlue,
    onSecondary = Color.Black,
    background = DarkBlueBg,
    onBackground = Color.White,
    surface = DarkBlueSurface,
    onSurface = Color.White,
    surfaceVariant = DarkBlueCard,
    onSurfaceVariant = Color(0xFFCBD5E1),
    outline = DarkBlueBorder
)

@Composable
fun MyApplicationTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = WholesaleColorScheme,
        typography = Typography,
        content = content
    )
}

