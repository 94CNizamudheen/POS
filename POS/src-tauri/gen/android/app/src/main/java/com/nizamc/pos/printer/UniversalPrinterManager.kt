package com.hashone.hashoneplat.printer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log

class UniversalPrinterManager(private val context: Context) {

    companion object {
        private const val TAG = "UniversalPrinter"

        // Common print service actions used by various POS manufacturers
        private val COMMON_PRINT_SERVICES = listOf(
            // Sunmi
            "woyou.aidlservice.jiuiv5.IWoyouService",
            // Common Chinese POS
            "com.printer.service",
            "com.android.printer.service",
            "android.print.service",
            "com.pos.printer",
            "com.iposprinter.service",
            "net.posprinter.service",
            "com.xcheng.printerservice",
            // CloudCode / Generic
            "com.cloud.printer",
            "com.cloudcode.printer",
            "com.print.service.IPrintService",
            // Others
            "com.gprinter.service",
            "com.zcs.print"
        )

        // Common print broadcast actions
        private val PRINT_BROADCAST_ACTIONS = listOf(
            "com.pos.print.action.PRINT",
            "android.intent.action.PRINT",
            "com.printer.action.PRINT_DATA"
        )
    }

    // Vendor-specific adapters (order matters - most specific first)
    private val sunmi = SunmiPrinterAdapter(context)
    private val pax = PaxPrinterAdapter(context)
    private val cloudcode = CloudCodeAdapter(context)
    private val ingenico = IngenicoAdapter(context)
    private val verifone = VerifoneAdapter(context)
    private val newland = NewlandAdapter(context)
    private val urovo = UrovoPrinterAdapter()
    private val telpo = TelpoAdapter(context)
    private val imin = IminAdapter(context)
    private val hprt = HprtAdapter(context)

    // Generic adapters (fallbacks)
    private val intentPrinter = IntentPrinterAdapter(context)
    private val usb = UsbPrinterAdapter(context)
    private val serial = SerialPrinterAdapter(context)

    // List of all vendor adapters with their names for logging
    private data class AdapterEntry(
        val name: String,
        val isAvailable: () -> Boolean,
        val print: (ByteArray) -> PrintResult
    )

    private val vendorAdapters = listOf(
        AdapterEntry("SUNMI", sunmi::isAvailable, sunmi::print),
        AdapterEntry("PAX", pax::isAvailable, pax::print),
        AdapterEntry("CLOUDCODE", cloudcode::isAvailable, cloudcode::print),
        AdapterEntry("INGENICO", ingenico::isAvailable, ingenico::print),
        AdapterEntry("VERIFONE", verifone::isAvailable, verifone::print),
        AdapterEntry("NEWLAND", newland::isAvailable, newland::print),
        AdapterEntry("UROVO", urovo::isAvailable, urovo::print),
        AdapterEntry("TELPO", telpo::isAvailable, telpo::print),
        AdapterEntry("IMIN", imin::isAvailable, imin::print),
        AdapterEntry("HPRT", hprt::isAvailable, hprt::print),
    )

    fun isAvailable(): Boolean {
        // Check vendor adapters (catch individual failures so one bad adapter doesn't block others)
        for (adapter in vendorAdapters) {
            try {
                if (adapter.isAvailable()) {
                    Log.d(TAG, "Adapter ${adapter.name} is available")
                    return true
                }
            } catch (e: Exception) {
                Log.e(TAG, "Adapter ${adapter.name}.isAvailable() threw: ${e.message}")
            }
        }
        // Check generic adapters
        return try { intentPrinter.isAvailable() } catch (_: Exception) { false } ||
               try { usb.isAvailable() } catch (_: Exception) { false } ||
               try { serial.isAvailable() } catch (_: Exception) { false }
    }

