package com.example.data.repository

import com.example.data.local.AppDatabase
import com.example.data.local.InitialData
import com.example.data.model.CatalogPhoto
import com.example.data.model.CategoryItem
import com.example.data.model.Customer
import com.example.data.model.OrderCartItem
import com.example.data.model.SubCategory
import com.example.data.model.WholesaleOrder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import kotlin.random.Random

class WholesaleRepository(private val database: AppDatabase) {
    private val categoryDao = database.categoryDao()
    private val subCategoryDao = database.subCategoryDao()
    private val photoDao = database.catalogPhotoDao()
    private val customerDao = database.customerDao()
    private val orderDao = database.orderDao()

    init {
        CoroutineScope(Dispatchers.IO).launch {
            seedInitialDataIfNeeded()
        }
    }

    suspend fun seedInitialDataIfNeeded() = withContext(Dispatchers.IO) {
        if (categoryDao.count() == 0) {
            for (cat in InitialData.initialCategories) {
                categoryDao.insertCategory(cat)
            }
        }
        if (subCategoryDao.count() == 0) {
            for (sub in InitialData.initialSubCategories) {
                subCategoryDao.insertSubCategory(sub)
            }
        }
        if (photoDao.count() == 0) {
            for (photo in InitialData.initialPhotos) {
                photoDao.insertPhoto(photo)
            }
        }
        if (customerDao.count() == 0) {
            for (cust in InitialData.initialCustomers) {
                customerDao.insertCustomer(cust)
            }
        }
        if (orderDao.count() == 0) {
            for (order in InitialData.initialOrders) {
                orderDao.insertOrder(order)
            }
        }
    }

    // Categories
    fun getAllCategories(): Flow<List<CategoryItem>> =
        categoryDao.getAllCategories()

    suspend fun addCategory(
        id: String,
        displayName: String,
        hindiName: String = "",
        thumbnailUrl: String = "",
        accentColorHex: String = "#F59E0B"
    ) = withContext(Dispatchers.IO) {
        val cat = CategoryItem(
            id = id.trim().lowercase().replace(" ", "_"),
            displayName = displayName.trim(),
            hindiName = hindiName.trim(),
            thumbnailUrl = thumbnailUrl.trim(),
            accentColorHex = accentColorHex
        )
        categoryDao.insertCategory(cat)
    }

    suspend fun updateCategoryThumbnail(id: String, thumbnailUrl: String) = withContext(Dispatchers.IO) {
        categoryDao.updateCategoryThumbnail(id, thumbnailUrl)
    }

    suspend fun deleteCategory(id: String) = withContext(Dispatchers.IO) {
        categoryDao.deleteCategory(id)
    }

    // SubCategories
    fun getSubCategories(categoryId: String): Flow<List<SubCategory>> =
        subCategoryDao.getSubCategories(categoryId)

    fun getAllSubCategories(): Flow<List<SubCategory>> =
        subCategoryDao.getAllSubCategories()

    suspend fun addSubCategory(
        categoryId: String,
        name: String,
        thumbnailUrl: String = "",
        sortOrder: Int = 0
    ): Long = withContext(Dispatchers.IO) {
        val sub = SubCategory(
            categoryId = categoryId,
            name = name,
            iconName = "folder",
            thumbnailUrl = thumbnailUrl,
            sortOrder = sortOrder
        )
        subCategoryDao.insertSubCategory(sub)
    }

    suspend fun updateSubCategoryThumbnail(id: Long, thumbnailUrl: String) = withContext(Dispatchers.IO) {
        subCategoryDao.updateSubCategoryThumbnail(id, thumbnailUrl)
    }

    suspend fun deleteSubCategory(id: Long) = withContext(Dispatchers.IO) {
        subCategoryDao.deleteSubCategory(id)
    }

    // Catalog Photos
    fun getPhotosBySubCategory(subCategoryId: Long): Flow<List<CatalogPhoto>> =
        photoDao.getPhotosBySubCategory(subCategoryId)

    fun getPhotosByCategory(categoryId: String): Flow<List<CatalogPhoto>> =
        photoDao.getPhotosByCategory(categoryId)

    fun getAllPhotos(): Flow<List<CatalogPhoto>> =
        photoDao.getAllPhotos()

    fun getPhotoById(id: Long): Flow<CatalogPhoto?> =
        photoDao.getPhotoById(id)

    suspend fun addPhoto(photo: CatalogPhoto): Long = withContext(Dispatchers.IO) {
        photoDao.insertPhoto(photo)
    }

    suspend fun updatePhotoSortOrder(id: Long, sortOrder: Int) = withContext(Dispatchers.IO) {
        photoDao.updateSortOrder(id, sortOrder)
    }

    suspend fun updateStock(id: Long, a: Boolean, b: Boolean, c: Boolean, d: Boolean) = withContext(Dispatchers.IO) {
        photoDao.updateStock(id, a, b, c, d)
    }

    suspend fun deletePhoto(id: Long) = withContext(Dispatchers.IO) {
        photoDao.deletePhoto(id)
    }

    // Customers
    fun getAllCustomers(): Flow<List<Customer>> =
        customerDao.getAllCustomers()

