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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AddPhotoAlternate
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.CreateNewFolder
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Language
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
import androidx.compose.ui.layout.ContentScale
import android.widget.Toast
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.example.data.model.CatalogPhoto
import com.example.data.model.CategoryItem
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
    val categories by viewModel.allCategories.collectAsStateWithLifecycle()

    var activeTab by remember { mutableIntStateOf(0) }
    // 0: Orders, 1: Catalog & ABCD Stock, 2: Folders, 3: Customers

    var showAddPhotoDialog by remember { mutableStateOf(false) }
    var showAddCustomerDialog by remember { mutableStateOf(false) }
    var showAddFolderDialog by remember { mutableStateOf(false) }
    var showAddCategoryDialog by remember { mutableStateOf(false) }
    var showWebDashboardDialog by remember { mutableStateOf(false) }

    var categoryToEditThumbnail by remember { mutableStateOf<CategoryItem?>(null) }
    var subCategoryToEditThumbnail by remember { mutableStateOf<SubCategory?>(null) }
    var categoryToDelete by remember { mutableStateOf<CategoryItem?>(null) }
    var subCategoryToDelete by remember { mutableStateOf<SubCategory?>(null) }
    var photoToEditSortOrder by remember { mutableStateOf<CatalogPhoto?>(null) }

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

            // Quick Stats Bar & Web Portal Button
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AdminStatChip(label = "Categories", value = "${categories.size}")
                AdminStatChip(label = "Folders", value = "${subCategories.size}")
                AdminStatChip(label = "Photos", value = "${photos.size}")
                AdminStatChip(label = "Orders", value = "${orders.size}")

                Button(
                    onClick = { showWebDashboardDialog = true },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF0284C7)),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.testTag("btn_open_web_portal")
                ) {
                    Icon(
                        imageVector = Icons.Default.Language,
                        contentDescription = "Web Portal",
                        tint = Color.White,
                        modifier = Modifier.size(15.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Web Portal Link",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                }
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
                text = { Text("Categories & Folders", fontWeight = FontWeight.Bold, fontSize = 11.sp) }
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
                    onOpenAddPhoto = { showAddPhotoDialog = true },
                    onEditSortOrder = { photoToEditSortOrder = it }
                )
                2 -> AdminCategoriesAndFoldersTab(
                    categories = categories,
                    subCategories = subCategories,
                    allPhotos = photos,
                    onAddCategory = { showAddCategoryDialog = true },
                    onEditCategoryThumbnail = { categoryToEditThumbnail = it },
                    onDeleteCategory = { categoryToDelete = it },
                    onAddFolder = { showAddFolderDialog = true },
                    onEditSubCategoryThumbnail = { subCategoryToEditThumbnail = it },
                    onDeleteFolder = { subCategoryToDelete = subCategories.find { sub -> sub.id == it } }
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
            categories = categories,
            subCategories = subCategories,
            onDismiss = { showAddPhotoDialog = false },
            onAdd = { catId, subId, subName, code, uri, items, desc, sortOrder ->
                viewModel.addCatalogPhoto(catId, subId, subName, code, uri, items, desc, sortOrder)
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
            categories = categories,
            onDismiss = { showAddFolderDialog = false },
            onSave = { catId, name, thumbUrl, sortOrder ->
                viewModel.addSubCategoryFolder(catId, name, thumbUrl, sortOrder)
                showAddFolderDialog = false
            }
        )
    }

    // Dialog: Add Category
    if (showAddCategoryDialog) {
        AddCategoryDialog(
            onDismiss = { showAddCategoryDialog = false },
            onSave = { id, name, hindiName, thumbUrl, colorHex ->
                viewModel.addCategory(id, name, hindiName, thumbUrl, colorHex)
                showAddCategoryDialog = false
            }
        )
    }

    // Dialog: Change Category Thumbnail
    categoryToEditThumbnail?.let { cat ->
        ChangeThumbnailDialog(
            title = "Change Thumbnail: ${cat.displayName}",
            initialUrl = cat.thumbnailUrl,
            onDismiss = { categoryToEditThumbnail = null },
            onSave = { newUrl ->
                viewModel.updateCategoryThumbnail(cat.id, newUrl)
                categoryToEditThumbnail = null
            }
        )
    }

    // Dialog: Change Subcategory Folder Thumbnail
    subCategoryToEditThumbnail?.let { sub ->
        ChangeThumbnailDialog(
            title = "Change Thumbnail: ${sub.name}",
            initialUrl = sub.thumbnailUrl,
            onDismiss = { subCategoryToEditThumbnail = null },
            onSave = { newUrl ->
                viewModel.updateSubCategoryThumbnail(sub.id, newUrl)
                subCategoryToEditThumbnail = null
            }
        )
    }

    // Dialog: Edit Photo Sort Order / Position
    photoToEditSortOrder?.let { photo ->
        EditSortOrderDialog(
            photoCode = photo.photoCode,
            currentSortOrder = photo.sortOrder,
            onDismiss = { photoToEditSortOrder = null },
            onSave = { newOrder ->
                viewModel.updatePhotoSortOrder(photo.id, newOrder)
                photoToEditSortOrder = null
            }
        )
    }

    // Dialog: Confirm Delete Category
    categoryToDelete?.let { cat ->
        ConfirmDeleteDialog(
            title = "Delete Category: ${cat.displayName}?",
            message = "Are you sure you want to delete this category? Make sure all its subcategory folders are moved or removed first.",
            onDismiss = { categoryToDelete = null },
            onConfirm = {
                viewModel.deleteCategory(cat.id)
                categoryToDelete = null
            }
        )
    }

    // Dialog: Confirm Delete Subcategory Folder
    subCategoryToDelete?.let { sub ->
        ConfirmDeleteDialog(
            title = "Delete Folder: ${sub.name}?",
            message = "Are you sure you want to delete this subcategory folder? Any photos associated with it will remain in the catalog.",
            onDismiss = { subCategoryToDelete = null },
            onConfirm = {
                viewModel.deleteSubCategoryFolder(sub.id)
                subCategoryToDelete = null
            }
        )
    }

    // Dialog: Web Dashboard Domain & Link
    if (showWebDashboardDialog) {
        WebDashboardInfoDialog(
            onDismiss = { showWebDashboardDialog = false }
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
    onOpenAddPhoto: () -> Unit,
    onEditSortOrder: (CatalogPhoto) -> Unit
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
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "#${photo.photoCode} • ${photo.subCategoryName}",
                                        color = Color.White,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    // Custom position number badge (clickable to change)
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(4.dp))
                                            .background(Color(0xFF1E293B))
                                            .border(1.dp, Color(0xFFF59E0B).copy(alpha = 0.6f), RoundedCornerShape(4.dp))
                                            .clickable { onEditSortOrder(photo) }
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Text(
                                                text = "Seq #${photo.sortOrder}",
                                                color = Color(0xFFFDE68A),
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Spacer(modifier = Modifier.width(3.dp))
                                            Icon(
                                                imageVector = Icons.Default.Edit,
                                                contentDescription = "Edit Sequence",
                                                tint = Color(0xFFFDE68A),
                                                modifier = Modifier.size(10.dp)
                                            )
                                        }
                                    }
                                }

                                IconButton(onClick = { onDeletePhoto(photo.id) }) {
                                    Icon(Icons.Default.Delete, contentDescription = "Delete Photo", tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                }
                            }

                            Text(
                                text = photo.description.ifBlank { "Category: ${photo.categoryId}" },
                                color = Color(0xFF94A3B8),
                                fontSize = 11.sp
                            )

                            Spacer(modifier = Modifier.height(8.dp))

                            // ABCD Individual Stock Switches as requested:
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

// ----------------- TAB 3: Categories & Folders Tab -----------------
@Composable
private fun AdminCategoriesAndFoldersTab(
    categories: List<CategoryItem>,
    subCategories: List<SubCategory>,
    allPhotos: List<CatalogPhoto>,
    onAddCategory: () -> Unit,
    onEditCategoryThumbnail: (CategoryItem) -> Unit,
    onDeleteCategory: (CategoryItem) -> Unit,
    onAddFolder: () -> Unit,
    onEditSubCategoryThumbnail: (SubCategory) -> Unit,
    onDeleteFolder: (Long) -> Unit
) {
    var selectedSection by remember { mutableIntStateOf(0) }
    // 0: Main Categories, 1: Subcategory Folders
    var selectedCategoryFilter by remember { mutableStateOf<String?>("ALL") }

    Column(modifier = Modifier.fillMaxSize()) {
        // Section Toggle Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF0F172A))
                    .padding(3.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (selectedSection == 0) Color(0xFFF59E0B) else Color.Transparent)
                        .clickable { selectedSection = 0 }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "1. Categories (${categories.size})",
                        color = if (selectedSection == 0) Color.Black else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(6.dp))
                        .background(if (selectedSection == 1) Color(0xFFF59E0B) else Color.Transparent)
                        .clickable { selectedSection = 1 }
                        .padding(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = "2. Subcategory Folders (${subCategories.size})",
                        color = if (selectedSection == 1) Color.Black else Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp
                    )
                }
            }

            if (selectedSection == 0) {
                Button(
                    onClick = onAddCategory,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    modifier = Modifier.testTag("btn_admin_add_category")
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("+ Add Category", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            } else {
                Button(
                    onClick = onAddFolder,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    modifier = Modifier.testTag("btn_admin_add_folder")
                ) {
                    Icon(Icons.Default.CreateNewFolder, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("+ New Folder", color = Color.Black, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        if (selectedSection == 0) {
            // Categories List
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { cat ->
                    val foldersCount = subCategories.count { it.categoryId == cat.id }
                    val photosCount = allPhotos.count { it.categoryId == cat.id }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Category Thumbnail Box
                            Box(
                                modifier = Modifier
                                    .size(56.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF1E293B))
                                    .border(1.dp, Color(0xFFF59E0B).copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (cat.thumbnailUrl.isNotBlank()) {
                                    AsyncImage(
                                        model = ImageRequest.Builder(LocalContext.current)
                                            .data(cat.thumbnailUrl)
                                            .crossfade(true)
                                            .build(),
                                        contentDescription = cat.displayName,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.Category,
                                        contentDescription = null,
                                        tint = Color(0xFFF59E0B),
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = cat.displayName,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 15.sp
                                    )
                                    if (cat.hindiName.isNotBlank()) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = "• ${cat.hindiName}",
                                            color = Color(0xFFFDE68A),
                                            fontSize = 12.sp
                                        )
                                    }
                                }
                                Text(
                                    text = "ID: ${cat.id} • $foldersCount Folders • $photosCount Photos",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp
                                )
                            }

                            // Actions
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { onEditCategoryThumbnail(cat) }) {
                                    Icon(
                                        imageVector = Icons.Default.Image,
                                        contentDescription = "Change Thumbnail",
                                        tint = Color(0xFF38BDF8),
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                IconButton(onClick = { onDeleteCategory(cat) }) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete",
                                        tint = Color(0xFFEF4444),
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Subcategory Folders List with Category Filter Pills
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                item {
                    val isAll = selectedCategoryFilter == "ALL"
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (isAll) Color(0xFFF59E0B) else Color(0xFF1E293B))
                            .clickable { selectedCategoryFilter = "ALL" }
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Text("ALL", color = if (isAll) Color.Black else Color.White, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                    }
                }
                items(categories) { cat ->
                    val isSel = selectedCategoryFilter == cat.id
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (isSel) Color(0xFFF59E0B) else Color(0xFF1E293B))
                            .clickable { selectedCategoryFilter = cat.id }
                            .padding(horizontal = 10.dp, vertical = 5.dp)
                    ) {
                        Text(
                            text = cat.displayName,
                            color = if (isSel) Color.Black else Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            val filteredFolders = if (selectedCategoryFilter == "ALL" || selectedCategoryFilter == null) {
                subCategories
            } else {
                subCategories.filter { it.categoryId == selectedCategoryFilter }
            }

            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filteredFolders) { sub ->
                    val photosCount = allPhotos.count { it.subCategoryId == sub.id }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A)),
                        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF1E293B))
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Subcategory Thumbnail Box
                            Box(
                                modifier = Modifier
                                    .size(56.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color(0xFF1E293B))
                                    .border(1.dp, Color(0xFFF59E0B).copy(alpha = 0.5f), RoundedCornerShape(8.dp)),
                                contentAlignment = Alignment.Center
                            ) {
                                if (sub.thumbnailUrl.isNotBlank()) {
                                    AsyncImage(
                                        model = ImageRequest.Builder(LocalContext.current)
                                            .data(sub.thumbnailUrl)
                                            .crossfade(true)
                                            .build(),
                                        contentDescription = sub.name,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else {
                                    Icon(
                                        imageVector = Icons.Default.Folder,
                                        contentDescription = null,
                                        tint = Color(0xFFF59E0B),
                                        modifier = Modifier.size(28.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(12.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = sub.name,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp
                                    )
                                    if (sub.sortOrder > 0) {
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Box(
                                            modifier = Modifier
                                                .background(Color(0xFF1E293B), RoundedCornerShape(4.dp))
                                                .border(1.dp, Color(0xFF334155), RoundedCornerShape(4.dp))
                                                .padding(horizontal = 5.dp, vertical = 1.dp)
                                        ) {
                                            Text(
                                                text = "Seq #${sub.sortOrder}",
                                                color = Color(0xFFFDE68A),
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = "Category: ${sub.categoryId.replace('_', ' ').uppercase()} • $photosCount Designs",
                                    color = Color(0xFF94A3B8),
                                    fontSize = 11.sp
                                )
                            }

                            // Actions
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                IconButton(onClick = { onEditSubCategoryThumbnail(sub) }) {
                                    Icon(
                                        imageVector = Icons.Default.Image,
                                        contentDescription = "Change Thumbnail",
                                        tint = Color(0xFF38BDF8),
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                                IconButton(onClick = { onDeleteFolder(sub.id) }) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Delete",
                                        tint = Color(0xFFEF4444),
                                        modifier = Modifier.size(20.dp)
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
    categories: List<CategoryItem>,
    subCategories: List<SubCategory>,
    onDismiss: () -> Unit,
    onAdd: (categoryId: String, subId: Long, subName: String, code: String, uri: String, items: Int, desc: String, sortOrder: Int) -> Unit
) {
    var selectedCategoryId by remember {
        mutableStateOf(categories.firstOrNull()?.id ?: MainCategory.COSMETICS.id)
    }

    val availableFoldersForCategory = remember(selectedCategoryId, subCategories) {
        subCategories.filter { it.categoryId == selectedCategoryId }
    }

    var selectedSub by remember(selectedCategoryId) {
        mutableStateOf(availableFoldersForCategory.firstOrNull())
    }

    var photoCode by remember { mutableStateOf("") }
    var imageUri by remember { mutableStateOf("") }
    var sortOrderText by remember { mutableStateOf("10") }
    var itemCount by remember { mutableIntStateOf(4) }
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text("Upload & Categorize Product Photo", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            LazyColumn(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Choose Category
                item {
                    Text("1. Choose Category:", color = Color(0xFFF59E0B), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(categories) { cat ->
                            val isSel = selectedCategoryId == cat.id
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isSel) Color(0xFFF59E0B) else Color(0xFF1E293B))
                                    .clickable {
                                        selectedCategoryId = cat.id
                                        selectedSub = subCategories.firstOrNull { it.categoryId == cat.id }
                                    }
                                    .padding(horizontal = 8.dp, vertical = 5.dp)
                            ) {
                                Text(
                                    text = cat.displayName,
                                    color = if (isSel) Color.Black else Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // 2. Choose Subcategory Folder
                item {
                    Text("2. Choose Subcategory Folder:", color = Color(0xFFF59E0B), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    if (availableFoldersForCategory.isEmpty()) {
                        Text(
                            "No folders in this category yet. Please add a folder first.",
                            color = Color(0xFFEF4444),
                            fontSize = 11.sp
                        )
                    } else {
                        LazyRow(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(availableFoldersForCategory) { sub ->
                                val isSelected = selectedSub?.id == sub.id
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (isSelected) Color(0xFFF59E0B) else Color(0xFF1E293B))
                                        .clickable { selectedSub = sub }
                                        .padding(horizontal = 8.dp, vertical = 5.dp)
                                ) {
                                    Text(
                                        text = sub.name,
                                        color = if (isSelected) Color.Black else Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                        }
                    }
                }

                // 3. Photo Code & Position Number
                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedTextField(
                            value = photoCode,
                            onValueChange = { photoCode = it },
                            label = { Text("Photo # (e.g. NP-10)") },
                            singleLine = true,
                            modifier = Modifier.weight(1.2f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFFF59E0B),
                                unfocusedBorderColor = Color(0xFF334155)
                            )
                        )

                        OutlinedTextField(
                            value = sortOrderText,
                            onValueChange = { sortOrderText = it.filter { ch -> ch.isDigit() } },
                            label = { Text("Position # (e.g. 10, 11)") },
                            singleLine = true,
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White,
                                focusedBorderColor = Color(0xFFF59E0B),
                                unfocusedBorderColor = Color(0xFF334155)
                            )
                        )
                    }
                    Text(
                        "Consecutive numbers (e.g. 10, 11) will place similar products side-by-side in the folder.",
                        color = Color(0xFF94A3B8),
                        fontSize = 10.sp
                    )
                }

                // 4. Image URL
                item {
                    OutlinedTextField(
                        value = imageUri,
                        onValueChange = { imageUri = it },
                        label = { Text("Image URL (or leave blank for studio sample)") },
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

                // 5. Items count ABCD
                item {
                    Text("Products in this Photo (ABCD):", color = Color(0xFF94A3B8), fontSize = 11.sp)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(2, 3, 4).forEach { count ->
                            val isSel = itemCount == count
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (isSel) Color(0xFFF59E0B) else Color(0xFF1E293B))
                                    .clickable { itemCount = count }
                                    .padding(horizontal = 10.dp, vertical = 5.dp)
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
                }

                // 6. Description
                item {
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
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    val sub = selectedSub ?: availableFoldersForCategory.firstOrNull()
                    if (photoCode.isNotBlank() && sub != null) {
                        val orderNum = sortOrderText.toIntOrNull() ?: 10
                        onAdd(
                            selectedCategoryId,
                            sub.id,
                            sub.name,
                            photoCode.trim().uppercase(),
                            imageUri.trim(),
                            itemCount,
                            description.trim(),
                            orderNum
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
    categories: List<CategoryItem>,
    onDismiss: () -> Unit,
    onSave: (categoryId: String, folderName: String, thumbUrl: String, sortOrder: Int) -> Unit
) {
    var categoryId by remember { mutableStateOf(categories.firstOrNull()?.id ?: MainCategory.IMITATION.id) }
    var folderName by remember { mutableStateOf("") }
    var thumbnailUrl by remember { mutableStateOf("") }
    var sortOrderText by remember { mutableStateOf("10") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text("Create New Subcategory Folder", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Choose Category:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Spacer(modifier = Modifier.height(6.dp))
                LazyRow(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(categories) { cat ->
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
                    label = { Text("Folder Name (e.g. Mangalsutra, Nail Paint)") },
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
                    value = thumbnailUrl,
                    onValueChange = { thumbnailUrl = it },
                    label = { Text("Folder Thumbnail Image URL (optional)") },
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
                    value = sortOrderText,
                    onValueChange = { sortOrderText = it.filter { ch -> ch.isDigit() } },
                    label = { Text("Sort Order / Position (e.g. 10, 20)") },
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
                    if (folderName.isNotBlank()) {
                        val num = sortOrderText.toIntOrNull() ?: 10
                        onSave(categoryId, folderName.trim(), thumbnailUrl.trim(), num)
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

@Composable
private fun AddCategoryDialog(
    onDismiss: () -> Unit,
    onSave: (id: String, name: String, hindiName: String, thumbUrl: String, colorHex: String) -> Unit
) {
    var name by remember { mutableStateOf("") }
    var hindiName by remember { mutableStateOf("") }
    var thumbUrl by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text("Create New Wholesale Category", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text("Category Name (e.g. Bangles & Kadas)") },
                    singleLine = true,
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
                    value = hindiName,
                    onValueChange = { hindiName = it },
                    label = { Text("Hindi Name (e.g. चूड़ियां और कंगन)") },
                    singleLine = true,
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
                    value = thumbUrl,
                    onValueChange = { thumbUrl = it },
                    label = { Text("Category Thumbnail URL (optional)") },
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
                    if (name.isNotBlank()) {
                        val id = name.trim().lowercase().replace(' ', '_').filter { it.isLetterOrDigit() || it == '_' }
                        onSave(id, name.trim(), hindiName.trim(), thumbUrl.trim(), "#F59E0B")
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("Create Category", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel", color = Color(0xFF94A3B8)) }
        }
    )
}

@Composable
private fun ChangeThumbnailDialog(
    title: String,
    initialUrl: String,
    onDismiss: () -> Unit,
    onSave: (String) -> Unit
) {
    var url by remember { mutableStateOf(initialUrl) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text(title, color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Enter image URL for this thumbnail or sample link:", color = Color(0xFF94A3B8), fontSize = 12.sp)
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = url,
                    onValueChange = { url = it },
                    label = { Text("Thumbnail Image URL") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFFF59E0B),
                        unfocusedBorderColor = Color(0xFF334155)
                    )
                )

                if (url.isNotBlank()) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text("Preview:", color = Color(0xFF94A3B8), fontSize = 11.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFF1E293B))
                            .border(1.dp, Color(0xFFF59E0B), RoundedCornerShape(8.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(url)
                                .crossfade(true)
                                .build(),
                            contentDescription = "Preview",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = { onSave(url.trim()) },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("Save Thumbnail", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Color(0xFF94A3B8))
            }
        }
    )
}

@Composable
private fun EditSortOrderDialog(
    photoCode: String,
    currentSortOrder: Int,
    onDismiss: () -> Unit,
    onSave: (Int) -> Unit
) {
    var sortText by remember { mutableStateOf(currentSortOrder.toString()) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text("Set Position # for Photo #$photoCode", color = Color.White, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text(
                    "Set product order number. Products with consecutive numbers (e.g. 10 and 11) will appear side-by-side in the folder.",
                    color = Color(0xFF94A3B8),
                    fontSize = 12.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                OutlinedTextField(
                    value = sortText,
                    onValueChange = { sortText = it.filter { ch -> ch.isDigit() } },
                    label = { Text("Position / Sequence Number (e.g. 10, 11)") },
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
                    val num = sortText.toIntOrNull() ?: 10
                    onSave(num)
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B))
            ) {
                Text("Update Position", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Color(0xFF94A3B8))
            }
        }
    )
}

@Composable
private fun ConfirmDeleteDialog(
    title: String,
    message: String,
    onDismiss: () -> Unit,
    onConfirm: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = { Text(title, color = Color(0xFFEF4444), fontWeight = FontWeight.Bold) },
        text = { Text(message, color = Color.White, fontSize = 13.sp) },
        confirmButton = {
            Button(
                onClick = onConfirm,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
            ) {
                Text("Delete", color = Color.White, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = Color(0xFF94A3B8))
            }
        }
    )
}

@Composable
private fun WebDashboardInfoDialog(
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val hostingUrl = "https://shivam-2bace.web.app"

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF0F172A),
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Language,
                    contentDescription = null,
                    tint = Color(0xFF38BDF8),
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Text("Web Admin Portal & Free Domain", color = Color.White, fontWeight = FontWeight.Black, fontSize = 16.sp)
            }
        },
        text = {
            Column(modifier = Modifier.padding(top = 4.dp)) {
                Text(
                    text = "Aapka cloud web dashboard ready hai! Aap is free Firebase domain se kisi bhi laptop, PC ya mobile browser par login karke full management kar sakte hain:",
                    color = Color(0xFFCBD5E1),
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(12.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color(0xFF1E293B))
                        .padding(12.dp)
                ) {
                    Column {
                        Text(
                            text = "OFFICIAL FREE DOMAIN LINK:",
                            color = Color(0xFF94A3B8),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = hostingUrl,
                            color = Color(0xFF38BDF8),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = "Alternative: https://shivam-2bace.firebaseapp.com",
                            color = Color(0xFF64748B),
                            fontSize = 10.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "Features in Web Dashboard:",
                    color = Color(0xFFF59E0B),
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
                Text(
                    text = "• Create Customer IDs with WhatsApp share link\n• Upload photos (File upload & web URLs)\n• Department packing Done/Pending (Imitation, Cosmetics, Hair)\n• Print wholesale packing & dispatch slips",
                    color = Color(0xFF94A3B8),
                    fontSize = 11.sp
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    clipboardManager.setText(AnnotatedString(hostingUrl))
                    Toast.makeText(context, "Web Link Copied to Clipboard!", Toast.LENGTH_SHORT).show()
                },
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF38BDF8))
            ) {
                Icon(Icons.Default.ContentCopy, contentDescription = null, tint = Color.Black, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Copy Domain Link", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = Color(0xFF94A3B8))
            }
        }
    )
}
