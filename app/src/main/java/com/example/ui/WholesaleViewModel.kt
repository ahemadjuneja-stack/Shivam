package com.example.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.local.AppDatabase
import com.example.data.model.CatalogPhoto
import com.example.data.model.CategoryItem
import com.example.data.model.Customer
import com.example.data.model.MainCategory
import com.example.data.model.OrderCartItem
import com.example.data.model.SubCategory
import com.example.data.model.WholesaleOrder
import com.example.data.repository.WholesaleRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class AppScreen {
    HOME,
    SUB_CATEGORIES,
    GALLERY_GRID,
    PHOTO_VIEWER,
    CART,
    STAFF_PORTAL,
    ADMIN_DASHBOARD
}

enum class UserRole {
    CUSTOMER,
    SALESMAN,
    STAFF,
    ADMIN_PC
}

class WholesaleViewModel(application: Application) : AndroidViewModel(application) {
    private val database = AppDatabase.getInstance(application)
    val repository = WholesaleRepository(database)

    // Active Screen & Navigation
    private val _currentScreen = MutableStateFlow(AppScreen.HOME)
    val currentScreen: StateFlow<AppScreen> = _currentScreen.asStateFlow()

    // Active Role
    private val _userRole = MutableStateFlow(UserRole.CUSTOMER)
    val userRole: StateFlow<UserRole> = _userRole.asStateFlow()

    // Selected Category & Subcategory
    private val _selectedCategory = MutableStateFlow(MainCategory.IMITATION)
    val selectedCategory: StateFlow<MainCategory> = _selectedCategory.asStateFlow()

    private val _selectedSubCategory = MutableStateFlow<SubCategory?>(null)
    val selectedSubCategory: StateFlow<SubCategory?> = _selectedSubCategory.asStateFlow()

    // Active Photo for 16:9 Viewer
    private val _activePhotoIndex = MutableStateFlow(0)
    val activePhotoIndex: StateFlow<Int> = _activePhotoIndex.asStateFlow()

    // Current Customer (Logged In or Selected for Salesman order)
    private val _currentCustomer = MutableStateFlow(
        Customer(
            customerCode = "CUST101",
            shopName = "Shree Radhey Fancy & Beauty",
            cityName = "Surat",
            mobileNumber = "9825102345",
            contactPerson = "Ramesh Bhai Patel"
        )
    )
    val currentCustomer: StateFlow<Customer> = _currentCustomer.asStateFlow()

    // Shopping Cart State
    private val _cartItems = MutableStateFlow<List<OrderCartItem>>(emptyList())
    val cartItems: StateFlow<List<OrderCartItem>> = _cartItems.asStateFlow()

    // Feedback Toast / Status Message
    private val _toastMessage = MutableStateFlow<String?>(null)
    val toastMessage: StateFlow<String?> = _toastMessage.asStateFlow()

