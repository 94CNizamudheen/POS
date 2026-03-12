package com.nizamc.pos.printer

import android.content.Context
import android.hardware.usb.*
import android.os.Build
import android.util.Log
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.IOException

class BuiltinPrinter(private val context: Context) {

    companion object {
        private const val TAG = "BuiltinPrinter"
        private const val USB_CLASS_PRINTER = 7

        // ESC/POS status request command
        private val DLE_EOT_STATUS = byteArrayOf(0x10, 0x04, 0x01) // Real-time status request

        private val SERIAL_PRINTER_PATHS = listOf(
            "/dev/ttyS1", "/dev/ttyS2", "/dev/ttyS3", "/dev/ttyS0",
            "/dev/ttyMT1", "/dev/ttyMT0",
            "/dev/ttyHSL1", "/dev/ttyHSL0",
            "/dev/ttyUSB0", "/dev/ttyACM0",
            "/dev/ttySAC1", "/dev/ttySAC0",
            "/dev/ttyAMA0", "/dev/ttyGS0",
            "/dev/printer", "/dev/thermal",
            "/dev/usb/lp0"
        )

        @Volatile
        private var instance: BuiltinPrinter? = null

        fun getInstance(context: Context): BuiltinPrinter {
            return instance ?: synchronized(this) {
                instance ?: BuiltinPrinter(context.applicationContext).also { instance = it }
            }
        }

        /** Maps known USB Vendor IDs to human-readable brand names. */
        fun resolveVendorName(vendorId: Int): String? = when (vendorId) {
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
    }

    enum class PrinterType {
        NONE, USB, SERIAL
    }

    private var usbManager: UsbManager? =
        context.getSystemService(Context.USB_SERVICE) as? UsbManager

    private var usbConnection: UsbDeviceConnection? = null
    private var usbEndpoint: UsbEndpoint? = null

    private var serialPortPath: String? = null
    private var detectedPrinterType: PrinterType = PrinterType.NONE

    // -------------------- DETECTION --------------------

    fun detectPrinter(): PrinterDetectionResult {
        Log.d(TAG, "Detecting built-in printer...")
        Log.d(TAG, "Device: ${Build.MANUFACTURER} ${Build.MODEL}")

        // ===== USB EXTERNAL PRINTER (CHECKED FIRST) =====
        // An externally connected USB printer takes priority over any built-in adapter.
        // This allows USB printing on devices that also have a built-in printer
        // (e.g. Urovo, CloudCode, Sunmi terminals with a USB port).
        val usb = findUsbPrinter()
        if (usb != null) {
            detectedPrinterType = PrinterType.USB

            // Use the printer's own USB descriptor names (not the Android device's Build info)
            val printerManufacturer = usb.manufacturerName?.takeIf { it.isNotBlank() }
                ?: resolveVendorName(usb.vendorId)
                ?: Build.MANUFACTURER
            val printerModel = usb.productName?.takeIf { it.isNotBlank() }
                ?: "USB Printer"

            return PrinterDetectionResult(
                available = true,
                type = "usb_builtin",
                deviceName = usb.deviceName,
                vendorId = usb.vendorId,
                productId = usb.productId,
                manufacturer = printerManufacturer,
                model = printerModel
            )
        }

        // ===== UROVO BUILTIN CHECK =====
        val manufacturer = Build.MANUFACTURER.lowercase()
        val model = Build.MODEL.lowercase()

        val isUrovo = manufacturer.contains("urovo") ||
                      manufacturer.contains("ubx") ||
                      model.contains("urovo")

        if (isUrovo) {
            try {
                Class.forName("android.device.PrinterManager")
                Log.d(TAG, "Urovo built-in printer detected")
                detectedPrinterType = PrinterType.NONE
                return PrinterDetectionResult(
                    available = true,
                    type = "urovo_builtin",
                    deviceName = "Urovo Inbuilt Printer",
                    vendorId = null,
                    productId = null,
                    manufacturer = Build.MANUFACTURER,
                    model = Build.MODEL
                )
            } catch (e: Exception) {
                Log.w(TAG, "Urovo PrinterManager not found", e)
            }
        }

        // ===== CLOUDCODE (Hainan) BUILTIN CHECK =====
        val brand = Build.BRAND.lowercase()
        val isCloudCode = manufacturer.contains("cloude") ||
                          manufacturer.contains("cloudcode") ||
                          manufacturer.contains("yunma") ||
                          brand.contains("cloude") ||
                          brand.contains("cloudcode") ||
                          brand.contains("yunma") ||
                          model.contains("cp50") ||
                          model.contains("cp-50") ||
                          model.contains("cp12") ||
                          model.contains("cp20") ||
                          model.contains("cm20")

        if (isCloudCode) {
            Log.d(TAG, "CloudCode device detected, built-in printer assumed available")
            detectedPrinterType = PrinterType.NONE
            return PrinterDetectionResult(
                available = true,
                type = "cloudcode_builtin",
                deviceName = "CloudCode Inbuilt Printer",
                vendorId = null,
                productId = null,
                manufacturer = Build.MANUFACTURER,
                model = Build.MODEL
            )
        }

        // SERIAL fallback (only if we have write access)
        val serial = findSerialPrinter()
        if (serial != null) {
            serialPortPath = serial
            detectedPrinterType = PrinterType.SERIAL

            return PrinterDetectionResult(
                available = true,
                type = "serial_builtin",
                deviceName = serial,
                vendorId = 0,
                productId = 0,
                manufacturer = Build.MANUFACTURER,
                model = Build.MODEL
            )
        }

        // Check if serial ports exist but aren't accessible (for better diagnostics)
        val inaccessiblePorts = findInaccessibleSerialPorts()
        detectedPrinterType = PrinterType.NONE

        return PrinterDetectionResult(
            available = false,
            type = if (inaccessiblePorts.isNotEmpty()) "serial_no_permission" else "none",
            deviceName = inaccessiblePorts.firstOrNull(),
            vendorId = null,
            productId = null,
            manufacturer = Build.MANUFACTURER,
            model = Build.MODEL
        )
    }

    /**
     * Find serial ports that exist but we don't have permission to access
     */
    private fun findInaccessibleSerialPorts(): List<String> {
        val ports = mutableListOf<String>()
        for (path in SERIAL_PRINTER_PATHS) {
            val file = File(path)
            if (file.exists() && !file.canWrite()) {
                ports.add(path)
            }
        }
        return ports
    }

    fun isAvailable(): Boolean {
        if (findUsbPrinter() != null) return true
        if (findSerialPrinter() != null) return true
        return false
    }

    // -------------------- SERIAL --------------------

    private fun findSerialPrinter(): String? {
        for (path in SERIAL_PRINTER_PATHS) {
            val file = File(path)
            if (file.exists()) {
                val canRead = file.canRead()
                val canWrite = file.canWrite()
                Log.d(TAG, "Found serial device: $path r=$canRead w=$canWrite")

                // Only return if we have write permission - without it, printing is impossible
                if (canWrite) {
                    return path
                } else {
                    Log.d(TAG, "Skipping $path - no write permission")
                }
            }
        }
        return null
    }

    fun getAvailableSerialPorts(): List<String> {
        val ports = mutableListOf<String>()
        for (path in SERIAL_PRINTER_PATHS) {
            val file = File(path)
            if (file.exists()) {
                ports.add("$path (r=${file.canRead()}, w=${file.canWrite()})")
            }
        }
        return ports
    }

    // -------------------- USB --------------------

    private fun findUsbPrinter(): UsbDevice? {
        val manager = usbManager ?: return null
        val devices = manager.deviceList

        // First pass: standard USB Printer Class 7 (device-level or interface-level)
        for ((_, device) in devices) {
            if (device.deviceClass == USB_CLASS_PRINTER) {
                return device
            }
            for (i in 0 until device.interfaceCount) {
                val iface = device.getInterface(i)
                if (iface.interfaceClass == USB_CLASS_PRINTER) {
                    return device
                }
            }
        }

        // Second pass: known printer vendor IDs.
        // Many cheap thermal printers use vendor-specific USB class (0xFF) and won't be
        // caught by the class-7 check above, but their VID is a reliable printer signal.
        for ((_, device) in devices) {
            if (resolveVendorName(device.vendorId) != null) {
                Log.d(TAG, "USB device VID=0x${device.vendorId.toString(16)} matched known printer vendor (class=${device.deviceClass})")
                return device
            }
        }

        // Third pass: bulk OUT endpoint heuristic.
        // Catches generic thermal printers with unknown VIDs and vendor-specific USB class —
        // common on cheap no-brand printers connected via OTG on regular phones (Samsung, Vivo, etc.).
        // Explicitly excludes well-known non-printer device classes so USB hubs, flash drives,
        // keyboards and audio devices are never mistaken for a printer.
        val nonPrinterClasses = setOf(
            UsbConstants.USB_CLASS_HUB,          // 9  — USB hubs
            UsbConstants.USB_CLASS_MASS_STORAGE, // 8  — flash drives
            UsbConstants.USB_CLASS_HID,          // 3  — keyboards / mice
            UsbConstants.USB_CLASS_AUDIO,        // 1  — speakers / microphones
            UsbConstants.USB_CLASS_VIDEO,        // 14 — cameras
            UsbConstants.USB_CLASS_COMM,         // 2  — serial/modem adapters (CDC)
            UsbConstants.USB_CLASS_CDC_DATA,     // 10 — CDC data (paired with class 2)
        )
        for ((_, device) in devices) {
            if (device.deviceClass in nonPrinterClasses) continue
            for (i in 0 until device.interfaceCount) {
                val iface = device.getInterface(i)
                if (iface.interfaceClass in nonPrinterClasses) continue
                for (j in 0 until iface.endpointCount) {
                    val ep = iface.getEndpoint(j)
                    if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                        ep.direction == UsbConstants.USB_DIR_OUT) {
                        Log.d(TAG, "USB device VID=0x${device.vendorId.toString(16)} matched via bulk-OUT heuristic (class=${device.deviceClass})")
                        return device
                    }
                }
            }
        }

        return null
    }

