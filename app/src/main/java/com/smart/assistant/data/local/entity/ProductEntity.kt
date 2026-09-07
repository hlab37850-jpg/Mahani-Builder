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
