package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
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
import com.example.data.model.Customer
import com.example.data.model.MainCategory
import com.example.ui.AppScreen
import com.example.ui.UserRole
import com.example.ui.WholesaleViewModel
import com.example.ui.components.CustomerLoginDialog
import com.example.ui.components.VideoShowcaseSlider

@Composable
fun HomeScreen(
    viewModel: WholesaleViewModel,
    modifier: Modifier = Modifier
) {
    val currentCustomer by viewModel.currentCustomer.collectAsStateWithLifecycle()
    val cartItems by viewModel.cartItems.collectAsStateWithLifecycle()
    val userRole by viewModel.userRole.collectAsStateWithLifecycle()
    val allSubCategories by viewModel.allSubCategories.collectAsStateWithLifecycle()
    val allPhotos by viewModel.allPhotos.collectAsStateWithLifecycle()
    val allCategories by viewModel.allCategories.collectAsStateWithLifecycle()

    var showLoginDialog by remember { mutableStateOf(false) }

    if (showLoginDialog) {
        CustomerLoginDialog(
            currentCustomer = currentCustomer,
            onDismiss = { showLoginDialog = false },
            onLogin = { code ->
                viewModel.loginCustomer(code) { success ->
                    if (success) showLoginDialog = false
                }
            },
            onRegisterNew = { newCust ->
                viewModel.registerNewCustomer(newCust)
                viewModel.loginCustomer(newCust.customerCode) {
                    showLoginDialog = false
                }
            }
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF070E1E))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Modern Top Header
            HomeTopBar(
                customer = currentCustomer,
                cartCount = cartItems.sumOf { it.quantity },
                onCustomerClick = { showLoginDialog = true },
                onCartClick = { viewModel.navigateTo(AppScreen.CART) }
            )

            // Split Landscape Layout: Left Side Videos Slider + Right Side 3 Categories
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Left Half: Video Showcase Slides as requested
                VideoShowcaseSlider(
                    modifier = Modifier
                        .weight(1.1f)
                        .fillMaxHeight(),
                    onCategoryClick = { catId ->
                        viewModel.selectCategory(MainCategory.fromId(catId))
                    }
                )

                // Right Half: The 3 Main Wholesale Categories in Landscape (Side-by-Side Vertical Cards)
                Row(
                    modifier = Modifier
                        .weight(1.3f)
                        .fillMaxHeight(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    val imitationCat = allCategories.find { it.id == MainCategory.IMITATION.id }
                    val cosmeticsCat = allCategories.find { it.id == MainCategory.COSMETICS.id }
                    val hairCat = allCategories.find { it.id == MainCategory.HAIR_ACCESSORIES.id }

                    CategoryBannerCard(
                        category = MainCategory.IMITATION,
                        title = imitationCat?.displayName ?: "Imitation Jewelry",
                        folderCount = allSubCategories.count { it.categoryId == MainCategory.IMITATION.id },
                        photoCount = allPhotos.count { it.categoryId == MainCategory.IMITATION.id },
                        thumbnailUrl = imitationCat?.thumbnailUrl.orEmpty(),
                        accentColor = Color(0xFFF59E0B),
                        icon = Icons.Default.Diamond,
                        onClick = { viewModel.selectCategory(MainCategory.IMITATION) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .testTag("category_imitation_card")
                    )

                    CategoryBannerCard(
                        category = MainCategory.COSMETICS,
                        title = cosmeticsCat?.displayName ?: "Cosmetics & Beauty",
                        folderCount = allSubCategories.count { it.categoryId == MainCategory.COSMETICS.id },
                        photoCount = allPhotos.count { it.categoryId == MainCategory.COSMETICS.id },
                        thumbnailUrl = cosmeticsCat?.thumbnailUrl.orEmpty(),
                        accentColor = Color(0xFFEC4899),
                        icon = Icons.Default.Spa,
                        onClick = { viewModel.selectCategory(MainCategory.COSMETICS) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .testTag("category_cosmetics_card")
                    )

                    CategoryBannerCard(
                        category = MainCategory.HAIR_ACCESSORIES,
                        title = hairCat?.displayName ?: "Hair Accessories",
                        folderCount = allSubCategories.count { it.categoryId == MainCategory.HAIR_ACCESSORIES.id },
                        photoCount = allPhotos.count { it.categoryId == MainCategory.HAIR_ACCESSORIES.id },
                        thumbnailUrl = hairCat?.thumbnailUrl.orEmpty(),
                        accentColor = Color(0xFF38BDF8),
                        icon = Icons.Default.Face,
                        onClick = { viewModel.selectCategory(MainCategory.HAIR_ACCESSORIES) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxHeight()
                            .testTag("category_hair_card")
                    )
                }
            }
        }
    }
}

@Composable
private fun HomeTopBar(
    customer: Customer,
    cartCount: Int,
    onCustomerClick: () -> Unit,
    onCartClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF0C172E))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        // App Title: SHIVAM
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Color(0xFFF59E0B), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "S",
                    color = Color.Black,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Black
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column {
                Text(
                    text = "SHIVAM",
                    color = Color.White,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.5.sp
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "Cosmetics • Hair Accessories • Imitation Jewelry",
                        color = Color(0xFF94A3B8),
                        fontSize = 10.5.sp
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF065F46), RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 1.dp)
                    ) {
                        Text(
                            text = "Cloud Live ✓",
                            color = Color(0xFF34D399),
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        // Action Buttons: Customer User ID Badge and Cart
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // Customer User ID Card Button (Tapping allows entering user ID generated from dashboard)
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF142244))
                    .border(1.dp, Color(0xFF27417D), RoundedCornerShape(8.dp))
                    .clickable(onClick = onCustomerClick)
                    .padding(horizontal = 12.dp, vertical = 6.dp)
                    .testTag("btn_customer_profile")
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.Person,
                        contentDescription = "User ID",
                        tint = Color(0xFFF59E0B),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column {
                        Text(
                            text = "USER ID: [${customer.customerCode}]",
                            color = Color(0xFFFDE68A),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = customer.shopName,
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1
                        )
                    }
                }
            }

            // Cart Button with Badge
            IconButton(
                onClick = onCartClick,
                modifier = Modifier
                    .testTag("home_cart_button")
                    .background(Color(0xFF142244), CircleShape)
                    .size(42.dp)
            ) {
                BadgedBox(
                    badge = {
                        if (cartCount > 0) {
                            Badge(containerColor = Color(0xFFF59E0B)) {
                                Text(
                                    text = "$cartCount",
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
    }
}

@Composable
private fun CategoryBannerCard(
    category: MainCategory,
    title: String,
    folderCount: Int,
    photoCount: Int,
    thumbnailUrl: String = "",
    accentColor: Color,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, accentColor.copy(alpha = 0.45f), RoundedCornerShape(12.dp))
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F1B36))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // 1. Prominent Large Thumbnail Box on Top
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .background(Color(0xFF14244A)),
                contentAlignment = Alignment.Center
            ) {
                if (thumbnailUrl.isNotBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(thumbnailUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Icon(
                        imageVector = icon,
                        contentDescription = title,
                        tint = accentColor,
                        modifier = Modifier.size(48.dp)
                    )
                }

                // Small badge on top right for folder count
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .background(Color.Black.copy(alpha = 0.75f), RoundedCornerShape(6.dp))
                        .border(0.6.dp, accentColor.copy(alpha = 0.8f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                    Text(
                        text = "$folderCount Folders",
                        color = accentColor,
                        fontSize = 9.5.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // 2. Thumbnail ke niche: Chote font me Category ka naam!
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF0C162D))
                    .padding(horizontal = 8.dp, vertical = 7.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = title,
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
