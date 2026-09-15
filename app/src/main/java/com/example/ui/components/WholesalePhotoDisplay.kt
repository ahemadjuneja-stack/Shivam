package com.example.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.data.model.CatalogPhoto

/**
 * High-performance 16:9 Wholesale Photo component.
 * Supports:
 * 1. User uploaded device images or remote URLs via Coil
 * 2. High-aesthetic studio sample wholesale sheets with 2, 3, or 4 products clearly partitioned and labeled A, B, C, D!
 */
@Composable
fun WholesalePhotoDisplay(
    photo: CatalogPhoto,
    modifier: Modifier = Modifier,
    showCodeBadge: Boolean = true
) {
    val isSample = photo.imageUri.startsWith("sample:")

    Box(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f)
            .clip(RoundedCornerShape(8.dp))
            .background(Color(0xFF0F172A))
    ) {
        if (!isSample && photo.imageUri.isNotBlank()) {
            AsyncImage(
                model = ImageRequest.Builder(LocalContext.current)
                    .data(photo.imageUri)
                    .crossfade(true)
                    .build(),
                contentDescription = photo.photoCode,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // Render High-Resolution 16:9 Studio Wholesale Sheet with A, B, C, D
            StudioWholesaleSheetCanvas(
                photo = photo,
                modifier = Modifier.fillMaxSize()
            )
        }

        // Clean Wholesale Photo Code Badge in Top-Left
        if (showCodeBadge) {
            Box(
                modifier = Modifier
                    .padding(8.dp)
                    .background(Color.Black.copy(alpha = 0.75f), RoundedCornerShape(4.dp))
                    .border(0.5.dp, Color(0xFFF59E0B), RoundedCornerShape(4.dp))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "#${photo.photoCode}",
                    color = Color(0xFFFDE68A),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

@Composable
private fun StudioWholesaleSheetCanvas(
    photo: CatalogPhoto,
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height

        val (bgStart, bgEnd, itemThemeColor) = when (photo.categoryId) {
            "imitation" -> Triple(Color(0xFF1E1B2E), Color(0xFF0F172A), Color(0xFFF59E0B))
            "cosmetics" -> Triple(Color(0xFF2C1820), Color(0xFF160D12), Color(0xFFEC4899))
            else -> Triple(Color(0xFF16252E), Color(0xFF0D181F), Color(0xFF38BDF8))
        }

        // Draw Studio Backdrop Gradient
        drawRect(
            brush = Brush.radialGradient(
                colors = listOf(bgStart, bgEnd),
                center = Offset(width * 0.5f, height * 0.5f),
                radius = width * 0.7f
            ),
            size = size
        )

        // Subtle studio grid texture
        val cols = photo.itemCount.coerceIn(2, 4)
        val colWidth = width / cols

        // Divider lines between ABCD slots
        for (i in 1 until cols) {
            val lineX = i * colWidth
            drawLine(
                color = Color.White.copy(alpha = 0.15f),
                start = Offset(lineX, height * 0.05f),
                end = Offset(lineX, height * 0.95f),
                strokeWidth = 2f
            )
        }

        val letters = listOf("A", "B", "C", "D")

        for (i in 0 until cols) {
            val letter = letters[i]
            val slotLeft = i * colWidth
            val centerX = slotLeft + colWidth / 2f
            val centerY = height / 2f

            val isAvailable = photo.isOptionAvailable(letter[0])

            // Soft showcase pedestal ring
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        itemThemeColor.copy(alpha = if (isAvailable) 0.18f else 0.05f),
                        Color.Transparent
                    ),
                    center = Offset(centerX, centerY),
                    radius = colWidth * 0.45f
                ),
                radius = colWidth * 0.42f,
                center = Offset(centerX, centerY)
            )

            // Draw product silhouette / illustration based on category
            when (photo.categoryId) {
                "imitation" -> drawJewelrySlot(centerX, centerY, colWidth * 0.32f, i, isAvailable)
                "cosmetics" -> drawCosmeticSlot(centerX, centerY, colWidth * 0.32f, i, isAvailable)
                else -> drawHairAccessorySlot(centerX, centerY, colWidth * 0.32f, i, isAvailable)
            }

            // Big Bold ABCD Badge inside the photo at top of each section
            val badgeRadius = 20.dp.toPx()
            val badgeY = height * 0.16f

            // Shadow / outer ring
            drawCircle(
                color = if (isAvailable) Color(0xFF1E293B) else Color(0xFF334155),
                radius = badgeRadius,
                center = Offset(centerX, badgeY)
            )
            drawCircle(
                color = if (isAvailable) itemThemeColor else Color.Gray,
                radius = badgeRadius,
                center = Offset(centerX, badgeY),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = 3.dp.toPx())
            )

            // Unavailable overlay if stock is band/out
            if (!isAvailable) {
                // Out of stock stamp across the slot
                drawRoundRect(
                    color = Color.Red.copy(alpha = 0.75f),
                    topLeft = Offset(slotLeft + colWidth * 0.1f, height * 0.72f),
                    size = Size(colWidth * 0.8f, 26.dp.toPx()),
                    cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
                )
            }
        }
    }

    // Overlay native Text for the ABCD letter labels with precise typography!
    Box(modifier = modifier) {
        val cols = photo.itemCount.coerceIn(2, 4)
        val letters = listOf("A", "B", "C", "D")

        for (i in 0 until cols) {
            val letter = letters[i]
            val isAvailable = photo.isOptionAvailable(letter[0])
            val fractionX = (i + 0.5f) / cols

            // Letter Label at Top
            Box(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(
                        start = (fractionX * 100).let { "${it}%" }.let { 0.dp } // Handled via layout alignment
                    )
            )

            // Position with canvas fraction
            Box(
                modifier = Modifier
                    .fillMaxSize()
            ) {
                // Letter badge text
                Text(
                    text = letter,
                    color = if (isAvailable) Color.White else Color.LightGray,
                    fontWeight = FontWeight.Black,
                    fontSize = 18.sp,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(
                            start = ((i * (100f / cols)) + (50f / cols) - 2f).coerceAtLeast(0f).dp * 3.5f,
                            top = 16.dp
                        )
                )

                // If not available, show "OUT OF STOCK / BAND" text
                if (!isAvailable) {
                    Text(
                        text = "OUT OF STOCK",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 10.sp,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(
                                start = (i * (100f / cols) + 4f).dp * 3.5f,
                                bottom = 22.dp
                            )
                    )
                }
            }
        }
    }
}

