package com.hashone.hashoneplat.printer

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log

/**
 * Additional vendor-specific printer adapters for common POS brands
 */

// ==================== INGENICO ====================
class IngenicoAdapter(private val context: Context) {

    companion object {
        private const val TAG = "IngenicoAdapter"
        private const val INGENICO_PRINT_SERVICE = "com.ingenico.ipp.printer"
    }

    fun isAvailable(): Boolean {
        val isIngenico = Build.MANUFACTURER.lowercase().let {
            it.contains("ingenico") || it.contains("aevi")
        }
        if (!isIngenico) return false

        // Check for print service
        return try {
            val intent = Intent("$INGENICO_PRINT_SERVICE.PRINT")
            context.packageManager.queryIntentServices(intent, 0).isNotEmpty()
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        return try {
            val intent = Intent("$INGENICO_PRINT_SERVICE.PRINT")
            intent.putExtra("data", data)
            intent.putExtra("raw", data)
            context.startService(intent)
            PrintResult(true)
        } catch (e: Exception) {
            Log.e(TAG, "Ingenico print failed", e)
            PrintResult(false, e.message)
        }
    }
}

// ==================== VERIFONE ====================
class VerifoneAdapter(private val context: Context) {

    companion object {
        private const val TAG = "VerifoneAdapter"
    }

    fun isAvailable(): Boolean {
        val isVerifone = Build.MANUFACTURER.lowercase().contains("verifone")
        if (!isVerifone) return false

        // Verifone uses their SDK - check if classes exist
        return try {
            Class.forName("com.verifone.peripherals.Printer")
            true
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        return try {
            // Use reflection since we may not have SDK at compile time
            val printerClass = Class.forName("com.verifone.peripherals.Printer")
            val getInstance = printerClass.getMethod("getInstance", Context::class.java)
            val printer = getInstance.invoke(null, context)

            val printMethod = printerClass.getMethod("print", ByteArray::class.java)
            printMethod.invoke(printer, data)

            PrintResult(true)
        } catch (e: Exception) {
            Log.e(TAG, "Verifone print failed", e)
            PrintResult(false, e.message)
        }
    }
}

// ==================== NEWLAND ====================
class NewlandAdapter(private val context: Context) {

    companion object {
        private const val TAG = "NewlandAdapter"
        private const val NEWLAND_SERVICE = "com.newland.me.DeviceService"
    }

    fun isAvailable(): Boolean {
        val isNewland = Build.MANUFACTURER.lowercase().let {
            it.contains("newland") || it.contains("nlpos")
        }
        if (!isNewland) return false

        return try {
            val intent = Intent(NEWLAND_SERVICE)
            context.packageManager.queryIntentServices(intent, 0).isNotEmpty()
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        return try {
            // Newland uses AIDL service similar to Sunmi
            val intent = Intent(NEWLAND_SERVICE)
            intent.putExtra("print_data", data)
            context.startService(intent)
            PrintResult(true)
        } catch (e: Exception) {
            Log.e(TAG, "Newland print failed", e)
            PrintResult(false, e.message)
        }
    }
}

// ==================== UROVO ====================
class UrovoAdapter(private val context: Context) {

    companion object {
        private const val TAG = "UrovoAdapter"
    }

    fun isAvailable(): Boolean {
        val isUrovo = Build.MANUFACTURER.lowercase().let {
            it.contains("urovo") || it.contains("ubx")
        }
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
            val pmClass = Class.forName("android.device.PrinterManager")
            val constructor = pmClass.getConstructor()
            val printer = constructor.newInstance()

            // setupPage and print
            val setupMethod = pmClass.getMethod("setupPage", Int::class.java, Int::class.java)
            setupMethod.invoke(printer, -1, -1) // default width/height

            val printMethod = pmClass.getMethod("printRawData", ByteArray::class.java)
            printMethod.invoke(printer, data)

            PrintResult(true)
        } catch (e: Exception) {
            Log.e(TAG, "Urovo print failed", e)
            PrintResult(false, e.message)
        }
    }
}

// ==================== TELPO ====================
class TelpoAdapter(private val context: Context) {

