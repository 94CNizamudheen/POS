package com.hashone.hashoneplat.printer

import android.content.Context
import android.os.Build
import android.util.Log

class PaxPrinterAdapter(private val context: Context) {

    companion object {
        private const val TAG = "PaxPrinter"
    }

    // Cache the availability check
    private var sdkAvailable: Boolean? = null

    fun isAvailable(): Boolean {
        // Return cached result if already checked
        sdkAvailable?.let { return it }

        // First check if it's a PAX device
        val isPaxDevice = Build.MANUFACTURER.lowercase().contains("pax") ||
                Build.BRAND.lowercase().contains("pax")

        if (!isPaxDevice) {
            sdkAvailable = false
            return false
        }

        // Verify SDK is actually accessible
        sdkAvailable = try {
            val printer = PaxPrinterService.getPrinter(context)
            printer != null
        } catch (e: Exception) {
            Log.d(TAG, "PAX SDK not available: ${e.message}")
            false
        }

        return sdkAvailable!!
    }

    fun print(data: ByteArray): PrintResult {
        return try {
            val paxPrinter = PaxPrinterService.getPrinter(context)
                ?: return PrintResult(false, "PAX printer service not available")

            paxPrinter.init()

            // PAX printers need ESC/POS sent as raw bytes, not string
            paxPrinter.printStr(String(data, Charsets.ISO_8859_1), null)
            paxPrinter.start()

            PrintResult(true)

        } catch (e: Exception) {
            Log.e(TAG, "PAX print failed", e)
            PrintResult(false, e.message)
        }
    }
}