    fun print(data: ByteArray): PrintResult {
        Log.d(TAG, "Device: ${Build.MANUFACTURER} ${Build.MODEL} (${Build.BRAND})")

        // USB FIRST: an externally connected USB printer always takes priority.
        // This allows USB printing even on devices that have a built-in adapter
        // (Urovo, CloudCode, Sunmi, etc.) — just plug in a USB printer and it works.
        try {
            if (usb.isAvailable()) {
                Log.d(TAG, "Using USB printer (priority over built-in)")
                return usb.print(data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "USB printer error: ${e.message}")
        }

        // Force Urovo (built-in) next
        try {
            if (urovo.isAvailable()) {
                Log.d(TAG, "Using UROVO printer")
                return urovo.print(data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "UROVO adapter error: ${e.message}")
        }

        // Check other vendor adapters (built-in)
        for (adapter in vendorAdapters) {
            try {
                if (adapter.name != "UROVO" && adapter.isAvailable()) {
                    Log.d(TAG, "Using ${adapter.name} printer")
                    return adapter.print(data)
                }
            } catch (e: Exception) {
                Log.e(TAG, "${adapter.name} adapter error: ${e.message}")
            }
        }

        // Intent-based printers (many Chinese POS)
        try {
            if (intentPrinter.isAvailable()) {
                Log.d(TAG, "Using INTENT printer")
                return intentPrinter.print(data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Intent printer error: ${e.message}")
        }

        // Serial fallback
        try {
            if (serial.isAvailable()) {
                Log.d(TAG, "Using SERIAL printer")
                return serial.print(data)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Serial printer error: ${e.message}")
        }

        // No printer found - provide helpful diagnostics
        val serialPorts = BuiltinPrinter.getInstance(context).getAvailableSerialPorts()
        val hasInaccessiblePorts = serialPorts.any { it.contains("w=false") }

        val errorMsg = buildString {
            append("No printer found on ${Build.MANUFACTURER} ${Build.MODEL}. ")
            if (hasInaccessiblePorts) {
                append("Serial ports exist but require system permissions. ")
            }
            append("Run getDiagnostics() to identify available print methods.")
        }

        Log.w(TAG, errorMsg)
        Log.d(TAG, "Serial ports: $serialPorts")

        return PrintResult(false, errorMsg)
    }

    /**
     * Get detailed diagnostic info about available printers
     */
    fun getDiagnostics(): Map<String, Any> {
        val diagnostics = mutableMapOf<String, Any>()

        diagnostics["device"] = mapOf(
            "manufacturer" to Build.MANUFACTURER,
            "model" to Build.MODEL,
            "brand" to Build.BRAND,
            "device" to Build.DEVICE,
            "product" to Build.PRODUCT
        )

        // Check all vendor adapters
        val adapterStatus = mutableMapOf<String, Boolean>()
        for (adapter in vendorAdapters) {
            adapterStatus[adapter.name.lowercase()] = adapter.isAvailable()
        }
        // Add generic adapters
        adapterStatus["intent"] = intentPrinter.isAvailable()
        adapterStatus["usb"] = usb.isAvailable()
        adapterStatus["serial"] = serial.isAvailable()

        diagnostics["adapters"] = adapterStatus

        // Scan for print services
        diagnostics["printServices"] = scanPrintServices()

        // Get serial ports
        diagnostics["serialPorts"] = BuiltinPrinter.getInstance(context).getAvailableSerialPorts()

        return diagnostics
    }

    /**
     * Scan device for available print-related services
     */
    private fun scanPrintServices(): List<Map<String, String>> {
        val services = mutableListOf<Map<String, String>>()

        for (action in COMMON_PRINT_SERVICES) {
            val intent = Intent(action)
            val resolved = context.packageManager.queryIntentServices(intent, PackageManager.MATCH_ALL)

            for (info in resolved) {
                services.add(mapOf(
                    "action" to action,
                    "package" to info.serviceInfo.packageName,
                    "name" to info.serviceInfo.name
                ))
            }
        }

        return services
    }

    /**
     * Get list of all services that might be print-related
     */
    fun scanAllPrintRelatedServices(): List<String> {
        val result = mutableListOf<String>()

        try {
            val packages = context.packageManager.getInstalledPackages(PackageManager.GET_SERVICES)

            for (pkg in packages) {
                pkg.services?.forEach { service ->
                    val name = service.name.lowercase()
                    if (name.contains("print") || name.contains("printer") ||
                        name.contains("pos") || name.contains("thermal")) {
                        result.add("${pkg.packageName}/${service.name}")
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to scan services", e)
        }

        return result
    }
}