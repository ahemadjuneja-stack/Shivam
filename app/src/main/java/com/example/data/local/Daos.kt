package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import com.example.data.model.CatalogPhoto
import com.example.data.model.CategoryItem
import com.example.data.model.Customer
import com.example.data.model.SubCategory
import com.example.data.model.WholesaleOrder
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoryDao {
    @Query("SELECT * FROM app_categories ORDER BY sortOrder ASC, id ASC")
    fun getAllCategories(): Flow<List<CategoryItem>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCategory(category: CategoryItem)

    @Query("UPDATE app_categories SET thumbnailUrl = :thumbnailUrl WHERE id = :id")
    suspend fun updateCategoryThumbnail(id: String, thumbnailUrl: String)

    @Query("DELETE FROM app_categories WHERE id = :id")
    suspend fun deleteCategory(id: String)

    @Query("SELECT COUNT(*) FROM app_categories")
    suspend fun count(): Int
}

@Dao
interface SubCategoryDao {
    @Query("SELECT * FROM subcategories WHERE categoryId = :categoryId ORDER BY sortOrder ASC, name ASC")
    fun getSubCategories(categoryId: String): Flow<List<SubCategory>>

    @Query("SELECT * FROM subcategories ORDER BY sortOrder ASC, name ASC")
    fun getAllSubCategories(): Flow<List<SubCategory>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSubCategory(subCategory: SubCategory): Long

    @Query("UPDATE subcategories SET thumbnailUrl = :thumbnailUrl WHERE id = :id")
    suspend fun updateSubCategoryThumbnail(id: Long, thumbnailUrl: String)

    @Query("DELETE FROM subcategories WHERE id = :id")
    suspend fun deleteSubCategory(id: Long)

    @Query("SELECT COUNT(*) FROM subcategories")
    suspend fun count(): Int
}

@Dao
interface CatalogPhotoDao {
    @Query("SELECT * FROM catalog_photos WHERE subCategoryId = :subCategoryId ORDER BY sortOrder ASC, id ASC")
    fun getPhotosBySubCategory(subCategoryId: Long): Flow<List<CatalogPhoto>>

    @Query("SELECT * FROM catalog_photos WHERE categoryId = :categoryId ORDER BY sortOrder ASC, id ASC")
    fun getPhotosByCategory(categoryId: String): Flow<List<CatalogPhoto>>

    @Query("SELECT * FROM catalog_photos ORDER BY sortOrder ASC, id ASC")
    fun getAllPhotos(): Flow<List<CatalogPhoto>>

    @Query("SELECT * FROM catalog_photos WHERE id = :id LIMIT 1")
    fun getPhotoById(id: Long): Flow<CatalogPhoto?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPhoto(photo: CatalogPhoto): Long

    @Update
    suspend fun updatePhoto(photo: CatalogPhoto)

    @Query("UPDATE catalog_photos SET sortOrder = :sortOrder WHERE id = :id")
    suspend fun updateSortOrder(id: Long, sortOrder: Int)

    @Query("""
        UPDATE catalog_photos 
        SET aAvailable = :a, bAvailable = :b, cAvailable = :c, dAvailable = :d 
        WHERE id = :id
    """)
    suspend fun updateStock(id: Long, a: Boolean, b: Boolean, c: Boolean, d: Boolean)

    @Query("DELETE FROM catalog_photos WHERE id = :id")
    suspend fun deletePhoto(id: Long)

    @Query("SELECT COUNT(*) FROM catalog_photos")
    suspend fun count(): Int
}

@Dao
interface CustomerDao {
    @Query("SELECT * FROM customers ORDER BY createdAt DESC")
    fun getAllCustomers(): Flow<List<Customer>>

    @Query("SELECT * FROM customers WHERE customerCode = :code LIMIT 1")
    suspend fun findCustomerByCode(code: String): Customer?

    @Query("SELECT * FROM customers WHERE customerCode = :code LIMIT 1")
    fun getCustomerByCodeFlow(code: String): Flow<Customer?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomer(customer: Customer)

    @Query("DELETE FROM customers WHERE customerCode = :code")
    suspend fun deleteCustomer(code: String)

    @Query("SELECT COUNT(*) FROM customers")
    suspend fun count(): Int
}

@Dao
interface OrderDao {
    @Query("SELECT * FROM wholesale_orders ORDER BY createdAt DESC")
    fun getAllOrders(): Flow<List<WholesaleOrder>>

    @Query("SELECT * FROM wholesale_orders WHERE id = :id LIMIT 1")
    fun getOrderById(id: Long): Flow<WholesaleOrder?>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: WholesaleOrder): Long

    @Query("""
        UPDATE wholesale_orders 
        SET imitationStatus = :imitation, cosmeticsStatus = :cosmetics, hairStatus = :hair, overallStatus = :overall 
        WHERE id = :orderId
    """)
    suspend fun updateDepartmentStatus(
        orderId: Long,
        imitation: String,
        cosmetics: String,
        hair: String,
        overall: String
    )

    @Query("DELETE FROM wholesale_orders WHERE id = :id")
    suspend fun deleteOrder(id: Long)

    @Query("SELECT COUNT(*) FROM wholesale_orders")
    suspend fun count(): Int
}
