package com.example.ui.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

data class VideoReel(
    val id: String,
    val title: String,
    val categoryTag: String,
    val tagColor: Color,
    val wholesaleHighlight: String,
    val durationText: String
)

val sampleReels = listOf(
    VideoReel(
        id = "reel_1",
        title = "Bridal Jewelry Collection",
        categoryTag = "IMITATION JEWELRY",
        tagColor = Color(0xFFF59E0B),
        wholesaleHighlight = "In Stock: Ready to Dispatch",
        durationText = "0:45"
    ),
    VideoReel(
        id = "reel_2",
        title = "Matte Liquid Lipstick",
        categoryTag = "COSMETICS",
        tagColor = Color(0xFFEC4899),
        wholesaleHighlight = "Assorted Display Trays",
        durationText = "0:38"
    ),
    VideoReel(
        id = "reel_3",
        title = "Korean Hair Accessories",
        categoryTag = "HAIR ACCESSORIES",
        tagColor = Color(0xFF38BDF8),
        wholesaleHighlight = "Premium Acrylic Collection",
        durationText = "0:40"
    )
)

/**
 * Videos Slide showcase on the Home Page as requested:
 * "bahar home page par 3 catagory dikhe jisme ek taraf videos slide ho rahe ho ek taraf 3 catagory ho"
 */
@Composable
fun VideoShowcaseSlider(
    modifier: Modifier = Modifier,
    onCategoryClick: (String) -> Unit = {}
) {
    var currentIndex by remember { mutableIntStateOf(0) }
    var isPlaying by remember { mutableStateOf(true) }
    var progress by remember { mutableFloatStateOf(0f) }

    // Auto-advance video slides every 5 seconds if playing
    LaunchedEffect(currentIndex, isPlaying) {
        if (isPlaying) {
            progress = 0f
            val totalSteps = 50
            for (step in 1..totalSteps) {
                delay(100)
                progress = step / totalSteps.toFloat()
            }
            currentIndex = (currentIndex + 1) % sampleReels.size
        }
    }

    val currentReel = sampleReels[currentIndex]

    Card(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(16.dp))
            .testTag("home_video_showcase_card"),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            // Video Background animation/canvas
            AnimatedContent(
                targetState = currentReel,
                transitionSpec = { fadeIn() togetherWith fadeOut() },
                label = "video_canvas_transition"
            ) { reel ->
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val width = size.width
                    val height = size.height

                    // Dynamic rich gradient mimicking video lighting
                    drawRect(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                Color(0xFF1E293B),
                                reel.tagColor.copy(alpha = 0.25f),
                                Color(0xFF0A0E1A)
                            )
                        )
                    )

                    // Video scan lines & ambient lens flare
                    drawCircle(
                        brush = Brush.radialGradient(
                            colors = listOf(
                                reel.tagColor.copy(alpha = 0.35f),
                                Color.Transparent
                            ),
                            center = Offset(width * 0.7f, height * 0.3f),
                            radius = width * 0.5f
                        ),
                        radius = width * 0.5f,
                        center = Offset(width * 0.7f, height * 0.3f)
                    )

                    // Decorative studio video frame borders
                    drawLine(
                        color = Color.White.copy(alpha = 0.15f),
                        start = Offset(24f, 24f),
                        end = Offset(width - 24f, 24f),
                        strokeWidth = 2f
                    )
                    drawLine(
                        color = Color.White.copy(alpha = 0.15f),
                        start = Offset(24f, height - 24f),
                        end = Offset(width - 24f, height - 24f),
                        strokeWidth = 2f
                    )
                }
            }

            // Foreground Video Info and Controls
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                // Top Tag & Live Wholesale Video Badge
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(
                        modifier = Modifier
                            .background(Color.Red.copy(alpha = 0.85f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .background(Color.White, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "SHOWCASE",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                    }

                    // Category Tag
                    Box(
                        modifier = Modifier
                            .background(currentReel.tagColor.copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                            .border(1.dp, currentReel.tagColor.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 10.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = currentReel.categoryTag,
                            color = currentReel.tagColor,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                // Middle Center: Large Video Play/Pause Indicator
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    IconButton(
                        onClick = { isPlaying = !isPlaying },
                        modifier = Modifier
                            .size(56.dp)
                            .background(Color.Black.copy(alpha = 0.65f), CircleShape)
                            .border(1.5.dp, Color(0xFFF59E0B), CircleShape)
                            .testTag("btn_play_pause_reel")
                    ) {
                        Icon(
                            imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                            contentDescription = if (isPlaying) "Pause" else "Play",
                            tint = Color(0xFFFDE68A),
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }

                // Bottom: Video Title, Wholesale Stock info & Slide Dots
                Column {
                    Text(
                        text = currentReel.title,
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 20.sp
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = currentReel.wholesaleHighlight,
                        color = Color(0xFF94A3B8),
                        fontSize = 12.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Progress bar for current slide video duration
                    LinearProgressIndicator(
                        progress = { progress },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(3.dp)
                            .clip(RoundedCornerShape(2.dp)),
                        color = currentReel.tagColor,
                        trackColor = Color(0xFF334155)
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    // Slide Selectors / Dots
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            sampleReels.forEachIndexed { index, _ ->
                                Box(
                                    modifier = Modifier
                                        .width(if (index == currentIndex) 20.dp else 6.dp)
                                        .height(6.dp)
                                        .background(
                                            if (index == currentIndex) currentReel.tagColor else Color(0xFF475569),
                                            RoundedCornerShape(3.dp)
                                        )
                                        .clickable {
                                            currentIndex = index
                                            progress = 0f
                                        }
                                )
                            }
                        }

                        Text(
                            text = "Slide ${currentIndex + 1}/${sampleReels.size}",
                            color = Color(0xFF64748B),
                            fontSize = 11.sp
                        )
                    }
                }
            }
        }
    }
}