    private fun connectUsb(device: UsbDevice): Boolean {
        val manager = usbManager ?: return false

        if (!manager.hasPermission(device)) {
            Log.e(TAG, "USB permission missing")
            return false
        }

        val connection = manager.openDevice(device) ?: return false

        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)

            for (j in 0 until iface.endpointCount) {
                val endpoint = iface.getEndpoint(j)

                if (endpoint.type == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                    endpoint.direction == UsbConstants.USB_DIR_OUT
                ) {
                    if (connection.claimInterface(iface, true)) {
                        usbConnection = connection
                        usbEndpoint = endpoint
                        Log.d(TAG, "USB printer connected")
                        return true
                    }
                }
            }
        }

        connection.close()
        return false
    }

    // -------------------- PRINTER STATUS CHECK --------------------

    /**
     * Check if printer is actually responsive by requesting status
     */
    private fun checkPrinterStatus(port: String): Boolean {
        var fos: FileOutputStream? = null
        var fis: FileInputStream? = null
        
        return try {
            // Open for both read and write
            val file = File(port)
            fos = FileOutputStream(file, false)
            fis = FileInputStream(file)

            // Send status request command
            fos.write(DLE_EOT_STATUS)
            fos.flush()

            // Wait a bit for response
            Thread.sleep(100)

            // Try to read response (should get at least 1 byte)
            val available = fis.available()
            
            if (available > 0) {
                val response = ByteArray(available)
                fis.read(response)
                Log.d(TAG, "Printer status response: ${response.size} bytes")
                true
            } else {
                Log.w(TAG, "No status response from printer")
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Status check failed: ${e.message}")
            false
        } finally {
            try { fis?.close() } catch (_: Exception) {}
            try { fos?.close() } catch (_: Exception) {}
        }
    }

    // -------------------- PRINT --------------------

    fun printRaw(data: ByteArray): PrintResult {
        if (detectedPrinterType == PrinterType.NONE) {
            detectPrinter()
        }

        return when (detectedPrinterType) {
            PrinterType.SERIAL -> printViaSerial(data)
            PrinterType.USB -> printViaUsb(data)
            PrinterType.NONE -> PrintResult(false, "No printer detected")
        }
    }

    private fun printViaSerial(data: ByteArray): PrintResult {
        val port = serialPortPath ?: findSerialPrinter()
            ?: return PrintResult(false, "Serial printer not found")

        Log.d(TAG, "Printing via SERIAL: $port (${data.size} bytes)")

        // FIRST: Check if printer is responsive
        if (!checkPrinterStatus(port)) {
            Log.w(TAG, "Printer not responding to status check, attempting print anyway...")
            // Continue anyway - some printers might not respond to status but still work
        }

        val errors = mutableListOf<String>()

        // Method 1: Direct file access with verification
        val directResult = printSerialDirectWithVerification(port, data)
        if (directResult.success) {
            Log.d(TAG, "Direct serial print succeeded")
            return directResult
        }
        errors.add("Direct: ${directResult.error}")
        Log.w(TAG, "Direct access failed: ${directResult.error}")

        // Method 2: Shell command with verification
        val shellResult = printSerialViaShellWithVerification(port, data)
        if (shellResult.success) {
            Log.d(TAG, "Shell serial print succeeded")
            return shellResult
        }
        errors.add("Shell: ${shellResult.error}")
        Log.w(TAG, "Shell method failed: ${shellResult.error}")

        // Method 3: Root access
        val suResult = printSerialViaSu(port, data)
        if (suResult.success) {
            Log.d(TAG, "SU serial print succeeded")
            return suResult
        }
        errors.add("SU: ${suResult.error}")
        Log.w(TAG, "SU method failed: ${suResult.error}")

        val errorMsg = "Printer not responding on $port. The device may not have a working printer. Errors: ${errors.joinToString("; ")}"
        Log.e(TAG, errorMsg)

        return PrintResult(false, errorMsg)
    }

    /**
     * Configure serial port with stty before printing
     * Common baud rates for thermal printers: 9600, 19200, 38400, 57600, 115200
     */
    private fun configureSerialPort(port: String, baudRate: Int = 115200): Boolean {
        return try {
            // Configure serial port: baud rate, 8 data bits, no parity, 1 stop bit, raw mode
            val process = ProcessBuilder("sh", "-c",
                "stty -F $port $baudRate cs8 -cstopb -parenb raw -echo 2>&1")
                .start()

            val output = process.inputStream.bufferedReader().use { it.readText() }
            val exitCode = process.waitFor()

            if (exitCode == 0) {
                Log.d(TAG, "Serial port $port configured: $baudRate baud")
                true
            } else {
                Log.w(TAG, "stty failed (exit $exitCode): $output")
                false
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to configure serial port: ${e.message}")
            false
        }
    }

    private fun printSerialDirectWithVerification(port: String, data: ByteArray): PrintResult {
        var fos: FileOutputStream? = null

        // Common baud rates for thermal printers (most common first)
        val baudRates = listOf(115200, 9600, 19200, 38400, 57600)

        return try {
            // Try to configure serial port - try different baud rates if first fails
            var configured = false
            for (baud in baudRates) {
                if (configureSerialPort(port, baud)) {
                    configured = true
                    break
                }
            }

            if (!configured) {
                Log.w(TAG, "Could not configure serial port, attempting raw write anyway")
            }

            fos = FileOutputStream(port)

            val chunkSize = 512
            var offset = 0
            var totalWritten = 0

            while (offset < data.size) {
                val len = minOf(chunkSize, data.size - offset)
                fos.write(data, offset, len)
                fos.flush()

                totalWritten += len
                offset += len

                if (offset < data.size) {
                    Thread.sleep(10)
                }
            }

            // Verify all data was sent
            if (totalWritten != data.size) {
                return PrintResult(false, "Write incomplete: $totalWritten/${data.size} bytes")
            }

            Log.d(TAG, "Direct serial write complete: ${data.size} bytes")

            // Give printer time to process
            Thread.sleep(300)

            // Status check is informational only - many printers don't respond to status queries
            val statusOk = checkPrinterStatus(port)
            if (!statusOk) {
                Log.w(TAG, "Printer did not respond to status check (this may be normal)")
            }

            PrintResult(true)

        } catch (e: Exception) {
            Log.e(TAG, "Direct serial failed", e)
            PrintResult(false, "$port: ${e.message}")
        } finally {
            try { fos?.close() } catch (e: Exception) {
                Log.w(TAG, "Error closing serial port", e)
            }
        }
    }

    private fun printSerialViaShellWithVerification(port: String, data: ByteArray): PrintResult {
        var process: Process? = null
        var tempFile: File? = null

        return try {
            // Configure serial port first
            configureSerialPort(port, 115200)

            tempFile = File(context.cacheDir, "print_data_${System.currentTimeMillis()}.bin")
            tempFile.writeBytes(data)

            // Use dd WITHOUT conv=fsync - serial ports don't support fsync and it causes false failures
            process = ProcessBuilder("sh", "-c",
                "dd if=${tempFile.absolutePath} of=$port bs=512 2>&1")
                .start()

            val output = process.inputStream.bufferedReader().use { it.readText() }
            val exitCode = process.waitFor()

            Log.d(TAG, "Shell dd output: $output, exit: $exitCode")

            // Extract bytes written first - dd reports this even if there are other issues
            val bytesRegex = """(\d+) bytes""".toRegex()
            val match = bytesRegex.find(output)
            val bytesWritten = match?.groupValues?.get(1)?.toIntOrNull() ?: 0

            // Check for hard errors (but ignore fsync errors if bytes were written)
            val lowerOutput = output.lowercase()
            val hasFatalError = (lowerOutput.contains("permission denied") ||
                lowerOutput.contains("operation not permitted") ||
                lowerOutput.contains("cannot open") ||
                lowerOutput.contains("no such device"))

            if (hasFatalError && bytesWritten == 0) {
                return PrintResult(false, "Shell error: $output")
            }

            // If bytes were written, consider it a success
            if (bytesWritten > 0) {
                if (bytesWritten != data.size) {
                    Log.w(TAG, "Partial write: $bytesWritten/${data.size} bytes")
                    return PrintResult(false, "Incomplete write: $bytesWritten/${data.size} bytes")
                }

                Log.d(TAG, "Shell serial write complete: $bytesWritten bytes")

                // Give printer time to process
                Thread.sleep(300)

                // Status check is informational only - many printers don't respond to status queries
                val statusOk = checkPrinterStatus(port)
                if (!statusOk) {
                    Log.w(TAG, "Printer did not respond to status check (this may be normal)")
                }

                PrintResult(true)
            } else if (exitCode == 0) {
                PrintResult(false, "Shell: No bytes written")
            } else {
                PrintResult(false, "Shell exit $exitCode: $output")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Shell serial failed", e)
            PrintResult(false, e.message)
        } finally {
            try {
                process?.inputStream?.close()
                process?.errorStream?.close()
                process?.outputStream?.close()
                process?.destroy()
            } catch (_: Exception) {}
            try { tempFile?.delete() } catch (_: Exception) {}
        }
    }

    private fun printSerialViaSu(port: String, data: ByteArray): PrintResult {
        var suCheck: Process? = null
        var process: Process? = null
        var tempFile: File? = null

        return try {
            suCheck = Runtime.getRuntime().exec(arrayOf("which", "su"))
            suCheck.inputStream.bufferedReader().use { it.readText() }
            val suAvailable = suCheck.waitFor() == 0

            if (!suAvailable) {
                return PrintResult(false, "Device not rooted")
            }

            tempFile = File(context.cacheDir, "print_data_su_${System.currentTimeMillis()}.bin")
            tempFile.writeBytes(data)
            tempFile.setReadable(true, false)

            // Use dd WITHOUT conv=fsync - serial ports don't support fsync
            process = ProcessBuilder("su", "-c",
                "dd if=${tempFile.absolutePath} of=$port bs=512 2>&1")
                .start()

            val output = process.inputStream.bufferedReader().use { it.readText() }
            val exitCode = process.waitFor()

            Log.d(TAG, "SU dd output: $output, exit: $exitCode")

            // Extract bytes written first
            val bytesRegex = """(\d+) bytes""".toRegex()
            val match = bytesRegex.find(output)
            val bytesWritten = match?.groupValues?.get(1)?.toIntOrNull() ?: 0

            val lowerOutput = output.lowercase()
            val hasFatalError = (lowerOutput.contains("permission denied") ||
                lowerOutput.contains("operation not permitted") ||
                lowerOutput.contains("cannot open") ||
                lowerOutput.contains("no such device"))

            if (hasFatalError && bytesWritten == 0) {
                return PrintResult(false, "SU error: $output")
            }

            if (bytesWritten > 0) {
                if (bytesWritten != data.size) {
                    return PrintResult(false, "Incomplete: $bytesWritten/${data.size} bytes")
                }

                Log.d(TAG, "SU serial write complete: $bytesWritten bytes")

                // Give printer time to process
                Thread.sleep(300)

                // Status check is informational only
                val statusOk = checkPrinterStatus(port)
                if (!statusOk) {
                    Log.w(TAG, "Printer did not respond to status check (this may be normal)")
                }

                PrintResult(true)
            } else if (exitCode == 0) {
                PrintResult(false, "SU: No bytes written")
            } else {
                PrintResult(false, "SU exit $exitCode: $output")
            }
        } catch (e: Exception) {
            Log.e(TAG, "SU serial failed", e)
            PrintResult(false, e.message)
        } finally {
            try {
                suCheck?.inputStream?.close()
                suCheck?.errorStream?.close()
                suCheck?.outputStream?.close()
                suCheck?.destroy()
            } catch (_: Exception) {}
            try {
                process?.inputStream?.close()
                process?.errorStream?.close()
                process?.outputStream?.close()
                process?.destroy()
            } catch (_: Exception) {}
            try { tempFile?.delete() } catch (_: Exception) {}
        }
    }

    private fun printViaUsb(data: ByteArray): PrintResult {
        val device = findUsbPrinter()
            ?: return PrintResult(false, "USB printer not found")

        if (usbConnection == null || usbEndpoint == null) {
            if (!connectUsb(device)) {
                return PrintResult(false, "USB connect failed")
            }
        }

        val connection = usbConnection ?: return PrintResult(false, "USB lost")
        val endpoint = usbEndpoint ?: return PrintResult(false, "USB endpoint lost")

        return try {
            val chunk = 4096
            var offset = 0

            while (offset < data.size) {
                val len = minOf(chunk, data.size - offset)
                val result = connection.bulkTransfer(
                    endpoint,
                    data.copyOfRange(offset, offset + len),
                    len,
                    5000
                )

                if (result < 0) {
                    return PrintResult(false, "USB transfer failed at byte $offset")
                }
                
                if (result != len) {
                    return PrintResult(false, "USB incomplete transfer: $result/$len bytes")
                }

                offset += len
            }

            Log.d(TAG, "USB print complete: ${data.size} bytes")
            PrintResult(true)

        } catch (e: Exception) {
            Log.e(TAG, "USB print error", e)
            PrintResult(false, e.message)
        }
    }

    // -------------------- TEST PRINT --------------------

    fun printTestPage(): PrintResult {
        return printRaw(buildTestPageEscPos())
    }

    private fun buildTestPageEscPos(): ByteArray {
        val cmd = mutableListOf<Byte>()

        cmd.addAll(byteArrayOf(0x1B, 0x40).toList())
        cmd.addAll(byteArrayOf(0x1B, 0x61, 0x01).toList())
        cmd.addAll(byteArrayOf(0x1D, 0x21, 0x33).toList())

        cmd.addAll("TEST PRINT".toByteArray().toList())
        cmd.add(0x0A)

        cmd.addAll(byteArrayOf(0x1D, 0x21, 0x00).toList())
        cmd.add(0x0A)

        cmd.addAll("Printer is working!".toByteArray().toList())
        cmd.add(0x0A)

        cmd.addAll("Device: ${Build.MANUFACTURER} ${Build.MODEL}".toByteArray().toList())
        cmd.add(0x0A)

        cmd.add(0x0A)
        cmd.add(0x0A)

        cmd.addAll(byteArrayOf(0x1D, 0x56, 0x00).toList())

        return cmd.toByteArray()
    }

    // -------------------- CLEANUP --------------------

    fun cleanup() {
        Log.d(TAG, "Cleaning up printer resources")

        try {
            usbConnection?.close()
            usbConnection = null
            usbEndpoint = null
        } catch (e: Exception) {
            Log.w(TAG, "Error closing USB connection", e)
        }

        serialPortPath = null
        detectedPrinterType = PrinterType.NONE

        synchronized(Companion) {
            instance = null
        }
    }

    // -------------------- RESULT MODEL --------------------

    data class PrinterDetectionResult(
        val available: Boolean,
        val type: String,
        val deviceName: String?,
        val vendorId: Int?,
        val productId: Int?,
        val manufacturer: String,
        val model: String
    )
}