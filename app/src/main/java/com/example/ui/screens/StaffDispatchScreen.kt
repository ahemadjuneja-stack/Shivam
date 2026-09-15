package com.example.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.Face
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.data.model.CatalogPhoto
import com.example.data.model.OrderCartItem
import com.example.data.model.WholesaleOrder
import com.example.data.repository.WholesaleRepository
import com.example.ui.AppScreen
import com.example.ui.WholesaleViewModel
import com.example.ui.components.WholesalePhotoDisplay

/**
 * Staff Packing & Dispatch Portal as requested:
 * "staaf ko bhi wo product ke photo dikhe hair accessories wale ko hair accessories ka photo dikhe
 * imitation wale ko imitation ka photo dikhe aur cosmetics walo ko cosmetics ke photo dikhe
 * aur jab wo oreder complete karte jaye to sab ke pas order done karne ka option hona chahiye
 * jo sidha deshbord par pata chale ke cosmetic walo ne maal nikal lya aur imitation walo ne bhi nikal lya
 * ab hair accessories walo ka pending hai"
 */
@Composable
fun StaffDispatchScreen(
    viewModel: WholesaleViewModel,
    modifier: Modifier = Modifier
) {
    val orders by viewModel.allOrders.collectAsStateWithLifecycle()
    val allPhotos by viewModel.allPhotos.collectAsStateWithLifecycle()

    var selectedDeptTab by remember { mutableIntStateOf(0) }
    // 0: All Orders, 1: Imitation Staff, 2: Cosmetics Staff, 3: Hair Accessories Staff

    val currentDeptKey = when (selectedDeptTab) {
        1 -> "imitation"
        2 -> "cosmetics"
        3 -> "hair_accessories"
        else -> null
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF090D16))
    ) {
        // Top Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF0D121F))
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { viewModel.navigateTo(AppScreen.HOME) },
                    modifier = Modifier
                        .testTag("staff_back_button")
                        .background(Color(0xFF1E293B), CircleShape)
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
                        text = "STAFF DISPATCH & PACKING",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = "Department Packing & Dispatch Dashboard",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                }
            }
        }

        // Department Selection Tabs
        TabRow(
            selectedTabIndex = selectedDeptTab,
            containerColor = Color(0xFF131B2A),
            contentColor = Color(0xFFF59E0B)
        ) {
            Tab(
                selected = selectedDeptTab == 0,
                onClick = { selectedDeptTab = 0 },
                text = { Text("All Orders Status", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
            Tab(
                selected = selectedDeptTab == 1,
                onClick = { selectedDeptTab = 1 },
                icon = { Icon(Icons.Default.Diamond, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(16.dp)) },
                text = { Text("Imitation Staff", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
            Tab(
                selected = selectedDeptTab == 2,
                onClick = { selectedDeptTab = 2 },
                icon = { Icon(Icons.Default.Spa, contentDescription = null, tint = Color(0xFFEC4899), modifier = Modifier.size(16.dp)) },
                text = { Text("Cosmetics Staff", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
            Tab(
                selected = selectedDeptTab == 3,
                onClick = { selectedDeptTab = 3 },
                icon = { Icon(Icons.Default.Face, contentDescription = null, tint = Color(0xFF38BDF8), modifier = Modifier.size(16.dp)) },
                text = { Text("Hair Accessories", fontWeight = FontWeight.Bold, fontSize = 12.sp) }
            )
        }

        // Orders List
        if (orders.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text(
                    text = "No pending wholesale orders found.",
                    color = Color(0xFF64748B),
                    fontSize = 14.sp
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(orders) { order ->
                    val items = WholesaleRepository.parseOrderItems(order.itemsJson)

                    // If a specific department tab is chosen, filter items for that department
                    val relevantItems = if (currentDeptKey != null) {
                        items.filter { it.categoryId == currentDeptKey }
                    } else {
                        items
                    }

                    // If department view has no items for this order, don't show or show "No items for this department"
                    if (currentDeptKey == null || relevantItems.isNotEmpty()) {
                        StaffOrderCard(
                            order = order,
                            items = relevantItems,
                            allPhotos = allPhotos,
                            departmentKey = currentDeptKey,
                            onToggleDone = { dept, isDone ->
                                viewModel.updateDepartmentPackingStatus(order, dept, isDone)
                            }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StaffOrderCard(
    order: WholesaleOrder,
    items: List<OrderCartItem>,
    allPhotos: List<CatalogPhoto>,
    departmentKey: String?,
    onToggleDone: (department: String, isDone: Boolean) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header: Order ID, Shop Name, City, Mobile
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = order.orderNumber,
                            color = Color(0xFFF59E0B),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .background(Color(0xFF1E293B), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "Customer: [${order.customerCode}]",
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )
                        }
                    }

                    Text(
                        text = "${order.shopName} • ${order.cityName} (Mob: ${order.mobileNumber})",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Department Status Badges Live Tracker
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    StatusChip(
                        name = "Imitation",
                        status = order.imitationStatus,
                        color = Color(0xFFF59E0B)
                    )
                    StatusChip(
                        name = "Cosmetics",
                        status = order.cosmeticsStatus,
                        color = Color(0xFFEC4899)
                    )
                    StatusChip(
                        name = "Hair",
                        status = order.hairStatus,
                        color = Color(0xFF38BDF8)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Products to Pick (Shows photos with ABCD letter!)
            Text(
                text = if (departmentKey != null) "ITEMS TO PACK FOR THIS DEPARTMENT:" else "ALL ORDERED PRODUCTS:",
                color = Color(0xFF94A3B8),
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )

            Spacer(modifier = Modifier.height(6.dp))

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(items) { item ->
                    val photo = allPhotos.firstOrNull { it.id == item.photoId }
                        ?: CatalogPhoto(
                            id = item.photoId,
                            categoryId = item.categoryId,
                            subCategoryId = 1,
                            subCategoryName = item.subCategoryName,
                            photoCode = item.photoCode,
                            imageUri = item.imageUri
                        )

                    Box(
                        modifier = Modifier
                            .width(180.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFF131B2A))
                            .border(1.dp, Color(0xFF334155), RoundedCornerShape(8.dp))
                            .padding(6.dp)
                    ) {
                        Column {
                            WholesalePhotoDisplay(
                                photo = photo,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(100.dp)
                            )

                            Spacer(modifier = Modifier.height(6.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // Option Letter Badge (A, B, C, D)
                                Box(
                                    modifier = Modifier
                                        .size(32.dp)
                                        .background(Color(0xFFF59E0B), RoundedCornerShape(6.dp)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        text = item.optionLetter,
                                        color = Color.Black,
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Black
                                    )
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "${item.quantity} pcs",
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "#${item.photoCode}",
                                        color = Color(0xFF94A3B8),
                                        fontSize = 10.sp
                                    )
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Department Packing Action Buttons
            if (departmentKey != null) {
                val currentStatus = when (departmentKey) {
                    "imitation" -> order.imitationStatus
                    "cosmetics" -> order.cosmeticsStatus
                    else -> order.hairStatus
                }
                val isDone = currentStatus == "DONE"

                Button(
                    onClick = { onToggleDone(departmentKey, !isDone) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(44.dp)
                        .testTag("btn_done_${departmentKey}_${order.id}"),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isDone) Color(0xFF059669) else Color(0xFFF59E0B)
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        imageVector = if (isDone) Icons.Default.CheckCircle else Icons.Default.HourglassEmpty,
                        contentDescription = null,
                        tint = if (isDone) Color.White else Color.Black
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = if (isDone) {
                            "PACKED (DONE ✓) - TAP TO REVERT"
                        } else {
                            "MARK AS PACKED (DONE ✓)"
                        },
                        color = if (isDone) Color.White else Color.Black,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            } else {
                // Overview of all 3 departments buttons for Admin/Supervisor
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (order.imitationStatus != "NOT_APPLICABLE") {
                        val isImitationDone = order.imitationStatus == "DONE"
                        Button(
                            onClick = { onToggleDone("imitation", !isImitationDone) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isImitationDone) Color(0xFF059669) else Color(0xFF261D15)
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFF59E0B))
                        ) {
                            Text(
                                text = if (isImitationDone) "Imitation ✓" else "Imitation Done?",
                                fontSize = 11.sp,
                                color = if (isImitationDone) Color.White else Color(0xFFF59E0B),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    if (order.cosmeticsStatus != "NOT_APPLICABLE") {
                        val isCosmeticsDone = order.cosmeticsStatus == "DONE"
                        Button(
                            onClick = { onToggleDone("cosmetics", !isCosmeticsDone) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isCosmeticsDone) Color(0xFF059669) else Color(0xFF2A1420)
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEC4899))
                        ) {
                            Text(
                                text = if (isCosmeticsDone) "Cosmetics ✓" else "Cosmetics Done?",
                                fontSize = 11.sp,
                                color = if (isCosmeticsDone) Color.White else Color(0xFFEC4899),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    if (order.hairStatus != "NOT_APPLICABLE") {
                        val isHairDone = order.hairStatus == "DONE"
                        Button(
                            onClick = { onToggleDone("hair_accessories", !isHairDone) },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isHairDone) Color(0xFF059669) else Color(0xFF132230)
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF38BDF8))
                        ) {
                            Text(
                                text = if (isHairDone) "Hair ✓" else "Hair Done?",
                                fontSize = 11.sp,
                                color = if (isHairDone) Color.White else Color(0xFF38BDF8),
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusChip(
    name: String,
    status: String,
    color: Color
) {
    if (status == "NOT_APPLICABLE") return

    val isDone = status == "DONE"
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (isDone) Color(0xFF059669).copy(alpha = 0.25f) else Color(0xFF334155))
            .border(
                1.dp,
                if (isDone) Color(0xFF10B981) else Color(0xFF64748B),
                RoundedCornerShape(6.dp)
            )
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .background(if (isDone) Color(0xFF10B981) else Color(0xFFF59E0B), CircleShape)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
                text = "$name: ${if (isDone) "DONE ✓" else "PENDING ⏳"}",
                color = if (isDone) Color(0xFF6EE7B7) else Color(0xFFCBD5E1),
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
