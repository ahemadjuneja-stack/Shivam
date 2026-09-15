package com.example.data.firebase

import android.util.Log
import com.example.data.model.CatalogPhoto
import com.example.data.model.Customer
import com.example.data.model.SubCategory
import com.example.data.model.WholesaleOrder
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.tasks.await

/**
 * Real-time Firebase Firestore Sync Manager.
 * Safely works in both connected and offline modes.
 * If google-services.json is configured, syncs live to Cloud.
 */
object FirestoreManager {
    private const val TAG = "FirestoreManager"
    private const val COLLECTION_SUBCATEGORIES = "subcategories"
    private const val COLLECTION_PHOTOS = "catalog_photos"
    private const val COLLECTION_CUSTOMERS = "customers"
    private const val COLLECTION_ORDERS = "wholesale_orders"

    private val db: FirebaseFirestore? by lazy {
        try {
            FirebaseFirestore.getInstance()
        } catch (e: Exception) {
            Log.w(TAG, "Firebase not yet initialized or missing google-services.json: ${e.message}")
            null
        }
    }

    val isFirebaseAvailable: Boolean
        get() = db != null

    // Realtime Order Upload to Cloud
    suspend fun uploadOrder(order: WholesaleOrder): Boolean {
        val firestore = db ?: return false
        return try {
            val orderData = hashMapOf(
                "orderNumber" to order.orderNumber,
                "customerCode" to order.customerCode,
                "shopName" to order.shopName,
                "cityName" to order.cityName,
                "mobileNumber" to order.mobileNumber,
                "itemsJson" to order.itemsJson,
                "totalItemsCount" to order.totalItemsCount,
                "imitationStatus" to order.imitationStatus,
                "cosmeticsStatus" to order.cosmeticsStatus,
                "hairStatus" to order.hairStatus,
                "overallStatus" to order.overallStatus,
                "notes" to order.notes,
                "createdAt" to order.createdAt
            )
            firestore.collection(COLLECTION_ORDERS)
                .document(order.orderNumber)
                .set(orderData, SetOptions.merge())
                .await()
            Log.d(TAG, "Order ${order.orderNumber} successfully uploaded to Firestore!")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to upload order to Firestore: ${e.message}")
            false
        }
    }

    // Update order status in Firestore (e.g. Packing done)
    suspend fun updateOrderStatus(
        orderNumber: String,
        imitationStatus: String,
        cosmeticsStatus: String,
        hairStatus: String,
        overallStatus: String
    ): Boolean {
        val firestore = db ?: return false
        return try {
            firestore.collection(COLLECTION_ORDERS)
                .document(orderNumber)
                .update(
                    mapOf(
                        "imitationStatus" to imitationStatus,
                        "cosmeticsStatus" to cosmeticsStatus,
                        "hairStatus" to hairStatus,
                        "overallStatus" to overallStatus
                    )
                ).await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error updating order status in Firestore: ${e.message}")
            false
        }
    }

    // Sync Customer to Firestore
    suspend fun saveCustomer(customer: Customer): Boolean {
        val firestore = db ?: return false
        return try {
            val data = hashMapOf(
                "customerCode" to customer.customerCode,
                "shopName" to customer.shopName,
                "cityName" to customer.cityName,
                "mobileNumber" to customer.mobileNumber,
                "contactPerson" to customer.contactPerson,
                "address" to customer.address,
                "createdAt" to customer.createdAt
            )
            firestore.collection(COLLECTION_CUSTOMERS)
                .document(customer.customerCode)
                .set(data, SetOptions.merge())
                .await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error saving customer to Firestore: ${e.message}")
            false
        }
    }

    // Sync Catalog Photo to Firestore
    suspend fun savePhoto(photo: CatalogPhoto): Boolean {
        val firestore = db ?: return false
        return try {
            val docId = if (photo.photoCode.isNotBlank()) photo.photoCode else "photo_${photo.id}"
            val data = hashMapOf(
                "categoryId" to photo.categoryId,
                "subCategoryId" to photo.subCategoryId,
                "subCategoryName" to photo.subCategoryName,
                "photoCode" to photo.photoCode,
                "imageUri" to photo.imageUri,
                "itemCount" to photo.itemCount,
                "aAvailable" to photo.aAvailable,
                "bAvailable" to photo.bAvailable,
                "cAvailable" to photo.cAvailable,
                "dAvailable" to photo.dAvailable,
                "defaultQuantity" to photo.defaultQuantity,
                "description" to photo.description,
                "createdAt" to photo.createdAt
            )
            firestore.collection(COLLECTION_PHOTOS)
                .document(docId)
                .set(data, SetOptions.merge())
                .await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error saving photo to Firestore: ${e.message}")
            false
        }
    }

    // Update Stock availability in Firestore
    suspend fun updateStock(
        photoCode: String,
        option: Char,
        available: Boolean
    ): Boolean {
        val firestore = db ?: return false
        return try {
            val field = when (option.uppercaseChar()) {
                'A' -> "aAvailable"
                'B' -> "bAvailable"
                'C' -> "cAvailable"
                'D' -> "dAvailable"
                else -> return false
            }
            firestore.collection(COLLECTION_PHOTOS)
                .document(photoCode)
                .update(field, available)
                .await()
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error updating stock in Firestore: ${e.message}")
            false
        }
    }

    // Listen for live orders in real-time
    fun listenToOrders(onOrdersChanged: (List<WholesaleOrder>) -> Unit): ListenerRegistration? {
        val firestore = db ?: return null
        return firestore.collection(COLLECTION_ORDERS)
            .addSnapshotListener { snapshot, error ->
                if (error != null) {
                    Log.e(TAG, "Listen failed: ${error.message}")
                    return@addSnapshotListener
                }
                if (snapshot != null) {
                    val orders = snapshot.documents.mapNotNull { doc ->
                        try {
                            WholesaleOrder(
                                id = 0,
                                orderNumber = doc.getString("orderNumber") ?: doc.id,
                                customerCode = doc.getString("customerCode") ?: "",
                                shopName = doc.getString("shopName") ?: "",
                                cityName = doc.getString("cityName") ?: "",
                                mobileNumber = doc.getString("mobileNumber") ?: "",
                                itemsJson = doc.getString("itemsJson") ?: "[]",
                                totalItemsCount = (doc.getLong("totalItemsCount") ?: 0L).toInt(),
                                imitationStatus = doc.getString("imitationStatus") ?: "PENDING",
                                cosmeticsStatus = doc.getString("cosmeticsStatus") ?: "PENDING",
                                hairStatus = doc.getString("hairStatus") ?: "PENDING",
                                overallStatus = doc.getString("overallStatus") ?: "RECEIVED",
                                notes = doc.getString("notes") ?: "",
                                createdAt = doc.getLong("createdAt") ?: System.currentTimeMillis()
                            )
                        } catch (e: Exception) {
                            null
                        }
                    }
                    onOrdersChanged(orders)
                }
            }
    }
}
