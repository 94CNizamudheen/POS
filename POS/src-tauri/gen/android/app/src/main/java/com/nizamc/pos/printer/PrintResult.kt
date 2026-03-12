package com.nizamc.pos.printer

data class PrintResult(
    val success: Boolean,
    val error: String? = null
)