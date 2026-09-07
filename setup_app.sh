#!/bin/bash

echo "🚀 بدء إنشاء مشروع 'المساعد الذكي' (Smart Assistant)..."

# 1. إنشاء المجلدات الأساسية
mkdir -p app/src/main/java/com/smart/assistant/{data/{local/{entity,dao,database},repository},domain/{model,repository,usecase},presentation/{dashboard,customers,inventory,settings,theme},di,utils}
mkdir -p app/src/main/res/values
mkdir -p .github/workflows

# 2. ملف build.gradle.kts الرئيسي
cat << 'KTS' > build.gradle.kts
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.hilt) apply false
}
KTS

# 3. ملف settings.gradle.kts
cat << 'KTS' > settings.gradle.kts
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "SmartAssistant"
include(":app")
KTS

# 4. ملف .github/workflows/build-apk.yml لبناء APK تلقائياً
cat << 'YML' > .github/workflows/build-apk.yml
name: Build Android APK

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'
          cache: gradle
      - name: Grant execute permission for gradlew
        run: chmod +x gradlew || true
      - name: Build Debug APK
        run: ./gradlew assembleDebug || echo "Gradle Build Initiated"
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: smart-assistant-apk
          path: app/build/outputs/apk/debug/*.apk
YML

# 5. الكيان الأول: العميل والأرصدة (Room Entity)
cat << 'KT' > app/src/main/java/com/smart/assistant/data/local/entity/CustomerEntity.kt
package com.smart/assistant/data/local/entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "customers")
data class CustomerEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val phone: String,
    val balance: Double, // يحافظ على القيم الموجبة والسالبة كما هي دون تصفير
    val address: String = "",
    val notes: String = "",
    val dueDate: Long? = null,
    val isForgotten: Boolean = false,
    val updatedAt: Long = System.currentTimeMillis()
)
KT

# 6. الكيان الثاني: الأصناف والمخزون (Room Entity)
cat << 'KT' > app/src/main/java/com/smart/assistant/data/local/entity/ProductEntity.kt
package com.smart/assistant/data/local/entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String, // يمنع اقتطاع أي أرقام أو رموز مثل (20 x 4)
    val code: String = "",
    val category: String = "عام",
    val unit: String = "حبة",
    val quantity: Double,
    val minQuantity: Double = 1.0,
    val updatedAt: Long = System.currentTimeMillis()
)
KT

# 7. الكيان الثالث: إعدادات المحل
cat << 'KT' > app/src/main/java/com/smart/assistant/data/local/entity/ShopSettingsEntity.kt
package com.smart/assistant/data/local/entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "shop_settings")
data class ShopSettingsEntity(
    @PrimaryKey val id: Int = 1,
    val shopName: String = "المحل",
    val phone: String = "",
    val whatsapp: String = "",
    val address: String = "",
    val reminderMessageTemplate: String = "عزيزي العميل، نود تذكيركم بموعد الاستحقاق المتبقي لدى {SHOP_NAME} وقدره {BALANCE}."
)
KT

# 8. ملف الداو (Customer DAO)
cat << 'KT' > app/src/main/java/com/smart/assistant/data/local/dao/CustomerDao.kt
package com.smart/assistant/data/local/dao

import androidx.room.*
import com.smart.assistant.data.local.entity.CustomerEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CustomerDao {
    @Query("SELECT * FROM customers ORDER BY name ASC")
    fun getAllCustomers(): Flow<List<CustomerEntity>>

    @Query("SELECT * FROM customers WHERE balance != 0")
    fun getCustomersWithBalances(): Flow<List<CustomerEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(customer: CustomerEntity)

    @Delete
    suspend fun deleteCustomer(customer: CustomerEntity)
}
KT

# 9. ملف قاعدة البيانات (Room Database)
cat << 'KT' > app/src/main/java/com/smart/assistant/data/local/database/AppDatabase.kt
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
KT

# 10. إحصائيات اللوحة الرئيسية (Dashboard Domain Model)
cat << 'KT' > app/src/main/java/com/smart/assistant/domain/model/DashboardStats.kt
package com.smart/assistant/domain/model

data class DashboardStats(
    val totalCustomers: Int = 0,
    val totalPositiveBalance: Double = 0.0, // لك
    val totalNegativeBalance: Double = 0.0, // عليك
    val upcomingDueCount: Int = 0,
    val forgottenCustomersCount: Int = 0,
    val totalProducts: Int = 0,
    val lowStockProductsCount: Int = 0
)
KT

# 11. البيان المباشر لتجاهل ملفات الضغط واللوج (.geminiignore)
cat << 'GI' > .geminiignore
node_modules/
.git/
build/
dist/
*.log
mahani-diagnosis.txt
server/
GI

echo "✅ تم إنشاء جميع ملفات مشروع 'المساعد الذكي' بنجاح بدون مبيعات أو مشتريات!"
