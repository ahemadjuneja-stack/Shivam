package com.example.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Main categories as requested:
 * 1. Imitation (Jewelry)
 * 2. Cosmetics
 * 3. Hair Accessories
 */
enum class MainCategory(val id: String, val displayName: String, val hindiName: String) {
    IMITATION("imitation", "Imitation Jewelry", "इमिटेशन ज्वेलरी"),
    COSMETICS("cosmetics", "Cosmetics", "कॉस्मेटिक्स"),
    HAIR_ACCESSORIES("hair_accessories", "Hair Accessories", "हेयर एक्सेसरीज");

    companion object {
        fun fromId(id: String): MainCategory = entries.firstOrNull { it.id == id } ?: IMITATION
    }
}

/**
 * Dynamic Categories customizable via Dashboard (Add / Delete / Change Thumbnail).
 */
@Entity(tableName = "app_categories")
data class CategoryItem(
    @PrimaryKey
    val id: String,
    val displayName: String,
    val hindiName: String = "",
    val thumbnailUrl: String = "",
    val accentColorHex: String = "#F59E0B",
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Subcategories (folders) inside each category.
 * Has customizable thumbnail, photo count, and display order.
 */
@Entity(tableName = "subcategories")
data class SubCategory(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val categoryId: String, // CategoryItem.id or MainCategory.id
    val name: String,
    val iconName: String = "folder",
    val thumbnailUrl: String = "",
    val photoCount: Int = 0,
    val sortOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Catalog Photo containing 2, 3, or 4 products labeled A, B, C, D.
 * Price is embedded inside the photo (wholesale standard).
 * Stock availability can be individually toggled for A, B, C, D.
 * sortOrder: Sequence number (e.g. 10, 11) to arrange similar products side-by-side!
 */
@Entity(tableName = "catalog_photos")
data class CatalogPhoto(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val categoryId: String,
    val subCategoryId: Long,
    val subCategoryName: String,
    val photoCode: String, // e.g. "ER-101"
    val imageUri: String, // Resource name or file URI or sample placeholder
    val itemCount: Int = 4, // 2, 3, or 4
    val aAvailable: Boolean = true,
    val bAvailable: Boolean = true,
    val cAvailable: Boolean = true,
    val dAvailable: Boolean = true,
    val defaultQuantity: Int = 1, // Customizable unit/pack quantity
    val sortOrder: Int = 10, // Display Sequence / sort order (e.g. 10, 11)
    val description: String = "",
    val createdAt: Long = System.currentTimeMillis()
) {
    fun isOptionAvailable(option: Char): Boolean = when (option.uppercaseChar()) {
        'A' -> aAvailable
        'B' -> bAvailable
        'C' -> cAvailable
        'D' -> dAvailable
        else -> false
    }
}

/**
 * B2B Wholesale Customer profile.
 * Shop admin creates Customer ID (e.g. CUST101) so Shop Name, City, Mobile are recorded.
 */
@Entity(tableName = "customers")
data class Customer(
    @PrimaryKey
    val customerCode: String, // Unique User ID provided to customer (e.g. "CUST-101")
    val shopName: String,
    val cityName: String,
    val mobileNumber: String,
    val contactPerson: String = "",
    val address: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * Single item inside an order or cart.
 */
data class OrderCartItem(
    val photoId: Long,
    val photoCode: String,
    val imageUri: String,
    val categoryId: String,
    val subCategoryName: String,
    val optionLetter: String, // "A", "B", "C", or "D"
    val quantity: Int = 1 // Default quantity (1 pcs or customized)
)

/**
 * Wholesale Order saved in Room database.
 * Tracks staff department packing status:
 * - Imitation department
 * - Cosmetics department
 * - Hair Accessories department
 */
@Entity(tableName = "wholesale_orders")
data class WholesaleOrder(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val orderNumber: String, // e.g. "ORD-9482"
    val customerCode: String,
    val shopName: String,
    val cityName: String,
    val mobileNumber: String,
    val itemsJson: String, // Serialized list of OrderCartItem
    val totalItemsCount: Int,
    val imitationStatus: String = "PENDING", // PENDING, DONE, NOT_APPLICABLE
    val cosmeticsStatus: String = "PENDING",
    val hairStatus: String = "PENDING",
    val overallStatus: String = "RECEIVED", // RECEIVED, PARTIALLY_PACKED, READY_TO_SHIP, DISPATCHED
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis()
)
