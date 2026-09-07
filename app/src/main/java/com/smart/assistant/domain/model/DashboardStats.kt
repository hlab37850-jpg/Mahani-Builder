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
