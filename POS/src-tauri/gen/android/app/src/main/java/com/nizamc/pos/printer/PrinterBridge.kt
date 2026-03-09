package com.hashone.hashoneplat.printer

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.hardware.usb.UsbConstants
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONObject

class PrinterBridge(private val context: Context) {

    companion object {
        private const val TAG = "PrinterBridge"
        const val JS_INTERFACE_NAME = "BuiltinPrinter"
        private const val ACTION_USB_PERMISSION = "com.hashone.hashoneplat.USB_PERMISSION"
    }

    // ✅ UNIVERSAL PRINTER MANAGER (STEP 6)
    private val printerManager by lazy {
        UniversalPrinterManager(context)
    }

    // Keep BuiltinPrinter ONLY for detection + debug helpers
    private val builtinPrinter by lazy {
        BuiltinPrinter.getInstance(context)
    }

    private val bluetoothPrinterAdapter by lazy {
        BluetoothPrinterAdapter(context)
    }

    private val usbManager: UsbManager? by lazy {
        context.getSystemService(Context.USB_SERVICE) as? UsbManager
    }

    @Volatile
    private var permissionGranted: Boolean? = null

    // Cached USB printer info from the last USB_DEVICE_ATTACHED event.
    // TypeScript polls getPendingUsbAttach() every second and clears it after processing.
    @Volatile
    private var pendingUsbAttach: String? = null

    // -------------------- USB HOTPLUG (called from MainActivity) --------------------

    /**
     * Called by MainActivity.onNewIntent / onCreate when a USB device is attached.
     * Filters for USB Class 7 (Printer) devices and caches the info for JS polling.
     */
    fun onUsbDeviceAttached(device: UsbDevice) {
        Log.d(TAG, "USB device attached: ${device.deviceName} class=${device.deviceClass}")

        val isPrinterClass = device.deviceClass == UsbConstants.USB_CLASS_PRINTER ||
            (0 until device.interfaceCount).any { i ->
                device.getInterface(i).interfaceClass == UsbConstants.USB_CLASS_PRINTER
            }

        // Also accept known printer vendor IDs even if they don't declare USB_CLASS_PRINTER.
        // Many cheap thermal printers use vendor-specific class (0xFF) but their VID is listed
        // in device_filter.xml — so the intent firing is already a reliable printer signal.
        val isKnownPrinterVid = resolveVendorName(device.vendorId) != null

        if (!isPrinterClass && !isKnownPrinterVid) {
            Log.d(TAG, "Attached USB device (VID=${device.vendorId}) is not a printer — ignoring")
            return
        }

        Log.d(TAG, "USB printer attached: VID=${device.vendorId} PID=${device.productId} name=${device.productName}")

        val vendorName = resolveVendorName(device.vendorId) ?: device.manufacturerName ?: "USB Printer"
        val productName = device.productName?.takeIf { it.isNotBlank() } ?: "Thermal Printer"

        pendingUsbAttach = JSONObject().apply {
            put("vendorId", device.vendorId)
            put("productId", device.productId)
            put("deviceName", device.deviceName ?: "")
            put("manufacturer", vendorName)
            put("productName", productName)
            put("displayName", "$vendorName $productName")
        }.toString()
    }

    /**
     * Called by MainActivity when USB permission is granted by the user dialog.
     */
    fun onUsbPermissionGranted(device: UsbDevice) {
        Log.d(TAG, "USB permission granted for ${device.deviceName}")
        permissionGranted = true
        synchronized(this) {
            (this as Object).notifyAll()
        }
    }

    /** Maps known USB Vendor IDs to human-readable brand names. */
    private fun resolveVendorName(vendorId: Int): String? = when (vendorId) {
        0x04B8 -> "Epson"
        0x0519 -> "Star Micronics"
        0x6868 -> "XPrinter"
        0x20D1 -> "Rongta"
        0x0A5F -> "Zebra"
        0x154F -> "SNBC"
        0x28E9 -> "Sewoo"
        0x1504 -> "Bixolon"
        0x0483 -> "Custom"
        else -> null
    }

    /** JS-callable: returns the cached USB attach payload, or "null" if none pending. */
    @JavascriptInterface
    fun getPendingUsbAttach(): String {
        return pendingUsbAttach ?: "null"
    }

    /** JS-callable: clears the cached USB attach payload after TypeScript has processed it. */
    @JavascriptInterface
    fun clearPendingUsbAttach() {
        pendingUsbAttach = null
    }

    // -------------------- AVAILABILITY --------------------

