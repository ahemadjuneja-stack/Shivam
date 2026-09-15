package com.example.data.local

import com.example.data.model.CatalogPhoto
import com.example.data.model.Customer
import com.example.data.model.MainCategory
import com.example.data.model.OrderCartItem
import com.example.data.model.SubCategory
import com.example.data.model.WholesaleOrder
import org.json.JSONArray
import org.json.JSONObject

object InitialData {
    val initialSubCategories = listOf(
        // Imitation
        SubCategory(id = 1, categoryId = MainCategory.IMITATION.id, name = "Earrings (झुमके/बाली)", iconName = "earrings", photoCount = 6),
        SubCategory(id = 2, categoryId = MainCategory.IMITATION.id, name = "Necklace Sets (हार सेट)", iconName = "necklace", photoCount = 4),
        SubCategory(id = 3, categoryId = MainCategory.IMITATION.id, name = "Bangles & Kada (चूड़ियां)", iconName = "bangles", photoCount = 4),
        SubCategory(id = 4, categoryId = MainCategory.IMITATION.id, name = "Finger Rings (अंगूठियां)", iconName = "rings", photoCount = 3),
        SubCategory(id = 5, categoryId = MainCategory.IMITATION.id, name = "Anklets / Payal (पायल)", iconName = "anklets", photoCount = 3),

        // Cosmetics
        SubCategory(id = 6, categoryId = MainCategory.COSMETICS.id, name = "Lipsticks & Liquid Matte", iconName = "lipstick", photoCount = 5),
        SubCategory(id = 7, categoryId = MainCategory.COSMETICS.id, name = "Nail Polish Sets (नेल पेंट)", iconName = "nailpolish", photoCount = 4),
        SubCategory(id = 8, categoryId = MainCategory.COSMETICS.id, name = "Kajal & Eye Liners", iconName = "eyeliner", photoCount = 4),
        SubCategory(id = 9, categoryId = MainCategory.COSMETICS.id, name = "Foundation & Compact", iconName = "compact", photoCount = 3),

        // Hair Accessories
        SubCategory(id = 10, categoryId = MainCategory.HAIR_ACCESSORIES.id, name = "Claw Clips & Clutches", iconName = "hairclip", photoCount = 5),
        SubCategory(id = 11, categoryId = MainCategory.HAIR_ACCESSORIES.id, name = "Scrunchies & Hair Ties", iconName = "scrunchie", photoCount = 4),
        SubCategory(id = 12, categoryId = MainCategory.HAIR_ACCESSORIES.id, name = "Hair Bands & Tiaras", iconName = "hairband", photoCount = 4),
        SubCategory(id = 13, categoryId = MainCategory.HAIR_ACCESSORIES.id, name = "Banana & Duckbill Clips", iconName = "bananaclip", photoCount = 3)
    )

