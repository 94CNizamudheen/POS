package com.hashone.hashoneplat.printer

import android.util.Log

class UrovoPrinterAdapter {

    companion object {
        private const val TAG = "UrovoPrinter"
    }

    private val PRNSTS_OK = 0

    fun isAvailable(): Boolean {
        val manufacturer = android.os.Build.MANUFACTURER.lowercase()
        val model = android.os.Build.MODEL.lowercase()

        val isUrovo = manufacturer.contains("urovo") ||
                      manufacturer.contains("ubx") ||
                      model.contains("urovo")

        if (!isUrovo) return false

        return try {
            Class.forName("android.device.PrinterManager")
            true
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {

        return try {

            val printerClass = Class.forName("android.device.PrinterManager")
            val printer = printerClass.getConstructor().newInstance()

            // 1️⃣ Open printer
            val openMethod = printerClass.getMethod("open")
            val openResult = openMethod.invoke(printer) as Int

            if (openResult != PRNSTS_OK) {
                return PrintResult(false, "Urovo printer open failed: $openResult")
            }

            // 2️⃣ Setup page (58mm = 384px)
            val setupPage = printerClass.getMethod(
                "setupPage",
                Int::class.java,
                Int::class.java
            )

            setupPage.invoke(printer, 384, -1)

            // 3️⃣ Convert ESC/POS bytes → text (TEMP SOLUTION)
            val text = String(data)

            val drawText = printerClass.getMethod(
                "drawText",
                String::class.java,
                Int::class.java,
                Int::class.java,
                String::class.java,
                Int::class.java,
                Boolean::class.java,
                Boolean::class.java,
                Int::class.java
            )

            // Print at top left
            drawText.invoke(printer, text, 0, 0, "", 24, false, false, 0)

            // 4️⃣ Print page
            val printPage = printerClass.getMethod("printPage", Int::class.java)
            printPage.invoke(printer, 0)

            // 5️⃣ Close printer
            val closeMethod = printerClass.getMethod("close")
            closeMethod.invoke(printer)

            PrintResult(true)

        } catch (e: Exception) {
            Log.e(TAG, "Urovo print error", e)
            PrintResult(false, e.message ?: "Urovo print failed")
        }
    }
}