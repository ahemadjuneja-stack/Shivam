package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.CatalogPhoto
import com.example.data.model.OrderCartItem
import kotlinx.coroutines.launch

/**
 * Landscape 16:9 Full Gallery View with Native Finger Slide Paging and Vertical ABCD Action Bar.
 * - Smooth finger swipe / sliding between 16:9 images with native touch physics.
 * - Right-side vertical ABCD column showing stock status & customized wholesale quantities.
 * - Tap A, B, C, D to instantly add the configured quantity (1 pcs, 6 pcs, 12 pcs, etc.) to cart.
 * - SHIVAM Dark Blue styling.
 */
@Composable
fun PhotoViewer16x9(
    photos: List<CatalogPhoto>,
    initialIndex: Int,
    cartItems: List<OrderCartItem>,
    onOptionSelected: (photo: CatalogPhoto, optionLetter: String, quantity: Int) -> Unit,
    onOptionDecreased: (photo: CatalogPhoto, optionLetter: String, quantity: Int) -> Unit = { _, _, _ -> },
    onIndexChanged: (Int) -> Unit = {},
    onBack: () -> Unit,
    onOpenCart: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (photos.isEmpty()) return

    val coroutineScope = rememberCoroutineScope()
    val pagerState = rememberPagerState(
        initialPage = initialIndex.coerceIn(0, photos.size - 1),
        pageCount = { photos.size }
    )

    LaunchedEffect(pagerState.currentPage) {
        onIndexChanged(pagerState.currentPage)
    }

    val currentPhoto = photos.getOrNull(pagerState.currentPage) ?: photos.first()
    var lastAddedLetter by remember { mutableStateOf<String?>(null) }
    var lastAddedQty by remember { mutableIntStateOf(1) }

    val currentPhotoCartMap = remember(cartItems, currentPhoto.id) {
        cartItems
            .filter { it.photoId == currentPhoto.id }
            .associate { it.optionLetter to it.quantity }
    }

    val totalInCartThisPhoto = currentPhotoCartMap.values.sum()

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF070E1E)) // Dark Blue Background
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Ultra-Clean Minimal Top Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF0C172E)) // Dark Blue Header
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .testTag("gallery_back_button")
                            .background(Color(0xFF142244), CircleShape)
                            .size(38.dp)
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(
                            text = currentPhoto.subCategoryName,
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "${pagerState.currentPage + 1} / ${photos.size}  •  #${currentPhoto.photoCode}",
                            color = Color(0xFF94A3B8),
                            fontSize = 12.sp
                        )
                    }
                }

                // Cart Icon with live item count
                IconButton(
                    onClick = onOpenCart,
                    modifier = Modifier
                        .testTag("gallery_cart_button")
                        .background(Color(0xFF142244), CircleShape)
                        .size(38.dp)
                ) {
                    BadgedBox(
                        badge = {
                            if (totalInCartThisPhoto > 0) {
                                Badge(containerColor = Color(0xFFF59E0B)) {
                                    Text(
                                        text = "$totalInCartThisPhoto",
                                        color = Color.Black,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingBag,
                            contentDescription = "Cart",
                            tint = Color(0xFFFDE68A)
                        )
                    }
                }
            }

            // Main Workspace: 16:9 Big Photo on Left/Center + Vertical ABCD Buttons Strip on Right
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Large 16:9 Photo Area with smooth native finger sliding HorizontalPager
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    contentAlignment = Alignment.Center
                ) {
                    // Finger slide HorizontalPager: Customer can slide across photos with fingers
                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(16f / 9f)
                            .testTag("viewer_horizontal_pager")
                    ) { pageIndex ->
                        val photoAtIndex = photos[pageIndex]
                        WholesalePhotoDisplay(
                            photo = photoAtIndex,
                            modifier = Modifier
                                .fillMaxSize()
                                .testTag("viewer_photo_image_$pageIndex")
                        )
                    }

                    // Navigation Overlay Left Arrow (if not first photo)
                    if (pagerState.currentPage > 0) {
                        IconButton(
                            onClick = {
                                coroutineScope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage - 1)
                                }
                            },
                            modifier = Modifier
                                .align(Alignment.CenterStart)
                                .padding(start = 8.dp)
                                .background(Color(0xFF0C172E).copy(alpha = 0.75f), CircleShape)
                                .size(44.dp)
                                .testTag("btn_prev_photo")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Previous Photo",
                                tint = Color.White
                            )
                        }
                    }

                    // Navigation Overlay Right Arrow (if not last photo)
                    if (pagerState.currentPage < photos.size - 1) {
                        IconButton(
                            onClick = {
                                coroutineScope.launch {
                                    pagerState.animateScrollToPage(pagerState.currentPage + 1)
                                }
                            },
                            modifier = Modifier
                                .align(Alignment.CenterEnd)
                                .padding(end = 8.dp)
                                .background(Color(0xFF0C172E).copy(alpha = 0.75f), CircleShape)
                                .size(44.dp)
                                .testTag("btn_next_photo")
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = "Next Photo",
                                tint = Color.White
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Vertical ABCD button strip
                VerticalAbcdStrip(
                    photo = currentPhoto,
                    cartQuantities = currentPhotoCartMap,
                    onSelect = { letter ->
                        lastAddedLetter = letter
                        val addQty = currentPhoto.defaultQuantity.coerceAtLeast(1)
                        lastAddedQty = addQty
                        onOptionSelected(currentPhoto, letter, addQty)
                    },
                    onDecrease = { letter ->
                        val subQty = currentPhoto.defaultQuantity.coerceAtLeast(1)
                        onOptionDecreased(currentPhoto, letter, subQty)
                    },
                    modifier = Modifier
                        .width(108.dp)
                        .fillMaxHeight()
                )
            }

            // Bottom minimal status bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF0C172E))
                    .padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Slide photo with fingers to browse catalog",
                    color = Color(0xFF64748B),
                    fontSize = 11.sp
                )

                AnimatedVisibility(
                    visible = lastAddedLetter != null,
                    enter = fadeIn(),
                    exit = fadeOut()
                ) {
                    Text(
                        text = "Added Item $lastAddedLetter (+$lastAddedQty pcs) to Cart ✓",
                        color = Color(0xFF34D399),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

/**
 * Vertical ABCD Column ("khadi sidhi line me honi chahiye aur photo bada dikhna chahiye uske side me abcd ho")
 * Now with interactive + and - controls right on the button!
 */
@Composable
private fun VerticalAbcdStrip(
    photo: CatalogPhoto,
    cartQuantities: Map<String, Int>,
    onSelect: (String) -> Unit,
    onDecrease: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val items = listOf("A", "B", "C", "D").take(photo.itemCount.coerceIn(2, 4))

    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = Color(0xFF111F3D)),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF27417D))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(6.dp),
            verticalArrangement = Arrangement.SpaceEvenly,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            items.forEach { letter ->
                val isAvailable = photo.isOptionAvailable(letter[0])
                val inCart = cartQuantities[letter] ?: 0

                AbcdButton(
                    letter = letter,
                    isAvailable = isAvailable,
                    quantityInCart = inCart,
                    defaultQuantity = photo.defaultQuantity,
                    onIncrease = { if (isAvailable) onSelect(letter) },
                    onDecrease = { if (isAvailable) onDecrease(letter) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .padding(vertical = 3.dp)
                )
            }
        }
    }
}