    val initialPhotos = listOf(
        // Imitation - Earrings (SubCategory 1)
        CatalogPhoto(
            id = 101,
            categoryId = MainCategory.IMITATION.id,
            subCategoryId = 1,
            subCategoryName = "Earrings (झुमके/बाली)",
            photoCode = "ER-101",
            imageUri = "sample:imitation_earrings_1",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = false, // Demonstrates out of stock letter!
            dAvailable = true,
            description = "Meenakari Chandbali & Jhumka Wholesale Multi Pack"
        ),
        CatalogPhoto(
            id = 102,
            categoryId = MainCategory.IMITATION.id,
            subCategoryId = 1,
            subCategoryName = "Earrings (झुमके/बाली)",
            photoCode = "ER-102",
            imageUri = "sample:imitation_earrings_2",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "American Diamond Kundan Studs & Drops Combo"
        ),
        CatalogPhoto(
            id = 103,
            categoryId = MainCategory.IMITATION.id,
            subCategoryId = 1,
            subCategoryName = "Earrings (झुमके/बाली)",
            photoCode = "ER-103",
            imageUri = "sample:imitation_earrings_3",
            itemCount = 3,
            aAvailable = true,
            bAvailable = false, // Out of stock
            cAvailable = true,
            dAvailable = false,
            description = "Oxidized Silver Temple Jhumki Wholesale Box"
        ),
        CatalogPhoto(
            id = 104,
            categoryId = MainCategory.IMITATION.id,
            subCategoryId = 1,
            subCategoryName = "Earrings (झुमके/बाली)",
            photoCode = "ER-104",
            imageUri = "sample:imitation_earrings_4",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "Silk Thread & Pearl Tassel Danglers"
        ),

        // Imitation - Necklace (SubCategory 2)
        CatalogPhoto(
            id = 105,
            categoryId = MainCategory.IMITATION.id,
            subCategoryId = 2,
            subCategoryName = "Necklace Sets (हार सेट)",
            photoCode = "NK-201",
            imageUri = "sample:imitation_necklace_1",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "Polki Choker & Long Haar Sets with Earrings"
        ),
        CatalogPhoto(
            id = 106,
            categoryId = MainCategory.IMITATION.id,
            subCategoryId = 2,
            subCategoryName = "Necklace Sets (हार सेट)",
            photoCode = "NK-202",
            imageUri = "sample:imitation_necklace_2",
            itemCount = 3,
            aAvailable = true,
            bAvailable = false,
            cAvailable = true,
            dAvailable = false,
            description = "Matte Gold Antique Temple Bridal Choker"
        ),

        // Imitation - Bangles (SubCategory 3)
        CatalogPhoto(
            id = 107,
            categoryId = MainCategory.IMITATION.id,
            subCategoryId = 3,
            subCategoryName = "Bangles & Kada (चूड़ियां)",
            photoCode = "BG-301",
            imageUri = "sample:imitation_bangles_1",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "Brass Gold Micro-Plated Bangle Sets Size 2.4 - 2.8"
        ),

        // Cosmetics - Lipsticks (SubCategory 6)
        CatalogPhoto(
            id = 201,
            categoryId = MainCategory.COSMETICS.id,
            subCategoryId = 6,
            subCategoryName = "Lipsticks & Liquid Matte",
            photoCode = "LP-101",
            imageUri = "sample:cosmetics_lipstick_1",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = false, // Out of stock D
            description = "12-Hour Non-Transfer Liquid Lip Gloss & Matte"
        ),
        CatalogPhoto(
            id = 202,
            categoryId = MainCategory.COSMETICS.id,
            subCategoryId = 6,
            subCategoryName = "Lipsticks & Liquid Matte",
            photoCode = "LP-102",
            imageUri = "sample:cosmetics_lipstick_2",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "Velvet Crayon Lipstick Wholesale Pack"
        ),

        // Cosmetics - Nail Polish (SubCategory 7)
        CatalogPhoto(
            id = 203,
            categoryId = MainCategory.COSMETICS.id,
            subCategoryId = 7,
            subCategoryName = "Nail Polish Sets (नेल पेंट)",
            photoCode = "NP-201",
            imageUri = "sample:cosmetics_nailpolish_1",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "Gel Finish Glitter & Pastel Nail Paint Trays"
        ),

        // Cosmetics - Kajal & Eyeliner (SubCategory 8)
        CatalogPhoto(
            id = 204,
            categoryId = MainCategory.COSMETICS.id,
            subCategoryId = 8,
            subCategoryName = "Kajal & Eye Liners",
            photoCode = "EL-301",
            imageUri = "sample:cosmetics_eyeliner_1",
            itemCount = 3,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = false,
            description = "Waterproof Intense Black Pen Eyeliner & 24hr Kajal"
        ),

        // Hair Accessories - Claw Clips (SubCategory 10)
        CatalogPhoto(
            id = 301,
            categoryId = MainCategory.HAIR_ACCESSORIES.id,
            subCategoryId = 10,
            subCategoryName = "Claw Clips & Clutches",
            photoCode = "HC-101",
            imageUri = "sample:hair_clips_1",
            itemCount = 4,
            aAvailable = true,
            bAvailable = false, // Out of stock B
            cAvailable = true,
            dAvailable = true,
            description = "Korean Matte Pastel Butterfly Clutches 12 Pcs Pack"
        ),
        CatalogPhoto(
            id = 302,
            categoryId = MainCategory.HAIR_ACCESSORIES.id,
            subCategoryId = 10,
            subCategoryName = "Claw Clips & Clutches",
            photoCode = "HC-102",
            imageUri = "sample:hair_clips_2",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "Metal Gold Rhinestone Geometric Jaw Clips"
        ),

        // Hair Accessories - Scrunchies (SubCategory 11)
        CatalogPhoto(
            id = 303,
            categoryId = MainCategory.HAIR_ACCESSORIES.id,
            subCategoryId = 11,
            subCategoryName = "Scrunchies & Hair Ties",
            photoCode = "SC-201",
            imageUri = "sample:hair_scrunchie_1",
            itemCount = 4,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = true,
            description = "Pure Satin Silk Giant Scrunchies Card Box"
        ),

        // Hair Accessories - Hair Bands (SubCategory 12)
        CatalogPhoto(
            id = 304,
            categoryId = MainCategory.HAIR_ACCESSORIES.id,
            subCategoryId = 12,
            subCategoryName = "Hair Bands & Tiaras",
            photoCode = "HB-301",
            imageUri = "sample:hair_band_1",
            itemCount = 3,
            aAvailable = true,
            bAvailable = true,
            cAvailable = true,
            dAvailable = false,
            description = "Pearl Beaded Velvet Padded Hair Bands Display Box"
        )
    )

