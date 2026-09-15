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
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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

                // Right Half: The 3 Main Wholesale Categories
                Column(
                    modifier = Modifier
                        .weight(1.3f)
                        .fillMaxHeight(),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    CategoryBannerCard(
                        category = MainCategory.IMITATION,
                        title = "Imitation Jewelry",
                        subtitle = "Earrings, Necklaces, Bangles & Rings",
                        folderCount = allSubCategories.count { it.categoryId == MainCategory.IMITATION.id },
                        photoCount = allPhotos.count { it.categoryId == MainCategory.IMITATION.id },
                        accentColor = Color(0xFFF59E0B),
                        gradientColors = listOf(Color(0xFF17284F), Color(0xFF0E1A36)),
                        icon = Icons.Default.Diamond,
                        onClick = { viewModel.selectCategory(MainCategory.IMITATION) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .testTag("category_imitation_card")
                    )

                    CategoryBannerCard(
                        category = MainCategory.COSMETICS,
                        title = "Cosmetics & Beauty",
                        subtitle = "Lipsticks, Nail Polish, Compact & Kajal",
                        folderCount = allSubCategories.count { it.categoryId == MainCategory.COSMETICS.id },
                        photoCount = allPhotos.count { it.categoryId == MainCategory.COSMETICS.id },
                        accentColor = Color(0xFFEC4899),
                        gradientColors = listOf(Color(0xFF241838), Color(0xFF10132B)),
                        icon = Icons.Default.Spa,
                        onClick = { viewModel.selectCategory(MainCategory.COSMETICS) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .testTag("category_cosmetics_card")
                    )

                    CategoryBannerCard(
                        category = MainCategory.HAIR_ACCESSORIES,
                        title = "Hair Accessories",
                        subtitle = "Clips, Claws, Hair Bands & Scrunchies",
                        folderCount = allSubCategories.count { it.categoryId == MainCategory.HAIR_ACCESSORIES.id },
                        photoCount = allPhotos.count { it.categoryId == MainCategory.HAIR_ACCESSORIES.id },
                        accentColor = Color(0xFF38BDF8),
                        gradientColors = listOf(Color(0xFF11264B), Color(0xFF0A1833)),
                        icon = Icons.Default.Face,
                        onClick = { viewModel.selectCategory(MainCategory.HAIR_ACCESSORIES) },
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
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
    subtitle: String,
    folderCount: Int,
    photoCount: Int,
    accentColor: Color,
    gradientColors: List<Color>,
    icon: ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, accentColor.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Brush.horizontalGradient(gradientColors))
                .padding(horizontal = 16.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxSize(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .background(accentColor.copy(alpha = 0.2f), CircleShape)
                            .border(1.dp, accentColor, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = title,
                            tint = accentColor,
                            modifier = Modifier.size(26.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = title.uppercase(),
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = subtitle,
                            color = Color(0xFFCBD5E1),
                            fontSize = 11.sp
                        )
                    }
                }

                // Subcategory folder count chip
                Box(
                    modifier = Modifier
                        .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
                        .border(0.8.dp, accentColor.copy(alpha = 0.6f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Column(horizontalAlignment = Alignment.End) {
                        Text(
                            text = "$folderCount Folders",
                            color = accentColor,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            text = "$photoCount Photos",
                            color = Color(0xFF94A3B8),
                            fontSize = 10.sp
                        )
                    }
                }
            }
        }
    }
}