    companion object {
        private const val TAG = "TelpoAdapter"
    }

    fun isAvailable(): Boolean {
        val isTelpo = Build.MANUFACTURER.lowercase().contains("telpo")
        if (!isTelpo) return false

        return try {
            Class.forName("com.telpo.tps550.api.printer.ThermalPrinter")
            true
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        return try {
            val printerClass = Class.forName("com.telpo.tps550.api.printer.ThermalPrinter")
            val getInstance = printerClass.getMethod("getInstance")
            val printer = getInstance.invoke(null)

            val resetMethod = printerClass.getMethod("reset")
            resetMethod.invoke(printer)

            val writeMethod = printerClass.getMethod("write", ByteArray::class.java)
            writeMethod.invoke(printer, data)

            PrintResult(true)
        } catch (e: Exception) {
            Log.e(TAG, "Telpo print failed", e)
            PrintResult(false, e.message)
        }
    }
}

// ==================== IMIN ====================
class IminAdapter(private val context: Context) {

    companion object {
        private const val TAG = "IminAdapter"
        private const val IMIN_SERVICE = "com.imin.printerservice"
    }

    fun isAvailable(): Boolean {
        val isImin = Build.MANUFACTURER.lowercase().contains("imin")
        if (!isImin) return false

        return try {
            val pm = context.packageManager
            pm.getPackageInfo(IMIN_SERVICE, 0)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        return try {
            // IMIN uses similar API to Sunmi
            val intent = Intent("$IMIN_SERVICE.IPosPrinterService")
            intent.setPackage(IMIN_SERVICE)
            intent.putExtra("print_data", data)
            context.startService(intent)
            PrintResult(true)
        } catch (e: Exception) {
            Log.e(TAG, "IMIN print failed", e)
            PrintResult(false, e.message)
        }
    }
}

// ==================== HPRT ====================
class HprtAdapter(private val context: Context) {

    companion object {
        private const val TAG = "HprtAdapter"
    }

    fun isAvailable(): Boolean {
        val isHprt = Build.MANUFACTURER.lowercase().contains("hprt")
        if (!isHprt) return false

        return try {
            Class.forName("com.hprt.api.HPRTPrinterHelper")
            true
        } catch (e: Exception) {
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        return try {
            val helperClass = Class.forName("com.hprt.api.HPRTPrinterHelper")
            val printMethod = helperClass.getMethod("printRawData", ByteArray::class.java)
            printMethod.invoke(null, data)
            PrintResult(true)
        } catch (e: Exception) {
            Log.e(TAG, "HPRT print failed", e)
            PrintResult(false, e.message)
        }
    }
}

// ==================== CLOUDCODE (Hainan) Technology ====================
class CloudCodeAdapter(private val context: Context) {

    companion object {
        private const val TAG = "CloudCodeAdapter"

        // All possible printer SDK classes to probe on CloudCode devices.
        // CloudCode (yunmazhineng.com) has no public SDK docs, so we probe
        // for every known Chinese POS printer API pattern.
        private val PRINTER_SDK_CLASSES = listOf(
            // Urovo-style (android.device.PrinterManager)
            "android.device.PrinterManager",
            // WizarPOS / CloudPOS SDK
            "com.cloudpos.POSTerminal",
            // Sunmi
            "woyou.aidlservice.jiuiv5.IWoyouService",
            // Common CloudCode / CloudeCode guesses
            "com.cloudecode.printer.PrinterManager",
            "com.cloudcode.printer.PrinterManager",
            "com.cloude.printer.PrinterService",
            "com.yunma.printer.PrinterManager",
            "com.yunma.device.Printer",
            // Generic Chinese POS patterns
            "com.printer.sdk.PrinterInstance",
            "com.pos.device.printer.PrinterDevice",
            "com.zcs.sdk.print.PrnStrFormat",
            "com.xcheng.printerservice.IPrinterService",
            "com.iposprinter.iposprinterservice.IPosPrinterService",
            "net.posprinter.posprinterface.IMyBinder",
            "com.gprinter.command.EscCommand"
        )

        // Serial port paths commonly used by Chinese POS terminals
        private val SERIAL_PORTS = listOf(
            "/dev/ttyS1", "/dev/ttyS0", "/dev/ttyS2", "/dev/ttyS3",
            "/dev/ttyMT1", "/dev/ttyMT0",
            "/dev/ttyHSL1", "/dev/ttyHSL0"
        )
    }

