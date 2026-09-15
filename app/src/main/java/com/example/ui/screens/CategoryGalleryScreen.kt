package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.ui.AppScreen
import com.example.ui.WholesaleViewModel
import com.example.ui.components.WholesalePhotoDisplay

/**
 * Gallery View: Ultra-clean photo grid without useless text, just like a mobile gallery:
 * "jaise hi costomer Earings ke andar jaye use sirf Earings ke photos nazar aaye aur us photo ko click karne ke bad side me button ho ABCD ke"
 * "application neet and clean hona chahiye faltu ke koi text ya description nahi hona chahiye... itna clean ke jaise hum ek mobile ki galary me photos dekh rahe ho"
 */
@Composable
fun CategoryGalleryScreen(
    viewModel: WholesaleViewModel,
    modifier: Modifier = Modifier
) {
    val selectedSubCategory by viewModel.selectedSubCategory.collectAsStateWithLifecycle()
    val photos by viewModel.currentSubCategoryPhotos.collectAsStateWithLifecycle()
    val cartItems by viewModel.cartItems.collectAsStateWithLifecycle()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF070E1E))
    ) {
        // Ultra-Clean Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0C172E))
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { viewModel.navigateTo(AppScreen.SUB_CATEGORIES) },
                    modifier = Modifier
                        .testTag("gallery_grid_back_btn")
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
                        text = selectedSubCategory?.name ?: "Gallery",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "${photos.size} Photos  •  Tap photo for 16:9 ABCD view",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                }
            }

            val totalInCart = cartItems.sumOf { it.quantity }
            IconButton(
                onClick = { viewModel.navigateTo(AppScreen.CART) },
                modifier = Modifier
                    .testTag("gallery_grid_cart_btn")
                    .background(Color(0xFF142244), CircleShape)
                    .size(38.dp)
            ) {
                BadgedBox(
                    badge = {
                        if (totalInCart > 0) {
                            Badge(containerColor = Color(0xFFF59E0B)) {
                                Text(
                                    text = "$totalInCart",
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

        // Clean Gallery Grid of 16:9 Photos
        if (photos.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No photos in this folder yet.",
                    color = Color(0xFF64748B),
                    fontSize = 14.sp
                )
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 280.dp),
                contentPadding = PaddingValues(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                itemsIndexed(photos) { index, photo ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .border(1.dp, Color(0xFF27417D), RoundedCornerShape(8.dp))
                            .clickable { viewModel.openPhotoInViewer(index) }
                            .testTag("photo_item_${photo.id}"),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF111F3D))
                    ) {
                        WholesalePhotoDisplay(
                            photo = photo,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                }
            }
        }
    }
}