    @JavascriptInterface
    fun isAvailable(): String {
        return try {
            // Check UniversalPrinterManager first
            if (printerManager.isAvailable()) {
                return "true"
            }

            // Fallback: check BuiltinPrinter detection directly
            // (covers cases where vendor adapter fails but hardware is detected)
            val detection = builtinPrinter.detectPrinter()
            if (detection.available) {
                Log.d(TAG, "isAvailable: printerManager=false but builtinPrinter detected (${detection.type})")
                return "true"
            }

            "false"
        } catch (e: Exception) {
            Log.e(TAG, "isAvailable error", e)
            // Last resort: try detection only
            try {
                builtinPrinter.detectPrinter().available.toString()
            } catch (_: Exception) {
                "false"
            }
        }
    }

    // -------------------- DETECTION --------------------

    @JavascriptInterface
    fun detect(): String {
        return try {

            val result = builtinPrinter.detectPrinter()

            JSONObject().apply {
                put("available", result.available)
                put("type", result.type)
                put("deviceName", result.deviceName ?: "")
                put("vendorId", result.vendorId ?: 0)
                put("productId", result.productId ?: 0)
                put("manufacturer", result.manufacturer)
                put("model", result.model)

                // Add reason when not available
                if (!result.available) {
                    val reason = when (result.type) {
                        "serial_no_permission" -> "Serial port found but no write permission. Device may not have a built-in printer."
                        "none" -> "No built-in printer detected on this device."
                        else -> "Printer not available."
                    }
                    put("reason", reason)
                }
            }.toString()

        } catch (e: Exception) {

            Log.e(TAG, "detect error", e)

            JSONObject().apply {
                put("available", false)
                put("error", e.message)
            }.toString()
        }
    }

    // -------------------- PRINT ESC/POS --------------------