    // CloudCode AIDL SDK printer
    private val sdkPrinter by lazy { CloudCodeSdkPrinter(context) }

    // Discovered printer SDK info
    private var foundPrinterClass: Class<*>? = null
    private var foundClassName: String? = null
    private var printerType: String = "none" // "urovo", "wizarpos", "aidl_sdk", "serial", "none"

    fun isAvailable(): Boolean {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val brand = Build.BRAND.lowercase()
        val model = Build.MODEL.lowercase()

        val isCloudCode = manufacturer.contains("cloude") ||
            manufacturer.contains("cloudcode") ||
            manufacturer.contains("cloud code") ||
            manufacturer.contains("cloud_code") ||
            manufacturer.contains("yunma") ||
            brand.contains("cloude") ||
            brand.contains("cloudcode") ||
            brand.contains("yunma") ||
            model.contains("cp50") ||
            model.contains("cp-50") ||
            model.contains("cp12") ||
            model.contains("cp20") ||
            model.contains("cm20")

        if (!isCloudCode) return false

        Log.d(TAG, "CloudCode device detected: manufacturer=$manufacturer model=$model brand=$brand device=${Build.DEVICE}")

        // Check CloudCode AIDL SDK first (highest priority for CP50)
        try {
            if (sdkPrinter.isAvailable()) {
                printerType = "aidl_sdk"
                Log.d(TAG, "CloudCode AIDL SDK service available")
                return true
            }
        } catch (e: Exception) {
            Log.w(TAG, "AIDL SDK check failed: ${e.message}")
        }

        // Probe for available printer SDK classes
        for (className in PRINTER_SDK_CLASSES) {
            try {
                val clazz = Class.forName(className)
                foundPrinterClass = clazz
                foundClassName = className
                Log.d(TAG, "*** FOUND printer SDK class: $className ***")

                // Identify the type for the print method
                printerType = when {
                    className.startsWith("android.device.") -> "urovo"
                    className.startsWith("com.cloudpos.") -> "wizarpos"
                    else -> "generic"
                }

                // Log all methods for diagnostics
                logClassMethods(clazz, className)

                return true
            } catch (_: ClassNotFoundException) {
                Log.d(TAG, "Not found: $className")
            } catch (e: Exception) {
                Log.d(TAG, "Error probing $className: ${e.message}")
            }
        }

        // No SDK found - check serial ports as fallback
        // Accept ports that exist even without direct write permission,
        // since shell (dd) and su methods can bypass SELinux restrictions
        for (port in SERIAL_PORTS) {
            val file = java.io.File(port)
            if (file.exists()) {
                printerType = "serial"
                Log.d(TAG, "No SDK found, using serial fallback: $port (canWrite=${file.canWrite()})")
                return true
            }
        }

        // Still return true for CloudCode devices so diagnostics are useful
        Log.w(TAG, "CloudCode device detected but no printer SDK or serial port found")
        return true
    }