    val initialCustomers = listOf(
        Customer(
            customerCode = "CUST101",
            shopName = "Shree Radhey Fancy & Beauty",
            cityName = "Surat",
            mobileNumber = "9825102345",
            contactPerson = "Ramesh Bhai Patel",
            address = "Shop #14, Ring Road Market"
        ),
        Customer(
            customerCode = "CUST102",
            shopName = "Apsara Imitation & Cosmetics",
            cityName = "Ahmedabad",
            mobileNumber = "9898123456",
            contactPerson = "Sunil Jain",
            address = "Ratanpol Wholesale Bazar"
        ),
        Customer(
            customerCode = "CUST103",
            shopName = "Royal Hair & Accessories Wholesale",
            cityName = "Rajkot",
            mobileNumber = "9426098765",
            contactPerson = "Kiran Dave",
            address = "Dharmendra Road"
        )
    )

    fun createSampleOrderJson(): String {
        val items = listOf(
            OrderCartItem(101, "ER-101", "sample:imitation_earrings_1", MainCategory.IMITATION.id, "Earrings", "A", 24),
            OrderCartItem(101, "ER-101", "sample:imitation_earrings_1", MainCategory.IMITATION.id, "Earrings", "B", 12),
            OrderCartItem(201, "LP-101", "sample:cosmetics_lipstick_1", MainCategory.COSMETICS.id, "Lipsticks", "B", 36),
            OrderCartItem(301, "HC-101", "sample:hair_clips_1", MainCategory.HAIR_ACCESSORIES.id, "Claw Clips", "C", 48)
        )
        val array = JSONArray()
        for (item in items) {
            val obj = JSONObject().apply {
                put("photoId", item.photoId)
                put("photoCode", item.photoCode)
                put("imageUri", item.imageUri)
                put("categoryId", item.categoryId)
                put("subCategoryName", item.subCategoryName)
                put("optionLetter", item.optionLetter)
                put("quantity", item.quantity)
            }
            array.put(obj)
        }
        return array.toString()
    }

    val initialOrders = listOf(
        WholesaleOrder(
            id = 1,
            orderNumber = "ORD-8041",
            customerCode = "CUST101",
            shopName = "Shree Radhey Fancy & Beauty",
            cityName = "Surat",
            mobileNumber = "9825102345",
            itemsJson = createSampleOrderJson(),
            totalItemsCount = 120,
            imitationStatus = "DONE", // Imitation staff already packed!
            cosmeticsStatus = "DONE", // Cosmetics staff already packed!
            hairStatus = "PENDING",   // Hair accessories pending!
            overallStatus = "PARTIALLY_PACKED",
            notes = "Send via Shrinath Travel Parcel Service"
        )
    )
}
