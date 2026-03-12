package com.nizamc.pos.printer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.IBinder
import android.util.Base64
import android.util.Log
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Adapter for POS devices that use Intent/Service-based printing
 * Supports many Chinese POS manufacturers that don't have official SDKs
 */
class IntentPrinterAdapter(private val context: Context) {

    companion object {
        private const val TAG = "IntentPrinter"

        // Common print service patterns found on various POS devices
        private val PRINT_SERVICE_PATTERNS = listOf(
            // IPosPrinter (common on many devices)
            ServicePattern(
                action = "com.iposprinter.iposprinterservice",
                packageName = "com.iposprinter.iposprinterservice",
                className = "com.iposprinter.iposprinterservice.IPosPrinterService"
            ),
            // XPrinter / Generic ESC/POS service
            ServicePattern(
                action = "com.xcheng.printerservice.IPrinterService",
                packageName = "com.xcheng.printerservice",
                className = "com.xcheng.printerservice.PrinterService"
            ),
            // GPrinter
            ServicePattern(
                action = "com.gprinter.service.GpPrintService",
                packageName = "com.gprinter.service",
                className = "com.gprinter.service.GpPrintService"
            ),
            // Generic POS printer service
            ServicePattern(
                action = "android.hardware.usb.action.USB_DEVICE_ATTACHED",
                packageName = null,
                className = null
            )
        )

        // Print broadcast actions
        private val PRINT_BROADCASTS = listOf(
            "com.pos.print.action.PRINT_ESCPOS",
            "com.android.print.action.PRINT_RAW",
            "com.printer.print.action.RAW"
        )
    }

    data class ServicePattern(
        val action: String,
        val packageName: String?,
        val className: String?
    )

    private var foundService: ServicePattern? = null

    fun isAvailable(): Boolean {
        // Only check for actual print services - broadcasts are unreliable
        for (pattern in PRINT_SERVICE_PATTERNS) {
            if (isServiceAvailable(pattern)) {
                foundService = pattern
                Log.d(TAG, "Found print service: ${pattern.action}")
                return true
            }
        }

        // Don't rely on broadcast receivers - they can't be verified
        return false
    }

    private fun isServiceAvailable(pattern: ServicePattern): Boolean {
        return try {
            val intent = Intent(pattern.action)
            if (pattern.packageName != null) {
                intent.setPackage(pattern.packageName)
            }
            val services = context.packageManager.queryIntentServices(intent, PackageManager.MATCH_ALL)
            services.isNotEmpty()
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        // Try bound service first
        val serviceResult = tryPrintViaService(data)
        if (serviceResult.success) return serviceResult

        // Try broadcast
        val broadcastResult = tryPrintViaBroadcast(data)
        if (broadcastResult.success) return broadcastResult

        // Try content provider (some devices use this)
        val providerResult = tryPrintViaContentProvider(data)
        if (providerResult.success) return providerResult

        return PrintResult(false, "Intent-based printing not available on this device")
    }

    private fun tryPrintViaService(data: ByteArray): PrintResult {
        val service = foundService ?: return PrintResult(false, "No service found")

        return try {
            val intent = Intent(service.action)
            if (service.packageName != null) {
                intent.setPackage(service.packageName)
            }

            // Add print data
            intent.putExtra("print_data", data)
            intent.putExtra("data", data)
            intent.putExtra("escpos", data)
            intent.putExtra("raw", data)
            intent.putExtra("content", Base64.encodeToString(data, Base64.NO_WRAP))

            // Try to start service
            val result = context.startService(intent)
            if (result != null) {
                Log.d(TAG, "Print service started: $result")
                PrintResult(true)
            } else {
                PrintResult(false, "Failed to start print service")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Service print failed", e)
            PrintResult(false, e.message)
        }
    }

    private fun tryPrintViaBroadcast(data: ByteArray): PrintResult {
        // Broadcasts cannot be verified - don't claim success
        // We send them as a side-effect but don't return success
        try {
            for (action in PRINT_BROADCASTS) {
                val intent = Intent(action)
                intent.putExtra("print_data", data)
                intent.putExtra("data", data)
                intent.putExtra("escpos", data)
                intent.putExtra("raw_data", data)
                intent.putExtra("content", Base64.encodeToString(data, Base64.NO_WRAP))

                context.sendBroadcast(intent)
                Log.d(TAG, "Sent print broadcast (unverified): $action")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Broadcast send failed", e)
        }

        // Never return success for broadcasts - we can't verify them
        return PrintResult(false, "Broadcast printing cannot be verified")
    }

    private fun tryPrintViaContentProvider(data: ByteArray): PrintResult {
        // Some POS devices use content providers for printing
        val printUris = listOf(
            "content://com.printer.provider/print",
            "content://com.pos.printer/raw",
            "content://com.iposprinter/print"
        )

        for (uri in printUris) {
            try {
                val contentValues = android.content.ContentValues()
                contentValues.put("data", data)
                contentValues.put("raw", Base64.encodeToString(data, Base64.NO_WRAP))

                val result = context.contentResolver.insert(android.net.Uri.parse(uri), contentValues)
                if (result != null) {
                    Log.d(TAG, "Content provider print succeeded: $uri")
                    return PrintResult(true)
                }
            } catch (e: Exception) {
                Log.d(TAG, "Content provider $uri not available: ${e.message}")
            }
        }

        return PrintResult(false, "No print content provider found")
    }

    /**
     * Scan device for any print-related services
     */
    fun scanAvailableServices(): List<String> {
        val found = mutableListOf<String>()

        try {
            val packages = context.packageManager.getInstalledPackages(PackageManager.GET_SERVICES)

            for (pkg in packages) {
                pkg.services?.forEach { service ->
                    val name = service.name.lowercase()
                    val pkgName = pkg.packageName.lowercase()

                    if (name.contains("print") || name.contains("printer") ||
                        name.contains("escpos") || name.contains("thermal") ||
                        pkgName.contains("print") || pkgName.contains("printer")) {
                        found.add("${pkg.packageName}/${service.name}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to scan services", e)
        }

        return found
    }
}