    /**
     * Log all public methods of a discovered class for diagnostics
     */
    private fun logClassMethods(clazz: Class<*>, name: String) {
        try {
            val methods = clazz.methods
            Log.d(TAG, "=== Methods of $name (${methods.size} total) ===")
            for (m in methods) {
                if (m.declaringClass == Any::class.java) continue
                val params = m.parameterTypes.joinToString(", ") { it.simpleName }
                Log.d(TAG, "  ${m.returnType.simpleName} ${m.name}($params)")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Could not list methods of $name: ${e.message}")
        }
    }

    fun print(data: ByteArray): PrintResult {
        Log.d(TAG, "CloudCode print: type=$printerType, foundClass=$foundClassName, data=${data.size} bytes")

        return when (printerType) {
            "aidl_sdk" -> {
                try {
                    sdkPrinter.print(data)
                } catch (e: Exception) {
                    Log.e(TAG, "AIDL SDK print failed, trying serial fallback", e)
                    printViaSerial(data)
                }
            }
            "urovo" -> printViaUrovo(data)
            "wizarpos" -> printViaWizarPOS(data)
            "generic" -> printViaGenericReflection(data)
            "serial" -> printViaSerial(data)
            else -> PrintResult(false, "CloudCode CP50: No printer SDK found. Run getDiagnostics() for details. Device: ${Build.MANUFACTURER} ${Build.MODEL}")
        }
    }

    // -------------------- UROVO-STYLE (android.device.PrinterManager) --------------------

    private fun printViaUrovo(data: ByteArray): PrintResult {
        return try {
            val pmClass = foundPrinterClass ?: Class.forName("android.device.PrinterManager")

            // Get instance
            val pm = pmClass.getConstructor().newInstance()
            Log.d(TAG, "Urovo PrinterManager instance created")

            // printerOpen()
            try {
                val openMethod = pmClass.getMethod("printerOpen")
                openMethod.invoke(pm)
                Log.d(TAG, "printerOpen() called")
            } catch (e: Exception) {
                Log.w(TAG, "printerOpen failed: ${e.message}")
            }

            // Try sendRawData(byte[]) first
            val sendResult = try {
                val sendRaw = pmClass.getMethod("sendRawData", ByteArray::class.java)
                val result = sendRaw.invoke(pm, data)
                Log.d(TAG, "sendRawData result: $result")
                true
            } catch (e: Exception) {
                Log.w(TAG, "sendRawData not available: ${e.message}")
                false
            }

            if (!sendResult) {
                // Try write(byte[]) as alternative
                try {
                    val writeMethod = pmClass.getMethod("write", ByteArray::class.java)
                    writeMethod.invoke(pm, data)
                    Log.d(TAG, "write() called")
                } catch (e: Exception) {
                    Log.e(TAG, "No print method worked: ${e.message}")
                    return PrintResult(false, "Urovo: No print method available - ${e.message}")
                }
            }

            // printerClose()
            try {
                val closeMethod = pmClass.getMethod("printerClose")
                closeMethod.invoke(pm)
                Log.d(TAG, "printerClose() called")
            } catch (e: Exception) {
                Log.w(TAG, "printerClose failed: ${e.message}")
            }

            PrintResult(true)

        } catch (e: java.lang.reflect.InvocationTargetException) {
            val cause = e.cause ?: e
            Log.e(TAG, "Urovo print error: ${cause.message}", cause)
            PrintResult(false, "Urovo print error: ${cause.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Urovo print failed: ${e.message}", e)
            PrintResult(false, "Urovo print failed: ${e.message}")
        }
    }

    // -------------------- WIZARPOS (com.cloudpos.POSTerminal) --------------------

    private fun printViaWizarPOS(data: ByteArray): PrintResult {
        var printerDevice: Any? = null

        return try {
            val terminalClass = Class.forName("com.cloudpos.POSTerminal")
            val deviceClass = Class.forName("com.cloudpos.printer.PrinterDevice")

            // POSTerminal.getInstance(context)
            val getInstance = try {
                terminalClass.getMethod("getInstance", Context::class.java)
            } catch (e: NoSuchMethodException) {
                terminalClass.getMethod("getInstance")
            }

            val terminal = if (getInstance.parameterCount == 1) {
                getInstance.invoke(null, context)
            } else {
                getInstance.invoke(null)
            }

            if (terminal == null) {
                return PrintResult(false, "POSTerminal.getInstance() returned null")
            }

            val getDevice = terminalClass.getMethod("getDevice", String::class.java)
            printerDevice = getDevice.invoke(terminal, "cloudpos.device.printer")

            if (printerDevice == null) {
                return PrintResult(false, "getDevice('cloudpos.device.printer') returned null")
            }

            // open()
            try {
                deviceClass.getMethod("open").invoke(printerDevice)
            } catch (e: NoSuchMethodException) {
                deviceClass.getMethod("open", Int::class.javaPrimitiveType).invoke(printerDevice, 0)
            }

            // sendESCCommand(byte[])
            val sendESC = deviceClass.getMethod("sendESCCommand", ByteArray::class.java)
            sendESC.invoke(printerDevice, data)
            Log.d(TAG, "WizarPOS sendESCCommand: ${data.size} bytes")

            // close()
            try { deviceClass.getMethod("close").invoke(printerDevice) } catch (_: Exception) {}

            PrintResult(true)

        } catch (e: java.lang.reflect.InvocationTargetException) {
            val cause = e.cause ?: e
            Log.e(TAG, "WizarPOS error: ${cause.message}", cause)
            closeSafely(printerDevice)
            PrintResult(false, "WizarPOS error: ${cause.message}")
        } catch (e: Exception) {
            Log.e(TAG, "WizarPOS failed: ${e.message}", e)
            closeSafely(printerDevice)
            PrintResult(false, "WizarPOS failed: ${e.message}")
        }
    }

    // -------------------- GENERIC REFLECTION --------------------

    /**
     * For unknown SDKs: try common method patterns on the discovered class
     */
    private fun printViaGenericReflection(data: ByteArray): PrintResult {
        val clazz = foundPrinterClass
            ?: return PrintResult(false, "No printer class found")

        Log.d(TAG, "Attempting generic reflection on: $foundClassName")

        return try {
            // Try to get an instance
            val instance = getInstanceOfClass(clazz)

            if (instance == null) {
                Log.w(TAG, "Could not get instance of $foundClassName")
                return PrintResult(false, "Could not instantiate $foundClassName")
            }

            Log.d(TAG, "Instance obtained: ${instance.javaClass.name}")

            // Try open methods
            tryInvoke(instance, "open")
            tryInvoke(instance, "printerOpen")
            tryInvoke(instance, "connect")
            tryInvoke(instance, "init")

            // Try print methods (raw data)
            val printMethods = listOf(
                "sendRawData", "printRawData", "printRaw", "sendData",
                "write", "print", "printBytes", "sendESCCommand",
                "printEscCommand", "escPrint"
            )

            var printed = false
            for (method in printMethods) {
                try {
                    val m = clazz.getMethod(method, ByteArray::class.java)
                    val result = m.invoke(instance, data)
                    Log.d(TAG, "SUCCESS: $method() returned $result")
                    printed = true
                    break
                } catch (_: NoSuchMethodException) {
                    // Try next
                } catch (e: java.lang.reflect.InvocationTargetException) {
                    Log.w(TAG, "$method() threw: ${e.cause?.message}")
                } catch (e: Exception) {
                    Log.w(TAG, "$method() error: ${e.message}")
                }
            }

            // Try close
            tryInvoke(instance, "close")
            tryInvoke(instance, "printerClose")
            tryInvoke(instance, "disconnect")

            if (printed) {
                PrintResult(true)
            } else {
                PrintResult(false, "No print method worked on $foundClassName. Check logcat CloudCodeAdapter for available methods.")
            }

        } catch (e: Exception) {
            Log.e(TAG, "Generic reflection failed: ${e.message}", e)
            PrintResult(false, "Generic reflection failed: ${e.message}")
        }
    }

    /**
     * Try to get an instance via various common patterns
     */
    private fun getInstanceOfClass(clazz: Class<*>): Any? {
        // Pattern 1: getInstance(Context)
        try {
            val m = clazz.getMethod("getInstance", Context::class.java)
            val result = m.invoke(null, context)
            if (result != null) {
                Log.d(TAG, "Got instance via getInstance(Context)")
                return result
            }
        } catch (_: Exception) {}

        // Pattern 2: getInstance()
        try {
            val m = clazz.getMethod("getInstance")
            val result = m.invoke(null)
            if (result != null) {
                Log.d(TAG, "Got instance via getInstance()")
                return result
            }
        } catch (_: Exception) {}

        // Pattern 3: getPrinter()
        try {
            val m = clazz.getMethod("getPrinter")
            val result = m.invoke(null)
            if (result != null) {
                Log.d(TAG, "Got instance via getPrinter()")
                return result
            }
        } catch (_: Exception) {}

        // Pattern 4: No-arg constructor
        try {
            val instance = clazz.getConstructor().newInstance()
            Log.d(TAG, "Got instance via constructor()")
            return instance
        } catch (_: Exception) {}

        // Pattern 5: Constructor(Context)
        try {
            val instance = clazz.getConstructor(Context::class.java).newInstance(context)
            Log.d(TAG, "Got instance via constructor(Context)")
            return instance
        } catch (_: Exception) {}

        return null
    }

    /**
     * Try to invoke a no-arg method, swallowing errors
     */
    private fun tryInvoke(instance: Any, methodName: String) {
        try {
            val m = instance.javaClass.getMethod(methodName)
            m.invoke(instance)
            Log.d(TAG, "$methodName() called successfully")
        } catch (_: NoSuchMethodException) {
            // Method doesn't exist - that's fine
        } catch (e: Exception) {
            Log.d(TAG, "$methodName() failed: ${e.message}")
        }
    }

    // -------------------- SERIAL FALLBACK --------------------

    private fun printViaSerial(data: ByteArray): PrintResult {
        // Find a serial port that exists (even without write permission - su can bypass)
        var targetPort: String? = null
        for (port in SERIAL_PORTS) {
            val file = java.io.File(port)
            if (file.exists()) {
                targetPort = port
                break
            }
        }

        if (targetPort == null) {
            return PrintResult(false, "No serial port found")
        }

        Log.d(TAG, "Serial print to: $targetPort (${data.size} bytes)")

        val errors = mutableListOf<String>()

        // Method 1: Direct file access
        val directResult = printSerialDirect(targetPort, data)
        if (directResult.success) {
            Log.d(TAG, "Direct serial print succeeded")
            return directResult
        }
        errors.add("Direct: ${directResult.error}")
        Log.w(TAG, "Direct access failed: ${directResult.error}")

        // Method 2: Shell command (dd) - bypasses some SELinux restrictions
        val shellResult = printSerialViaShell(targetPort, data)
        if (shellResult.success) {
            Log.d(TAG, "Shell serial print succeeded")
            return shellResult
        }
        errors.add("Shell: ${shellResult.error}")
        Log.w(TAG, "Shell method failed: ${shellResult.error}")

        // Method 3: Root access (su) - last resort
        val suResult = printSerialViaSu(targetPort, data)
        if (suResult.success) {
            Log.d(TAG, "SU serial print succeeded")
            return suResult
        }
        errors.add("SU: ${suResult.error}")
        Log.w(TAG, "SU method failed: ${suResult.error}")

        val errorMsg = "Serial print failed on $targetPort. All methods failed: ${errors.joinToString("; ")}"
        Log.e(TAG, errorMsg)
        return PrintResult(false, errorMsg)
    }

    private fun configureSerialPort(port: String): Boolean {
        val baudRates = listOf(115200, 9600, 19200, 38400, 57600)
        for (baud in baudRates) {
            try {
                val process = ProcessBuilder("sh", "-c",
                    "stty -F $port $baud cs8 -cstopb -parenb raw -echo 2>&1")
                    .start()
                val output = process.inputStream.bufferedReader().use { it.readText() }
                val exitCode = process.waitFor()
                if (exitCode == 0) {
                    Log.d(TAG, "Serial configured: $port @ $baud baud")
                    return true
                }
            } catch (_: Exception) {}
        }
        Log.w(TAG, "Could not configure serial port $port")
        return false
    }

    private fun printSerialDirect(port: String, data: ByteArray): PrintResult {
        var fos: java.io.FileOutputStream? = null
        return try {
            configureSerialPort(port)

            fos = java.io.FileOutputStream(port)

            val chunkSize = 512
            var offset = 0

            while (offset < data.size) {
                val len = minOf(chunkSize, data.size - offset)
                fos.write(data, offset, len)
                fos.flush()
                offset += len
                if (offset < data.size) Thread.sleep(10)
            }

            Log.d(TAG, "Direct serial write complete: ${data.size} bytes to $port")
            Thread.sleep(300)
            PrintResult(true)

        } catch (e: Exception) {
            Log.e(TAG, "Direct serial failed: ${e.message}", e)
            PrintResult(false, "$port: ${e.message}")
        } finally {
            try { fos?.close() } catch (_: Exception) {}
        }
    }

    private fun printSerialViaShell(port: String, data: ByteArray): PrintResult {
        var process: Process? = null
        var tempFile: java.io.File? = null

        return try {
            configureSerialPort(port)

            tempFile = java.io.File(context.cacheDir, "cc_print_${System.currentTimeMillis()}.bin")
            tempFile.writeBytes(data)

            process = ProcessBuilder("sh", "-c",
                "dd if=${tempFile.absolutePath} of=$port bs=512 2>&1")
                .start()

            val output = process.inputStream.bufferedReader().use { it.readText() }
            val exitCode = process.waitFor()

            Log.d(TAG, "Shell dd output: $output, exit: $exitCode")

            val bytesRegex = """(\d+) bytes""".toRegex()
            val match = bytesRegex.find(output)
            val bytesWritten = match?.groupValues?.get(1)?.toIntOrNull() ?: 0

            val lowerOutput = output.lowercase()
            val hasFatalError = lowerOutput.contains("permission denied") ||
                lowerOutput.contains("operation not permitted") ||
                lowerOutput.contains("cannot open") ||
                lowerOutput.contains("no such device")

            if (hasFatalError && bytesWritten == 0) {
                return PrintResult(false, "Shell error: $output")
            }

            if (bytesWritten > 0) {
                Log.d(TAG, "Shell serial write complete: $bytesWritten bytes")
                Thread.sleep(300)
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
        var tempFile: java.io.File? = null

        return try {
            suCheck = Runtime.getRuntime().exec(arrayOf("which", "su"))
            suCheck.inputStream.bufferedReader().use { it.readText() }
            val suAvailable = suCheck.waitFor() == 0

            if (!suAvailable) {
                return PrintResult(false, "Device not rooted")
            }

            tempFile = java.io.File(context.cacheDir, "cc_print_su_${System.currentTimeMillis()}.bin")
            tempFile.writeBytes(data)
            tempFile.setReadable(true, false)

            process = ProcessBuilder("su", "-c",
                "dd if=${tempFile.absolutePath} of=$port bs=512 2>&1")
                .start()

            val output = process.inputStream.bufferedReader().use { it.readText() }
            val exitCode = process.waitFor()

            Log.d(TAG, "SU dd output: $output, exit: $exitCode")

            val bytesRegex = """(\d+) bytes""".toRegex()
            val match = bytesRegex.find(output)
            val bytesWritten = match?.groupValues?.get(1)?.toIntOrNull() ?: 0

            val lowerOutput = output.lowercase()
            val hasFatalError = lowerOutput.contains("permission denied") ||
                lowerOutput.contains("operation not permitted") ||
                lowerOutput.contains("cannot open") ||
                lowerOutput.contains("no such device")

            if (hasFatalError && bytesWritten == 0) {
                return PrintResult(false, "SU error: $output")
            }

            if (bytesWritten > 0) {
                Log.d(TAG, "SU serial write complete: $bytesWritten bytes")
                Thread.sleep(300)
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

    private fun closeSafely(device: Any?) {
        if (device == null) return
        try { device.javaClass.getMethod("close").invoke(device) } catch (_: Exception) {}
    }
}