@Composable
private fun AbcdButton(
    letter: String,
    isAvailable: Boolean,
    quantityInCart: Int,
    defaultQuantity: Int,
    onIncrease: () -> Unit,
    onDecrease: () -> Unit,
    modifier: Modifier = Modifier
) {
    val inCart = quantityInCart > 0
    val activeBorder = if (inCart) Color(0xFFF59E0B) else Color(0xFF27417D)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(
                when {
                    !isAvailable -> Color(0xFF1E293B)
                    inCart -> Color(0xFF1E3364)
                    else -> Color(0xFF17284F)
                }
            )
            .border(
                width = if (inCart) 2.dp else 1.dp,
                color = if (!isAvailable) Color(0xFF334155) else activeBorder,
                shape = RoundedCornerShape(10.dp)
            )
            .then(
                if (isAvailable && !inCart) {
                    Modifier.clickable(onClick = onIncrease)
                } else Modifier
            )
            .padding(horizontal = 4.dp, vertical = 2.dp)
            .testTag("btn_abcd_$letter"),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = letter,
                color = if (isAvailable) Color.White else Color(0xFF64748B),
                fontSize = if (inCart) 20.sp else 22.sp,
                fontWeight = FontWeight.Black
            )

            if (!isAvailable) {
                Text(
                    text = "OUT OF STOCK",
                    color = Color(0xFFEF4444),
                    fontSize = 8.sp,
                    fontWeight = FontWeight.Bold
                )
            } else if (inCart) {
                // Interactive + and - dual controls directly in the button!
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 2.dp),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // MINUS BUTTON
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEF4444).copy(alpha = 0.25f))
                            .border(1.dp, Color(0xFFEF4444).copy(alpha = 0.7f), CircleShape)
                            .clickable(onClick = onDecrease)
                            .testTag("btn_minus_$letter"),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Remove,
                            contentDescription = "Minus $letter",
                            tint = Color(0xFFFCA5A5),
                            modifier = Modifier.size(16.dp)
                        )
                    }

                    // Quantity display
                    Text(
                        text = "$quantityInCart",
                        color = Color(0xFFF59E0B),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Black
                    )

                    // PLUS BUTTON
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF10B981).copy(alpha = 0.25f))
                            .border(1.dp, Color(0xFF10B981).copy(alpha = 0.7f), CircleShape)
                            .clickable(onClick = onIncrease)
                            .testTag("btn_plus_$letter"),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "Plus $letter",
                            tint = Color(0xFF6EE7B7),
                            modifier = Modifier.size(16.dp)
                        )
                    }
                }
            } else {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = null,
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(11.dp)
                    )
                    Spacer(modifier = Modifier.width(2.dp))
                    Text(
                        text = "+$defaultQuantity pcs",
                        color = Color(0xFF94A3B8),
                        fontSize = 9.sp
                    )
                }
            }
        }
    }
}
