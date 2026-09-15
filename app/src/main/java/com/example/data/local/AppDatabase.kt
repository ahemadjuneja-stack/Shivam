package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.example.data.model.CatalogPhoto
import com.example.data.model.Customer
import com.example.data.model.SubCategory
import com.example.data.model.WholesaleOrder

@Database(
    entities = [
        SubCategory::class,
        CatalogPhoto::class,
        Customer::class,
        WholesaleOrder::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun subCategoryDao(): SubCategoryDao
    abstract fun catalogPhotoDao(): CatalogPhotoDao
    abstract fun customerDao(): CustomerDao
    abstract fun orderDao(): OrderDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "wholesale_catalog.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
