package com.smart/assistant/data/local/database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.smart.assistant.data.local.dao.CustomerDao
import com.smart.assistant.data.local.entity.CustomerEntity
import com.smart.assistant.data.local.entity.ProductEntity
import com.smart.assistant.data.local.entity.ShopSettingsEntity

@Database(
    entities = [CustomerEntity::class, ProductEntity::class, ShopSettingsEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun customerDao(): CustomerDao
}
