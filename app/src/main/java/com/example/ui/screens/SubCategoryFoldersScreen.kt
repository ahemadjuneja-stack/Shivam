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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Folder
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.data.model.SubCategory
import com.example.ui.AppScreen
import com.example.ui.WholesaleViewModel

@Composable
fun SubCategoryFoldersScreen(
    viewModel: WholesaleViewModel,
    modifier: Modifier = Modifier
) {
    val selectedCategory by viewModel.selectedCategory.collectAsStateWithLifecycle()
    val subCategories by viewModel.currentCategorySubCategories.collectAsStateWithLifecycle()
    val allPhotos by viewModel.allPhotos.collectAsStateWithLifecycle()
    val cartItems by viewModel.cartItems.collectAsStateWithLifecycle()

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF070E1E))
    ) {
        // Customer Top Header (Pure read-only browsing)
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0C172E))
                .padding(horizontal = 14.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { viewModel.navigateTo(AppScreen.HOME) },
                    modifier = Modifier
                        .testTag("folders_back_button")
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
                        text = selectedCategory.displayName.uppercase(),
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = "Select a folder to view designs",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                }
            }

            // Customer Cart Button
            val totalInCart = cartItems.sumOf { it.quantity }
            IconButton(
                onClick = { viewModel.navigateTo(AppScreen.CART) },
                modifier = Modifier
                    .testTag("folders_cart_button")
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

        // Subcategory Folders Grid: Large prominent thumbnail on top, small font name underneath!
        LazyVerticalGrid(
            columns = GridCells.Adaptive(minSize = 150.dp),
            contentPadding = PaddingValues(14.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            items(subCategories) { sub ->
                val photosInSub = allPhotos.count { it.subCategoryId == sub.id }
                SubCategoryFolderCard(
                    subCategory = sub,
                    photoCount = photosInSub,
                    onClick = { viewModel.selectSubCategory(sub) }
                )
            }
        }
    }
}

/**
 * Subcategory Folder Card:
 * - Prominent Thumbnail image on top (large view)
 * - Underneath the thumbnail: folder name in small, neat font with designs count.
 * - Read-only for wholesale customers (no delete or edit options).
 */
@Composable
private fun SubCategoryFolderCard(
    subCategory: SubCategory,
    photoCount: Int,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFF223663), RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .testTag("folder_card_${subCategory.id}"),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1B36))
    ) {
        Column(
            modifier = Modifier.fillMaxWidth()
        ) {
            // 1. Large, Prominent Thumbnail Image
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .background(Color(0xFF17284F)),
                contentAlignment = Alignment.Center
            ) {
                if (subCategory.thumbnailUrl.isNotBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(subCategory.thumbnailUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = subCategory.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(
                        imageVector = Icons.Default.Folder,
                        contentDescription = null,
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(46.dp)
                    )
                }
            }

            // 2. Thumbnail ke niche: Chote font me subcategory ka naam
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF0C162D))
                    .padding(horizontal = 8.dp, vertical = 7.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = subCategory.name,
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "$photoCount Wholesale Designs",
                    color = Color(0xFF94A3B8),
                    fontSize = 10.sp,
                    maxLines = 1,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
