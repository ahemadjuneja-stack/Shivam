package com.example

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.example.data.local.AppDatabase
import com.example.data.model.CatalogPhoto
import com.example.data.model.Customer
import com.example.data.model.OrderCartItem
import com.example.data.repository.WholesaleRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [36])
class ExampleRobolectricTest {

    private lateinit var database: AppDatabase
    private lateinit var repository: WholesaleRepository

    @Before
    fun setup() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        database = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        repository = WholesaleRepository(database)
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun `read string from context`() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        val appName = context.getString(R.string.app_name)
        assertEquals("SHIVAM", appName)
    }

    @Test
    fun `test abcd stock toggle and availability`() = runBlocking {
        // Initial setup with 4 options
        val photo = CatalogPhoto(
            id = 100,
            categoryId = "imitation",
            subCategoryId = 1,
            subCategoryName = "Earrings",
            photoCode = "ER-999",
            imageUri = "sample_photo",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true
        )
        repository.addPhoto(photo)

        // Disable A and B, keep C and D open
        repository.updateStock(100, a = false, b = false, c = true, d = true)

        val updatedPhotos = repository.getAllPhotos().first()
        val updated = updatedPhotos.first { it.id == 100L }

        assertFalse(updated.isOptionAvailable('A'))
        assertFalse(updated.isOptionAvailable('B'))
        assertTrue(updated.isOptionAvailable('C'))
        assertTrue(updated.isOptionAvailable('D'))
    }

    @Test
    fun `test customer order placement and staff department packing status`() = runBlocking {
        val customer = Customer(
            customerCode = "CUST101",
            shopName = "Shree Radhey Fancy",
            cityName = "Surat",
            mobileNumber = "9825102345"
        )
        repository.registerCustomer(customer)

        val items = listOf(
            OrderCartItem(
                photoId = 1,
                photoCode = "ER-101",
                imageUri = "sample_er",
                categoryId = "imitation",
                subCategoryName = "Earrings",
                optionLetter = "B",
                quantity = 24
            ),
            OrderCartItem(
                photoId = 2,
                photoCode = "LP-101",
                imageUri = "sample_lp",
                categoryId = "cosmetics",
                subCategoryName = "Liquid Lipstick",
                optionLetter = "A",
                quantity = 12
            )
        )

        repository.placeOrder(customer, items, "Via Shrinath Cargo")

        val orders = repository.getAllOrders().first()
        assertEquals(1, orders.size)
        val order = orders.first()
        assertEquals("PENDING", order.imitationStatus)
        assertEquals("PENDING", order.cosmeticsStatus)
        assertEquals("NOT_APPLICABLE", order.hairStatus) // No hair accessories ordered

        // Imitation staff packs items
        repository.updateDepartmentPacking(order, "imitation", true)

        val refreshedOrders = repository.getAllOrders().first()
        val refreshed = refreshedOrders.first()
        assertEquals("DONE", refreshed.imitationStatus)
        assertEquals("PENDING", refreshed.cosmeticsStatus)
        assertEquals("PARTIALLY_PACKED", refreshed.overallStatus)

        // Cosmetics staff packs items
        repository.updateDepartmentPacking(refreshed, "cosmetics", true)

        val finalOrders = repository.getAllOrders().first()
        val finalOrder = finalOrders.first()
        assertEquals("DONE", finalOrder.cosmeticsStatus)
        assertEquals("READY_TO_SHIP", finalOrder.overallStatus)
    }
}