    @JavascriptInterface
    fun printEscPos(base64Data: String): String {

        return try {

            val data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)

            // ✅ PRINT VIA UNIVERSAL ROUTER
            val result = printerManager.print(data)

            JSONObject().apply {
                put("success", result.success)
                if (!result.success) {
                    put("error", result.error)
                }
            }.toString()

        } catch (e: Exception) {

            Log.e(TAG, "printEscPos error", e)

            JSONObject().apply {
                put("success", false)
                put("error", e.message ?: "Print failed")
            }.toString()
        }
    }

    // -------------------- TEST PRINT --------------------

    @JavascriptInterface
    fun printTest(): String {

        return try {

            // Build a test page ESC/POS payload
            val testData = buildTestPageEscPos()

            // Route through UniversalPrinterManager (same path as printEscPos)
            // This ensures vendor adapters (CloudCode, Urovo, etc.) are used
            val result = printerManager.print(testData)

            JSONObject().apply {
                put("success", result.success)
                if (!result.success) {
                    put("error", result.error)
                }
            }.toString()

        } catch (e: Exception) {

            Log.e(TAG, "printTest error", e)

            JSONObject().apply {
                put("success", false)
                put("error", e.message)
            }.toString()
        }
    }

    /**
     * Build ESC/POS test page data
     */
    private fun buildTestPageEscPos(): ByteArray {
        val cmd = mutableListOf<Byte>()

        // Initialize printer
        cmd.addAll(byteArrayOf(0x1B, 0x40).toList())
        // Center align
        cmd.addAll(byteArrayOf(0x1B, 0x61, 0x01).toList())
        // Double height + double width
        cmd.addAll(byteArrayOf(0x1D, 0x21, 0x33).toList())

        cmd.addAll("TEST PRINT".toByteArray().toList())
        cmd.add(0x0A)

        // Normal size
        cmd.addAll(byteArrayOf(0x1D, 0x21, 0x00).toList())
        cmd.add(0x0A)

        cmd.addAll("Printer is working!".toByteArray().toList())
        cmd.add(0x0A)

        cmd.addAll("Device: ${Build.MANUFACTURER} ${Build.MODEL}".toByteArray().toList())
        cmd.add(0x0A)

        cmd.add(0x0A)
        cmd.add(0x0A)

        // Cut paper
        cmd.addAll(byteArrayOf(0x1D, 0x56, 0x00).toList())

        return cmd.toByteArray()
    }

    // -------------------- USB PERMISSION CHECK --------------------

    @JavascriptInterface
    fun hasPermission(): String {

        return try {

            val detection = builtinPrinter.detectPrinter()

            // SERIAL printers don't need permission
            if (detection.type == "serial_builtin") {
                return JSONObject().apply {
                    put("granted", true)
                    put("type", "serial")
                }.toString()
            }

            val manager = usbManager ?: return JSONObject().apply {
                put("granted", false)
            }.toString()

            for ((_, device) in manager.deviceList) {
                if (manager.hasPermission(device)) {
                    return JSONObject().apply {
                        put("granted", true)
                        put("deviceName", device.deviceName)
                    }.toString()
                }
            }

            JSONObject().apply {
                put("granted", false)
            }.toString()

        } catch (e: Exception) {

            Log.e(TAG, "hasPermission error", e)

            JSONObject().apply {
                put("granted", false)
                put("error", e.message)
            }.toString()
        }
    }

    // -------------------- REQUEST PERMISSION --------------------

    @JavascriptInterface
    fun requestPermission(): String {

        return try {

            val detection = builtinPrinter.detectPrinter()

            // SERIAL printer → skip permission
            if (detection.type == "serial_builtin") {
                return JSONObject().apply {
                    put("success", true)
                    put("type", "serial")
                }.toString()
            }

            val manager = usbManager ?: return JSONObject().apply {
                put("success", false)
                put("error", "USB Manager not available")
            }.toString()

            val devices = manager.deviceList

            // Find a USB device that is a printer: class 7 OR known printer vendor ID
            val printerDevice = devices.values.firstOrNull { device ->
                device.deviceClass == UsbConstants.USB_CLASS_PRINTER ||
                    (0 until device.interfaceCount).any { i ->
                        device.getInterface(i).interfaceClass == UsbConstants.USB_CLASS_PRINTER
                    } ||
                    resolveVendorName(device.vendorId) != null
            } ?: return JSONObject().apply {
                put("success", false)
                put("error", "No USB printer found")
            }.toString()

            // Already allowed
            if (manager.hasPermission(printerDevice)) {
                return JSONObject().apply {
                    put("success", true)
                    put("alreadyGranted", true)
                }.toString()
            }

            permissionGranted = null

            val flags =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0

            val permissionIntent = PendingIntent.getBroadcast(
                context,
                0,
                Intent(ACTION_USB_PERMISSION),
                flags
            )

            manager.requestPermission(printerDevice, permissionIntent)

            synchronized(this) {

                var waited = 0L
                val timeout = 15000L

                while (permissionGranted == null && waited < timeout) {
                    try {
                        (this as Object).wait(500)
                        waited += 500
                    } catch (_: InterruptedException) {
                    }
                }
            }

            val granted = permissionGranted == true

            JSONObject().apply {
                put("success", granted)
                if (!granted) {
                    put("error", "USB permission denied")
                }
            }.toString()

        } catch (e: Exception) {

            Log.e(TAG, "requestPermission error", e)

            JSONObject().apply {
                put("success", false)
                put("error", e.message ?: "Permission failed")
            }.toString()
        }
    }

    // -------------------- DEBUG HELPERS --------------------

    @JavascriptInterface
    fun listSerialPorts(): String {

        return try {

            val ports = builtinPrinter.getAvailableSerialPorts()

            JSONObject().apply {
                put("count", ports.size)
                put("ports", ports)
            }.toString()

        } catch (e: Exception) {

            JSONObject().apply {
                put("count", 0)
                put("ports", emptyList<String>())
                put("error", e.message)
            }.toString()
        }
    }

    @JavascriptInterface
    fun listUsbDevices(): String {

        return try {

            val manager = usbManager ?: return JSONObject().apply {
                put("count", 0)
                put("devices", emptyList<String>())
            }.toString()

            val devices = manager.deviceList.values.map { d ->
                val ifaceClasses = (0 until d.interfaceCount)
                    .map { d.getInterface(it).interfaceClass }
                    .joinToString(",")
                "VID=${d.vendorId} PID=${d.productId} devClass=${d.deviceClass} ifaceClasses=[$ifaceClasses] name=${d.productName ?: d.deviceName}"
            }

            JSONObject().apply {
                put("count", devices.size)
                put("devices", devices)
            }.toString()

        } catch (e: Exception) {

            JSONObject().apply {
                put("count", 0)
                put("devices", emptyList<String>())
                put("error", e.message)
            }.toString()
        }
    }

    /**
     * Get full diagnostic info - use this to identify how to print on unknown devices
     */
    @JavascriptInterface
    fun getDiagnostics(): String {
        return try {
            val diagnostics = printerManager.getDiagnostics()
            val json = JSONObject()

            // Device info
            val deviceInfo = diagnostics["device"] as? Map<*, *>
            json.put("device", JSONObject().apply {
                put("manufacturer", deviceInfo?.get("manufacturer") ?: "unknown")
                put("model", deviceInfo?.get("model") ?: "unknown")
                put("brand", deviceInfo?.get("brand") ?: "unknown")
                put("device", deviceInfo?.get("device") ?: "unknown")
                put("product", deviceInfo?.get("product") ?: "unknown")
            })

            // Adapter status
            val adapters = diagnostics["adapters"] as? Map<*, *>
            json.put("adapters", JSONObject().apply {
                put("sunmi", adapters?.get("sunmi") ?: false)
                put("pax", adapters?.get("pax") ?: false)
                put("intent", adapters?.get("intent") ?: false)
                put("usb", adapters?.get("usb") ?: false)
                put("serial", adapters?.get("serial") ?: false)
            })

            // Print services found
            val services = diagnostics["printServices"] as? List<*> ?: emptyList<Any>()
            json.put("printServices", org.json.JSONArray(services.map { svc ->
                if (svc is Map<*, *>) {
                    JSONObject().apply {
                        put("action", svc["action"])
                        put("package", svc["package"])
                        put("name", svc["name"])
                    }
                } else {
                    svc.toString()
                }
            }))

            // Serial ports
            val ports = diagnostics["serialPorts"] as? List<*> ?: emptyList<Any>()
            json.put("serialPorts", org.json.JSONArray(ports))

            json.toString()

        } catch (e: Exception) {
            Log.e(TAG, "getDiagnostics error", e)
            JSONObject().apply {
                put("error", e.message)
            }.toString()
        }
    }

    /**
     * Scan for ALL print-related services on the device
     * Use this to find vendor-specific print services
     */
    @JavascriptInterface
    fun scanPrintServices(): String {
        return try {
            val services = printerManager.scanAllPrintRelatedServices()
            val intentPrinter = IntentPrinterAdapter(context)
            val intentServices = intentPrinter.scanAvailableServices()

            JSONObject().apply {
                put("allPrintRelated", org.json.JSONArray(services))
                put("intentServices", org.json.JSONArray(intentServices))
                put("count", services.size + intentServices.size)
            }.toString()

        } catch (e: Exception) {
            Log.e(TAG, "scanPrintServices error", e)
            JSONObject().apply {
                put("error", e.message)
            }.toString()
        }
    }

    // -------------------- BLUETOOTH --------------------

    /**
     * Returns a JSON array of all paired Bluetooth devices.
     * The user must have already paired the printer via Android Settings → Bluetooth.
     * Example result: [{"name":"XPrinter-80","address":"AA:BB:CC:DD:EE:FF"}, ...]
     */
    @JavascriptInterface
    fun scanBluetoothDevices(): String {
        return try {
            val devices = bluetoothPrinterAdapter.getPairedDevices()
            val array = org.json.JSONArray()
            for (device in devices) {
                array.put(JSONObject().apply {
                    put("name", device.name)
                    put("address", device.address)
                })
            }
            JSONObject().apply {
                put("devices", array)
            }.toString()
        } catch (e: SecurityException) {
            Log.e(TAG, "scanBluetoothDevices: permission denied", e)
            JSONObject().apply {
                put("error", "permission_denied")
            }.toString()
        } catch (e: Exception) {
            Log.e(TAG, "scanBluetoothDevices error", e)
            JSONObject().apply {
                put("error", e.message ?: "unknown")
            }.toString()
        }
    }

    /**
     * Test RFCOMM connection to a Bluetooth printer without printing.
     * Returns {"success":true} or {"success":false,"error":"..."}
     */
    @JavascriptInterface
    fun testBluetoothConnection(address: String): String {
        return try {
            val result = bluetoothPrinterAdapter.testConnection(address)
            JSONObject().apply {
                put("success", result.success)
                if (!result.success) put("error", result.error)
            }.toString()
        } catch (e: Exception) {
            Log.e(TAG, "testBluetoothConnection error", e)
            JSONObject().apply {
                put("success", false)
                put("error", e.message ?: "Connection test failed")
            }.toString()
        }
    }

    /**
     * Print ESC/POS data to a specific Bluetooth printer by MAC address.
     * @param address  MAC address of the paired printer (e.g. "AA:BB:CC:DD:EE:FF")
     * @param base64Data  Base64-encoded ESC/POS byte data
     */
    @JavascriptInterface
    fun printEscPosBluetooth(address: String, base64Data: String): String {
        return try {
            val data = android.util.Base64.decode(base64Data, android.util.Base64.DEFAULT)
            val result = bluetoothPrinterAdapter.print(address, data)
            JSONObject().apply {
                put("success", result.success)
                if (!result.success) put("error", result.error)
            }.toString()
        } catch (e: Exception) {
            Log.e(TAG, "printEscPosBluetooth error", e)
            JSONObject().apply {
                put("success", false)
                put("error", e.message ?: "Bluetooth print failed")
            }.toString()
        }
    }

    /**
     * Cleanup all printer resources. Call this when app is being destroyed.
     */
    fun cleanup() {
        Log.d(TAG, "PrinterBridge cleanup")
        builtinPrinter.cleanup()
    }
}