private fun DrawScope.drawJewelrySlot(
    centerX: Float,
    centerY: Float,
    scale: Float,
    variantIndex: Int,
    isAvailable: Boolean
) {
    val gold = if (isAvailable) Color(0xFFFFD700) else Color.Gray
    val ruby = if (isAvailable) Color(0xFFE11D48) else Color.DarkGray
    val emerald = if (isAvailable) Color(0xFF059669) else Color.DarkGray
    val stoneColor = if (variantIndex % 2 == 0) ruby else emerald

    // Chandbali / Jhumka / Pendant Silhouette
    when (variantIndex % 4) {
        0 -> {
            // Elegant Jhumka bell
            drawCircle(color = gold, radius = scale * 0.28f, center = Offset(centerX, centerY - scale * 0.4f))
            drawCircle(color = stoneColor, radius = scale * 0.16f, center = Offset(centerX, centerY - scale * 0.4f))
            // Bell dome
            drawArc(
                color = gold,
                startAngle = 180f,
                sweepAngle = 180f,
                useCenter = true,
                topLeft = Offset(centerX - scale * 0.5f, centerY - scale * 0.2f),
                size = Size(scale * 1f, scale * 0.65f)
            )
            // Little pearl drops
            for (d in -2..2) {
                drawCircle(color = Color(0xFFFFF8DC), radius = scale * 0.07f, center = Offset(centerX + d * (scale * 0.2f), centerY + scale * 0.35f))
            }
        }
        1 -> {
            // Chandbali crescent
            drawCircle(color = stoneColor, radius = scale * 0.22f, center = Offset(centerX, centerY - scale * 0.35f))
            drawArc(
                color = gold,
                startAngle = 0f,
                sweepAngle = 180f,
                useCenter = false,
                topLeft = Offset(centerX - scale * 0.48f, centerY - scale * 0.15f),
                size = Size(scale * 0.96f, scale * 0.8f),
                style = androidx.compose.ui.graphics.drawscope.Stroke(width = scale * 0.22f)
            )
            for (d in -3..3) {
                drawCircle(color = Color(0xFFFFF8DC), radius = scale * 0.06f, center = Offset(centerX + d * (scale * 0.14f), centerY + scale * 0.45f))
            }
        }
        2 -> {
            // Kundan Polki Choker Motif
            drawRoundRect(
                color = gold,
                topLeft = Offset(centerX - scale * 0.45f, centerY - scale * 0.3f),
                size = Size(scale * 0.9f, scale * 0.6f),
                cornerRadius = CornerRadius(12f, 12f)
            )
            drawCircle(color = stoneColor, radius = scale * 0.22f, center = Offset(centerX, centerY))
            drawCircle(color = Color.White, radius = scale * 0.08f, center = Offset(centerX, centerY))
        }
        else -> {
            // Peacock / Temple motif
            drawCircle(color = gold, radius = scale * 0.4f, center = Offset(centerX, centerY - scale * 0.1f))
            drawCircle(color = stoneColor, radius = scale * 0.2f, center = Offset(centerX, centerY - scale * 0.1f))
            for (angle in 0 until 5) {
                val dropX = centerX + (angle - 2) * (scale * 0.18f)
                drawCircle(color = gold, radius = scale * 0.08f, center = Offset(dropX, centerY + scale * 0.35f))
            }
        }
    }
}

