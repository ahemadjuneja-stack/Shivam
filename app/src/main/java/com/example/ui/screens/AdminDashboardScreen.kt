package com.example.ui.screens

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.CreateNewFolder
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
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
import com.example.data.model.Customer
import com.example.data.model.MainCategory
import com.example.data.model.SubCategory
import com.example.data.repository.WholesaleRepository
import com.example.ui.AppScreen
import com.example.ui.WholesaleViewModel
import com.example.ui.components.WholesalePhotoDisplay

@Composable
fun AdminDashboardScreen(
    viewModel: WholesaleViewModel,
    modifier: Modifier = Modifier
) {
    val orders by viewModel.allOrders.collectAsStateWithLifecycle()
    val photos by viewModel.allPhotos.collectAsStateWithLifecycle()
    val subCategories by viewModel.allSubCategories.collectAsStateWithLifecycle()
    val customers by viewModel.allCustomers.collectAsStateWithLifecycle()

    var activeTab by remember { mutableIntStateOf(0) }
    // 0: Orders, 1: Catalog & ABCD Stock, 2: Folders, 3: Customers

    var showAddPhotoDialog by remember { mutableStateOf(false) }
    var showAddCustomerDialog by remember { mutableStateOf(false) }
    var showAddFolderDialog by remember { mutableStateOf(false) }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF090D16))
    ) {
        // Shop PC Desk Top Bar
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
                        .testTag("admin_back_button")
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
                        text = "SHOP PC DESK • ADMIN CONTROL",
                        color = Color(0xFFF59E0B),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 0.5.sp
                    )
                    Text(
                        text = "Stock ABCD Control • Orders Management • Photos & Customer IDs",
                        color = Color(0xFF94A3B8),
                        fontSize = 11.sp
                    )
                }
            }

            // Quick Stats Bar
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AdminStatChip(label = "Orders", value = "${orders.size}")
                AdminStatChip(label = "Photos", value = "${photos.size}")
                AdminStatChip(label = "Folders", value = "${subCategories.size}")
                AdminStatChip(label = "Clients", value = "${customers.size}")
            }
        }

        // Navigation Tabs
        TabRow(
            selectedTabIndex = activeTab,
            containerColor = Color(0xFF131B2A),
            contentColor = Color(0xFFF59E0B)
        ) {
            Tab(
                selected = activeTab == 0,
                onClick = { activeTab = 0 },
                icon = { Icon(Icons.Default.Inventory, contentDescription = null, modifier = Modifier.size(16.dp)) },
                text = { Text("Orders & Packing", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
            )
            Tab(
                selected = activeTab == 1,
                onClick = { activeTab = 1 },
                icon = { Icon(Icons.Default.PhotoLibrary, contentDescription = null, modifier = Modifier.size(16.dp)) },
                text = { Text("Photos & ABCD Stock", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
            )
            Tab(
                selected = activeTab == 2,
                onClick = { activeTab = 2 },
                icon = { Icon(Icons.Default.Folder, contentDescription = null, modifier = Modifier.size(16.dp)) },
                text = { Text("Subcategory Folders", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
            )
            Tab(
                selected = activeTab == 3,
                onClick = { activeTab = 3 },
                icon = { Icon(Icons.Default.People, contentDescription = null, modifier = Modifier.size(16.dp)) },
                text = { Text("Customer Accounts", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
            )
        }

        // Tab Content
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp)
        ) {
            when (activeTab) {
                0 -> AdminOrdersTab(
                    orders = orders,
                    onDeleteOrder = { viewModel.deleteOrder(it) },
                    onUpdateDept = { order, dept, isDone ->
                        viewModel.updateDepartmentPackingStatus(order, dept, isDone)
                    }
                )
                1 -> AdminPhotosStockTab(
                    photos = photos,
                    subCategories = subCategories,
                    onToggleStock = { photo, opt, status ->
                        viewModel.togglePhotoOptionStock(photo, opt, status)
                    },
                    onDeletePhoto = { viewModel.deletePhoto(it) },
                    onOpenAddPhoto = { showAddPhotoDialog = true }
                )
                2 -> AdminFoldersTab(
                    subCategories = subCategories,
                    onAddFolder = { showAddFolderDialog = true },
                    onDeleteFolder = { viewModel.deleteSubCategoryFolder(it) }
                )
                3 -> AdminCustomersTab(
                    customers = customers,
                    onAddCustomer = { showAddCustomerDialog = true },
                    onDeleteCustomer = { viewModel.deleteCustomer(it) }
                )
            }
        }
    }

    // Dialog: Add Photo
    if (showAddPhotoDialog) {
        AddPhotoDialog(
            subCategories = subCategories,
            onDismiss = { showAddPhotoDialog = false },
            onAdd = { catId, subId, subName, code, uri, items, desc ->
                viewModel.addCatalogPhoto(catId, subId, subName, code, uri, items, desc)
                showAddPhotoDialog = false
            }
        )
    }

    // Dialog: Add Customer
    if (showAddCustomerDialog) {
        AddCustomerDialog(
            onDismiss = { showAddCustomerDialog = false },
            onSave = {
                viewModel.registerNewCustomer(it)
                showAddCustomerDialog = false
            }
        )
    }

    // Dialog: Add Folder
    if (showAddFolderDialog) {
        AddFolderDialog(
            onDismiss = { showAddFolderDialog = false },
            onSave = { catId, name ->
                viewModel.addSubCategoryFolder(catId, name)
                showAddFolderDialog = false
            }
        )
    }
}

@Composable
private fun AdminStatChip(label: String, value: String) {
    Box(
        modifier = Modifier
            .background(Color(0xFF1E293B), RoundedCornerShape(6.dp))
            .border(1.dp, Color(0xFF334155), RoundedCornerShape(6.dp))
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(text = "$label: ", color = Color(0xFF94A3B8), fontSize = 10.sp)
            Text(text = value, color = Color(0xFFF59E0B), fontWeight = FontWeight.Bold, fontSize = 11.sp)
        }
    }
}

// ----------------- TAB 1: Orders Tab -----------------
@Composable
private fun AdminOrdersTab(
    orders: List<com.example.data.model.WholesaleOrder>,
    onDeleteOrder: (Long) -> Unit,
    onUpdateDept: (com.example.data.model.WholesaleOrder, String, Boolean) -> Unit
) {
    if (orders.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text("No customer orders placed yet.", color = Color(0xFF64748B), fontSize = 14.sp)
        }
    } else {
        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(orders) { order ->
                val items = WholesaleRepository.parseOrderItems(order.itemsJson)

                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    text = "${order.orderNumber} • ${order.shopName} (${order.cityName})",
                                    color = Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "Client ID: ${order.customerCode} • Mob: ${order.mobileNumber} • Total: ${order.totalItemsCount} pcs",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp
                                )
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .background(
                                            if (order.overallStatus == "READY_TO_SHIP") Color(0xFF059669) else Color(0xFFD97706),
                                            RoundedCornerShape(6.dp)
                                        )
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = order.overallStatus,
                                        color = Color.White,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }

                                Spacer(modifier = Modifier.width(8.dp))

                                IconButton(onClick = { onDeleteOrder(order.id) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(8.dp))

                        // Items Breakdown with A, B, C, D
                        Text(
                            text = "Ordered Items: " + items.joinToString(", ") { "#${it.photoCode} Item ${it.optionLetter} (${it.quantity} pcs)" },
                            color = Color(0xFFCBD5E1),
                            fontSize = 12.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))

                        // Department Dispatch Quick Toggles
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            DeptCheckToggle(
                                label = "Imitation",
                                isDone = order.imitationStatus == "DONE",
                                onToggle = { onUpdateDept(order, "imitation", it) }
                            )
                            DeptCheckToggle(
                                label = "Cosmetics",
                                isDone = order.cosmeticsStatus == "DONE",
                                onToggle = { onUpdateDept(order, "cosmetics", it) }
                            )
                            DeptCheckToggle(
                                label = "Hair Accessories",
                                isDone = order.hairStatus == "DONE",
                                onToggle = { onUpdateDept(order, "hair_accessories", it) }
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DeptCheckToggle(label: String, isDone: Boolean, onToggle: (Boolean) -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (isDone) Color(0xFF059669).copy(alpha = 0.3f) else Color(0xFF1E293B))
            .border(1.dp, if (isDone) Color(0xFF10B981) else Color(0xFF334155), RoundedCornerShape(6.dp))
            .clickable { onToggle(!isDone) }
            .padding(horizontal = 8.dp, vertical = 6.dp)
    ) {
        Text(
            text = "$label: ${if (isDone) "DONE ✓" else "PENDING"}",
            color = if (isDone) Color(0xFF6EE7B7) else Color(0xFFCBD5E1),
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

// ----------------- TAB 2: Catalog & ABCD Stock Control Tab -----------------
@Composable
private fun AdminPhotosStockTab(
    photos: List<CatalogPhoto>,
    subCategories: List<SubCategory>,
    onToggleStock: (CatalogPhoto, Char, Boolean) -> Unit,
    onDeletePhoto: (Long) -> Unit,
    onOpenAddPhoto: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "MANAGE ABCD STOCK AVAILABILITY PER PHOTO",
                color = Color(0xFFF59E0B),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )

            Button(
                onClick = onOpenAddPhoto,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                modifier = Modifier.testTag("btn_admin_add_photo")
            ) {
                Icon(Icons.Default.AddPhotoAlternate, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("+ Upload / Add Photo", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(photos) { photo ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // 16:9 Thumbnail
                        WholesalePhotoDisplay(
                            photo = photo,
                            modifier = Modifier
                                .width(130.dp)
                                .clip(RoundedCornerShape(6.dp))
                        )

                        Spacer(modifier = Modifier.width(12.dp))

                        // Details & Individual ABCD Stock Switches
                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(
                                        text = "#${photo.photoCode} • ${photo.subCategoryName}",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = photo.description.ifBlank { "Category: ${photo.categoryId}" },
                                        color = Color(0xFF94A3B8),
                                        fontSize = 11.sp
                                    )
                                }

                                IconButton(onClick = { onDeletePhoto(photo.id) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete Photo", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                }
                            }

                            Spacer(modifier = Modifier.height(8.dp))

                            // ABCD Individual Stock Switches as requested:
                            // "ek hi image me se agar hum chahe to AB ke order band kar sake aur CD ke order saru hi ho"
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                val letters = listOf('A', 'B', 'C', 'D').take(photo.itemCount)
                                letters.forEach { letter ->
                                    val isAvailable = photo.isOptionAvailable(letter)
                                    AbcdStockToggle(
                                        letter = letter,
                                        isAvailable = isAvailable,
                                        onToggle = { newStatus ->
                                            onToggleStock(photo, letter, newStatus)
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AbcdStockToggle(
    letter: Char,
    isAvailable: Boolean,
    onToggle: (Boolean) -> Unit
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(if (isAvailable) Color(0xFF1E293B) else Color(0xFF26181B))
            .border(1.dp, if (isAvailable) Color(0xFF334155) else Color(0xFF7F1D1D), RoundedCornerShape(6.dp))
            .clickable { onToggle(!isAvailable) }
            .padding(horizontal = 8.dp, vertical = 4.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "Item $letter: ",
                color = if (isAvailable) Color.White else Color(0xFFEF4444),
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp
            )
            Text(
                text = if (isAvailable) "ACTIVE ✓" else "OFF ✕",
                color = if (isAvailable) Color(0xFF34D399) else Color(0xFFEF4444),
                fontWeight = FontWeight.Black,
                fontSize = 10.sp
            )
        }
    }
}

// ----------------- TAB 3: Folders Tab -----------------
@Composable
private fun AdminFoldersTab(
    subCategories: List<SubCategory>,
    onAddFolder: () -> Unit,
    onDeleteFolder: (Long) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "DYNAMIC SUBCATEGORY FOLDERS",
                color = Color(0xFFF59E0B),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )

            Button(
                onClick = onAddFolder,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                modifier = Modifier.testTag("btn_admin_add_folder")
            ) {
                Icon(Icons.Default.CreateNewFolder, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("+ New Folder", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(subCategories) { sub ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Folder, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(24.dp))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column {
                                Text(text = sub.name, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                                Text(text = "Category: ${sub.categoryId.replace('_', ' ').uppercase()}", color = Color(0xFF94A3B8), fontSize = 11.sp)
                            }
                        }

                        IconButton(onClick = { onDeleteFolder(sub.id) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}

// ----------------- TAB 4: Customers Tab -----------------
@Composable
private fun AdminCustomersTab(
    customers: List<Customer>,
    onAddCustomer: () -> Unit,
    onDeleteCustomer: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "CUSTOMER B2B USER IDS & PROFILES",
                color = Color(0xFFF59E0B),
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 0.5.sp
            )

            Button(
                onClick = onAddCustomer,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                modifier = Modifier.testTag("btn_admin_add_customer")
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("+ New Customer ID", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(customers) { cust ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .background(Color(0xFF1E293B), RoundedCornerShape(4.dp))
                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                ) {
                                    Text(text = "ID: ${cust.customerCode}", color = Color(0xFFFDE68A), fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(text = cust.shopName, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(text = "City: ${cust.cityName}  •  Mobile: ${cust.mobileNumber}  •  Contact: ${cust.contactPerson}", color = Color(0xFF94A3B8), fontSize = 11.sp)
                        }

                        IconButton(onClick = { onDeleteCustomer(cust.customerCode) }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
        }
    }
}

// ----------------- DIALOGS -----------------
@Composable
private fun AddPhotoDialog(
    subCategories: List<SubCategory>,
    onDismiss: () -> Unit,
    onAdd: (categoryId: String, subId: Long, subName: String, code: String, uri: String, items: Int, desc: String) -> Unit
) {
    var selectedSub by remember { mutableStateOf(subCategories.firstOrNull()) }
    var photoCode by remember { mutableStateOf("") }
    var imageUri by remember { mutableStateOf("") }
    var itemCount by remember { mutableIntStateOf(4) }
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text("Add / Upload New Catalog Photo", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Select Subcategory Folder:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Spacer(modifier = Modifier.height(4.dp))

                // Folder selector chips
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    subCategories.take(4).forEach { sub ->
                        val isSelected = selectedSub?.id == sub.id
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isSelected) Color(0xFFF59E0B) else Color(0xFF1E293B))
                                .clickable { selectedSub = sub }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = sub.name.take(12),
                                color = if (isSelected) Color.Black else Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = photoCode,
                    onValueChange = { photoCode = it },
                    label = { Text("Photo Code (e.g. ER-205, LP-108)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = imageUri,
                    onValueChange = { imageUri = it },
                    label = { Text("Image URL or leave empty for studio sample") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text("Products in this Photo (ABCD):", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(2, 3, 4).forEach { count ->
                        val isSel = itemCount == count
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isSel) Color(0xFFF59E0B) else Color(0xFF1E293B))
                                .clickable { itemCount = count }
                                .padding(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text(
                                text = "$count Products (${"ABCD".take(count)})",
                                color = if (isSel) Color.Black else Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it },
                    label = { Text("Description / Box specs") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val sub = selectedSub ?: subCategories.firstOrNull()
                    if (photoCode.isNotBlank() && sub != null) {
                        onAdd(
                            sub.categoryId,
                            sub.id,
                            sub.name,
                            photoCode.trim().uppercase(),
                            imageUri.trim(),
                            itemCount,
                            description.trim()
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("Save Photo", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = Color(0xFF94A3B8)) }
        }
    )
}

@Composable
private fun AddCustomerDialog(
    onDismiss: () -> Unit,
    onSave: (Customer) -> Unit
) {
    var code by remember { mutableStateOf("CUST${(105..999).random()}") }
    var shopName by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var mobile by remember { mutableStateOf("") }
    var contact by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text("Register Customer Account ID", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                OutlinedTextField(
                    value = code,
                    onValueChange = { code = it },
                    label = { Text("Customer ID Code") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = shopName,
                    onValueChange = { shopName = it },
                    label = { Text("Shop Name") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = city,
                    onValueChange = { city = it },
                    label = { Text("City") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )
                Spacer(modifier = Modifier.height(6.dp))
                OutlinedTextField(
                    value = mobile,
                    onValueChange = { mobile = it },
                    label = { Text("Mobile Number") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (code.isNotBlank() && shopName.isNotBlank() && city.isNotBlank()) {
                        onSave(
                            Customer(
                                customerCode = code.trim().uppercase(),
                                shopName = shopName.trim(),
                                cityName = city.trim(),
                                mobileNumber = mobile.trim(),
                                contactPerson = contact.trim()
                            )
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("Create ID", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = Color(0xFF94A3B8)) }
        }
    )
}

@Composable
private fun AddFolderDialog(
    onDismiss: () -> Unit,
    onSave: (categoryId: String, folderName: String) -> Unit
) {
    var categoryId by remember { mutableStateOf(MainCategory.IMITATION.id) }
    var folderName by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text("Create New Subcategory Folder", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Choose Category:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    MainCategory.entries.forEach { cat ->
                        val isSel = categoryId == cat.id
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(if (isSel) Color(0xFFF59E0B) else Color(0xFF1E293B))
                                .clickable { categoryId = cat.id }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Text(
                                text = cat.displayName,
                                color = if (isSel) Color.Black else Color.White,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = folderName,
                    onValueChange = { folderName = it },
                    label = { Text("Folder Name (e.g. Mangalsutra, Lip Balm)") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (folderName.isNotBlank()) {
                        onSave(categoryId, folderName.trim())
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("Create Folder", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = Color(0xFF94A3B8)) }
        }
    )
}