    suspend fun findCustomerByCode(code: String): Customer? = withContext(Dispatchers.IO) {
        customerDao.findCustomerByCode(code.trim().uppercase())
    }

    suspend fun registerCustomer(customer: Customer) = withContext(Dispatchers.IO) {
        customerDao.insertCustomer(customer)
        try {
            com.example.data.firebase.FirestoreManager.saveCustomer(customer)
        } catch (_: Exception) {}
    }

    suspend fun deleteCustomer(code: String) = withContext(Dispatchers.IO) {
        customerDao.deleteCustomer(code)
    }

    // Orders
    fun getAllOrders(): Flow<List<WholesaleOrder>> =
        orderDao.getAllOrders()

    suspend fun placeOrder(
        customer: Customer,
        cartItems: List<OrderCartItem>,
        notes: String = ""
    ): Long = withContext(Dispatchers.IO) {
        val totalPieces = cartItems.sumOf { it.quantity }
        val randomOrderNum = "ORD-${Random.nextInt(1000, 9999)}"

        val jsonArray = JSONArray()
        for (item in cartItems) {
            val obj = JSONObject().apply {
                put("photoId", item.photoId)
                put("photoCode", item.photoCode)
                put("imageUri", item.imageUri)
                put("categoryId", item.categoryId)
                put("subCategoryName", item.subCategoryName)
                put("optionLetter", item.optionLetter)
                put("quantity", item.quantity)
            }
            jsonArray.put(obj)
        }

        // Check which departments have items in this order
        val hasImitation = cartItems.any { it.categoryId == "imitation" }
        val hasCosmetics = cartItems.any { it.categoryId == "cosmetics" }
        val hasHair = cartItems.any { it.categoryId == "hair_accessories" }

        val order = WholesaleOrder(
            orderNumber = randomOrderNum,
            customerCode = customer.customerCode,
            shopName = customer.shopName,
            cityName = customer.cityName,
            mobileNumber = customer.mobileNumber,
            itemsJson = jsonArray.toString(),
            totalItemsCount = totalPieces,
            imitationStatus = if (hasImitation) "PENDING" else "NOT_APPLICABLE",
            cosmeticsStatus = if (hasCosmetics) "PENDING" else "NOT_APPLICABLE",
            hairStatus = if (hasHair) "PENDING" else "NOT_APPLICABLE",
            overallStatus = "RECEIVED",
            notes = notes
        )

        val insertedId = orderDao.insertOrder(order)
        try {
            com.example.data.firebase.FirestoreManager.uploadOrder(order.copy(id = insertedId))
        } catch (_: Exception) {}
        insertedId
    }

    suspend fun updateDepartmentPacking(
        order: WholesaleOrder,
        department: String, // "imitation", "cosmetics", "hair_accessories"
        isDone: Boolean
    ) = withContext(Dispatchers.IO) {
        val statusVal = if (isDone) "DONE" else "PENDING"

        var imitation = order.imitationStatus
        var cosmetics = order.cosmeticsStatus
        var hair = order.hairStatus

        when (department) {
            "imitation" -> imitation = statusVal
            "cosmetics" -> cosmetics = statusVal
            "hair_accessories" -> hair = statusVal
        }

        val allDone = (imitation == "DONE" || imitation == "NOT_APPLICABLE") &&
                (cosmetics == "DONE" || cosmetics == "NOT_APPLICABLE") &&
                (hair == "DONE" || hair == "NOT_APPLICABLE")

        val anyDone = imitation == "DONE" || cosmetics == "DONE" || hair == "DONE"

        val overall = when {
            allDone -> "READY_TO_SHIP"
            anyDone -> "PARTIALLY_PACKED"
            else -> "RECEIVED"
        }

        orderDao.updateDepartmentStatus(order.id, imitation, cosmetics, hair, overall)
        try {
            com.example.data.firebase.FirestoreManager.updateOrderStatus(
                orderNumber = order.orderNumber,
                imitationStatus = imitation,
                cosmeticsStatus = cosmetics,
                hairStatus = hair,
                overallStatus = overall
            )
        } catch (_: Exception) {}
    }

    suspend fun deleteOrder(id: Long) = withContext(Dispatchers.IO) {
        orderDao.deleteOrder(id)
    }

    companion object {
        fun parseOrderItems(itemsJson: String): List<OrderCartItem> {
            val list = mutableListOf<OrderCartItem>()
            try {
                val array = JSONArray(itemsJson)
                for (i in 0 until array.length()) {
                    val obj = array.getJSONObject(i)
                    list.add(
                        OrderCartItem(
                            photoId = obj.optLong("photoId", 0L),
                            photoCode = obj.optString("photoCode", ""),
                            imageUri = obj.optString("imageUri", ""),
                            categoryId = obj.optString("categoryId", ""),
                            subCategoryName = obj.optString("subCategoryName", ""),
                            optionLetter = obj.optString("optionLetter", "A"),
                            quantity = obj.optInt("quantity", 12)
                        )
                    )
                }
            } catch (_: Exception) {}
            return list
        }
    }
}