    // Database Observables
    val allCategories: StateFlow<List<CategoryItem>> = repository.getAllCategories()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allSubCategories: StateFlow<List<SubCategory>> = repository.getAllSubCategories()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allPhotos: StateFlow<List<CatalogPhoto>> = repository.getAllPhotos()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allCustomers: StateFlow<List<Customer>> = repository.getAllCustomers()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val allOrders: StateFlow<List<WholesaleOrder>> = repository.getAllOrders()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Photos filtered for currently selected SubCategory
    val currentSubCategoryPhotos: StateFlow<List<CatalogPhoto>> = combine(
        allPhotos,
        _selectedSubCategory
    ) { photos, subCategory ->
        if (subCategory != null) {
            photos.filter { it.subCategoryId == subCategory.id }
        } else {
            emptyList()
        }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // SubCategories filtered for currently selected Category
    val currentCategorySubCategories: StateFlow<List<SubCategory>> = combine(
        allSubCategories,
        _selectedCategory
    ) { subs, category ->
        subs.filter { it.categoryId == category.id }
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    // Navigation methods
    fun navigateTo(screen: AppScreen) {
        _currentScreen.value = screen
    }

    fun selectCategory(category: MainCategory) {
        _selectedCategory.value = category
        _currentScreen.value = AppScreen.SUB_CATEGORIES
    }

    fun selectSubCategory(subCategory: SubCategory) {
        _selectedSubCategory.value = subCategory
        _currentScreen.value = AppScreen.GALLERY_GRID
    }

    fun openPhotoInViewer(index: Int) {
        _activePhotoIndex.value = index
        _currentScreen.value = AppScreen.PHOTO_VIEWER
    }

    fun nextPhoto(total: Int) {
        if (_activePhotoIndex.value < total - 1) {
            _activePhotoIndex.value += 1
        }
    }

    fun previousPhoto() {
        if (_activePhotoIndex.value > 0) {
            _activePhotoIndex.value -= 1
        }
    }

    fun switchUserRole(role: UserRole) {
        _userRole.value = role
        when (role) {
            UserRole.ADMIN_PC -> _currentScreen.value = AppScreen.ADMIN_DASHBOARD
            UserRole.STAFF -> _currentScreen.value = AppScreen.STAFF_PORTAL
            else -> _currentScreen.value = AppScreen.HOME
        }
    }

    // Customer Login / Switcher
    fun loginCustomer(code: String, onResult: (Boolean) -> Unit) {
        viewModelScope.launch {
            val customer = repository.findCustomerByCode(code)
            if (customer != null) {
                _currentCustomer.value = customer
                _toastMessage.value = "Welcome ${customer.shopName} (${customer.cityName})"
                onResult(true)
            } else {
                _toastMessage.value = "Customer Code '$code' not found!"
                onResult(false)
            }
        }
    }

    fun registerNewCustomer(customer: Customer) {
        viewModelScope.launch {
            repository.registerCustomer(customer)
            _toastMessage.value = "Customer ID '${customer.customerCode}' created!"
        }
    }

    fun deleteCustomer(customerCode: String) {
        viewModelScope.launch {
            repository.deleteCustomer(customerCode)
            _toastMessage.value = "Customer deleted"
        }
    }

    // Cart Operations
    fun addToCart(photo: CatalogPhoto, optionLetter: String, quantity: Int = photo.defaultQuantity) {
        val current = _cartItems.value.toMutableList()
        val existingIndex = current.indexOfFirst {
            it.photoId == photo.id && it.optionLetter.equals(optionLetter, ignoreCase = true)
        }

        if (existingIndex >= 0) {
            val existing = current[existingIndex]
            current[existingIndex] = existing.copy(quantity = existing.quantity + quantity)
        } else {
            current.add(
                OrderCartItem(
                    photoId = photo.id,
                    photoCode = photo.photoCode,
                    imageUri = photo.imageUri,
                    categoryId = photo.categoryId,
                    subCategoryName = photo.subCategoryName,
                    optionLetter = optionLetter.uppercase(),
                    quantity = quantity
                )
            )
        }
        _cartItems.value = current
        _toastMessage.value = "Added Item $optionLetter to Cart (+ $quantity pcs)"
    }

    fun decreaseCartItem(photo: CatalogPhoto, optionLetter: String, quantity: Int = photo.defaultQuantity) {
        val current = _cartItems.value.toMutableList()
        val index = current.indexOfFirst {
            it.photoId == photo.id && it.optionLetter.equals(optionLetter, ignoreCase = true)
        }
        if (index >= 0) {
            val existing = current[index]
            val newQty = existing.quantity - quantity
            if (newQty <= 0) {
                current.removeAt(index)
                _toastMessage.value = "Removed Item $optionLetter from Cart"
            } else {
                current[index] = existing.copy(quantity = newQty)
                _toastMessage.value = "Reduced Item $optionLetter (-$quantity pcs, Now: $newQty)"
            }
            _cartItems.value = current
        }
    }

    fun updateCartItemQuantity(photoId: Long, optionLetter: String, newQty: Int) {
        val current = _cartItems.value.toMutableList()
        val index = current.indexOfFirst { it.photoId == photoId && it.optionLetter == optionLetter }
        if (index >= 0) {
            if (newQty <= 0) {
                current.removeAt(index)
            } else {
                current[index] = current[index].copy(quantity = newQty)
            }
            _cartItems.value = current
        }
    }

    fun removeCartItem(photoId: Long, optionLetter: String) {
        _cartItems.value = _cartItems.value.filterNot {
            it.photoId == photoId && it.optionLetter == optionLetter
        }
    }

    fun clearCart() {
        _cartItems.value = emptyList()
    }

    fun placeWholesaleOrder(notes: String = "") {
        val items = _cartItems.value
        if (items.isEmpty()) return

        viewModelScope.launch {
            val customer = _currentCustomer.value
            repository.placeOrder(customer, items, notes)
            clearCart()
            _toastMessage.value = "Wholesale Order Placed Successfully! (Sent to Shop & Staff)"
            _currentScreen.value = AppScreen.HOME
        }
    }

    // Stock Management (Admin Shop PC)
    fun togglePhotoOptionStock(photo: CatalogPhoto, option: Char, newStatus: Boolean) {
        viewModelScope.launch {
            val a = if (option == 'A') newStatus else photo.aAvailable
            val b = if (option == 'B') newStatus else photo.bAvailable
            val c = if (option == 'C') newStatus else photo.cAvailable
            val d = if (option == 'D') newStatus else photo.dAvailable

            repository.updateStock(photo.id, a, b, c, d)
            _toastMessage.value = "Updated Item $option stock for #${photo.photoCode}"
        }
    }

    fun addCatalogPhoto(
        categoryId: String,
        subCategoryId: Long,
        subCategoryName: String,
        photoCode: String,
        imageUri: String,
        itemCount: Int,
        description: String,
        sortOrder: Int = 10
    ) {
        viewModelScope.launch {
            val photo = CatalogPhoto(
                categoryId = categoryId,
                subCategoryId = subCategoryId,
                subCategoryName = subCategoryName,
                photoCode = photoCode.trim().uppercase(),
                imageUri = imageUri.trim(),
                itemCount = itemCount,
                aAvailable = true,
                bAvailable = true,
                cAvailable = true,
                dAvailable = true,
                defaultQuantity = 1,
                sortOrder = sortOrder,
                description = description
            )
            repository.addPhoto(photo)
            _toastMessage.value = "Photo #${photo.photoCode} (Seq: $sortOrder) Added to Catalog!"
        }
    }

    fun updatePhotoSortOrder(photoId: Long, sortOrder: Int) {
        viewModelScope.launch {
            repository.updatePhotoSortOrder(photoId, sortOrder)
            _toastMessage.value = "Sequence Order Updated to $sortOrder"
        }
    }

    fun deletePhoto(photoId: Long) {
        viewModelScope.launch {
            repository.deletePhoto(photoId)
            _toastMessage.value = "Photo deleted from catalog"
        }
    }

    // Category Management
    fun addCategory(
        id: String,
        displayName: String,
        hindiName: String = "",
        thumbnailUrl: String = "",
        accentColorHex: String = "#F59E0B"
    ) {
        viewModelScope.launch {
            repository.addCategory(id, displayName, hindiName, thumbnailUrl, accentColorHex)
            _toastMessage.value = "Category '$displayName' Added!"
        }
    }

    fun updateCategoryThumbnail(id: String, thumbnailUrl: String) {
        viewModelScope.launch {
            repository.updateCategoryThumbnail(id, thumbnailUrl)
            _toastMessage.value = "Category Thumbnail Updated!"
        }
    }

    fun deleteCategory(id: String) {
        viewModelScope.launch {
            repository.deleteCategory(id)
            _toastMessage.value = "Category deleted"
        }
    }

    // SubCategory Folder Management
    fun addSubCategoryFolder(
        categoryId: String,
        name: String,
        thumbnailUrl: String = "",
        sortOrder: Int = 0
    ) {
        viewModelScope.launch {
            repository.addSubCategory(categoryId, name, thumbnailUrl, sortOrder)
            _toastMessage.value = "New Folder '$name' Created!"
        }
    }

    fun updateSubCategoryThumbnail(id: Long, thumbnailUrl: String) {
        viewModelScope.launch {
            repository.updateSubCategoryThumbnail(id, thumbnailUrl)
            _toastMessage.value = "Folder Thumbnail Updated!"
        }
    }

    fun deleteSubCategoryFolder(id: Long) {
        viewModelScope.launch {
            repository.deleteSubCategory(id)
            _toastMessage.value = "Folder deleted"
        }
    }

    // Staff Dispatch Actions
    fun updateDepartmentPackingStatus(
        order: WholesaleOrder,
        department: String,
        isDone: Boolean
    ) {
        viewModelScope.launch {
            repository.updateDepartmentPacking(order, department, isDone)
            val deptName = when (department) {
                "imitation" -> "Imitation Jewelry"
                "cosmetics" -> "Cosmetics"
                else -> "Hair Accessories"
            }
            _toastMessage.value = if (isDone) "$deptName: Maal Nikal Liya (Done ✓)" else "$deptName: Marked Pending ⏳"
        }
    }

    fun deleteOrder(orderId: Long) {
        viewModelScope.launch {
            repository.deleteOrder(orderId)
            _toastMessage.value = "Order deleted"
        }
    }

    fun clearToast() {
        _toastMessage.value = null
    }
}