private fun DrawScope.drawCosmeticSlot(
    centerX: Float,
    centerY: Float,
    scale: Float,
    variantIndex: Int,
    isAvailable: Boolean
) {
    val shades = listOf(
        Color(0xFFBE123C), // Deep Red
        Color(0xFFE11D48), // Rose Crimson
        Color(0xFFDB2777), // Berry Pink
        Color(0xFF9F1239)  // Wine Plum
    )
    val shade = if (isAvailable) shades[variantIndex % shades.size] else Color.Gray

    // Luxury Black Lipstick Case + Angled Bullet
    val caseWidth = scale * 0.38f
    val caseHeight = scale * 0.65f

    // Gold accent collar
    drawRect(
        color = Color(0xFFFFD700),
        topLeft = Offset(centerX - caseWidth / 2, centerY - caseHeight * 0.2f),
        size = Size(caseWidth, caseHeight * 0.25f)
    )

    // Base body (Matte black)
    drawRoundRect(
        color = Color(0xFF1E1E1E),
        topLeft = Offset(centerX - caseWidth / 2, centerY + caseHeight * 0.05f),
        size = Size(caseWidth, caseHeight * 0.6f),
        cornerRadius = CornerRadius(6f, 6f)
    )

    // Angled lipstick bullet at top
    drawRoundRect(
        color = shade,
        topLeft = Offset(centerX - caseWidth * 0.38f, centerY - caseHeight * 0.65f),
        size = Size(caseWidth * 0.76f, caseHeight * 0.5f),
        cornerRadius = CornerRadius(14f, 14f)
    )
}

private fun DrawScope.drawHairAccessorySlot(
    centerX: Float,
    centerY: Float,
    scale: Float,
    variantIndex: Int,
    isAvailable: Boolean
) {
    val pastelColors = listOf(
        Color(0xFFF472B6), // Soft Pink
        Color(0xFF38BDF8), // Sky Blue
        Color(0xFFA78BFA), // Lavender
        Color(0xFFFBBF24)  // Golden Mustard
    )
    val clipColor = if (isAvailable) pastelColors[variantIndex % pastelColors.size] else Color.Gray

    // Butterfly / Korean Claw Clip
    val clawWidth = scale * 0.7f
    val clawHeight = scale * 0.5f

    // Spring hinge in middle
    drawRect(
        color = Color(0xFFFFD700),
        topLeft = Offset(centerX - scale * 0.1f, centerY - scale * 0.1f),
        size = Size(scale * 0.2f, scale * 0.2f)
    )

    // Left wing / body
    drawRoundRect(
        color = clipColor,
        topLeft = Offset(centerX - clawWidth * 0.5f, centerY - clawHeight * 0.4f),
        size = Size(clawWidth * 0.45f, clawHeight * 0.8f),
        cornerRadius = CornerRadius(16f, 16f)
    )

    // Right wing / body
    drawRoundRect(
        color = clipColor,
        topLeft = Offset(centerX + clawWidth * 0.05f, centerY - clawHeight * 0.4f),
        size = Size(clawWidth * 0.45f, clawHeight * 0.8f),
        cornerRadius = CornerRadius(16f, 16f)
    )

    // Pearl / Rhinestone center stones
    drawCircle(
        color = Color.White,
        radius = scale * 0.07f,
        center = Offset(centerX - clawWidth * 0.25f, centerY)
    )
    drawCircle(
        color = Color.White,
        radius = scale * 0.07f,
        center = Offset(centerX + clawWidth * 0.25f, centerY)
    )
}
