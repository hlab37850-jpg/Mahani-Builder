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
