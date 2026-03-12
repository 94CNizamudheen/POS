package com.nizamc.pos.printer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.content.pm.PackageManager
import android.os.IBinder
import android.util.Log
import dalvik.system.DexClassLoader
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * CloudCode CP50 SDK Printer Adapter
 *
 * Binds to the CloudCode AIDL service (com.cloudcode.sdk.AIDL_SERVICE)
 * and prints via PrinterProvider.printText() / startPrint().
 *
 * The SDK APK is pre-installed at /system/priv-app/CloudCodeSDKServer/
 * and provides the AIDL interfaces. We load its classes at runtime
 * using DexClassLoader so we don't need compile-time SDK dependencies.
 */
class CloudCodeSdkPrinter(private val context: Context) {

    companion object {
        private const val TAG = "CloudCodeSdk"
        private const val SDK_ACTION = "com.cloudcode.sdk.AIDL_SERVICE"
        private const val SDK_PACKAGE = "com.cloudcode.sdkserver"
        private const val SDK_APK_PATH = "/system/priv-app/CloudCodeSDKServer/CloudCodeSDKServer.apk"

        // AIDL class names from the SDK
        private const val PRINTER_PROVIDER_CLASS = "com.cloudcode.sdkaidl.device.printer.PrinterProvider"
        private const val PRINTER_PROVIDER_STUB = "com.cloudcode.sdkaidl.device.printer.PrinterProvider\$Stub"
        private const val PRINTER_FORMAT_CLASS = "com.cloudcode.sdkaidl.device.printer.PrinterFormat"
    }

    // Loaded SDK classes (via DexClassLoader)
    private var sdkClassLoader: ClassLoader? = null
    private var printerProviderClass: Class<*>? = null
    private var printerFormatClass: Class<*>? = null
    private var stubClass: Class<*>? = null

    // AIDL proxy objects
    private var printerProvider: Any? = null
    private var serviceConnection: ServiceConnection? = null
    private var bound = false

    // ==================== PUBLIC API ====================

    fun isAvailable(): Boolean {
        return try {
            val intent = Intent(SDK_ACTION)
            intent.setPackage(SDK_PACKAGE)
            val services = context.packageManager.queryIntentServices(intent, PackageManager.MATCH_ALL)
            val available = services.isNotEmpty()
            if (available) {
                Log.d(TAG, "CloudCode SDK service found")
            }
            available
        } catch (e: Exception) {
            Log.e(TAG, "isAvailable check failed", e)
            false
        }
    }

    fun print(data: ByteArray): PrintResult {
        Log.d(TAG, "print() called with ${data.size} bytes")

        // Step 1: Ensure SDK classes are loaded
        if (sdkClassLoader == null) {
            val loadResult = loadSdkClasses()
            if (!loadResult.success) return loadResult
        }

        // Step 2: Ensure service is bound and PrinterProvider obtained
        if (printerProvider == null) {
            val bindResult = bindAndGetPrinter()
            if (!bindResult.success) return bindResult
        }

        // Step 3: Parse ESC/POS data to text lines
        val textLines = parseEscPosToTextLines(data)
        Log.d(TAG, "Parsed ${textLines.size} text lines from ESC/POS data")

        if (textLines.isEmpty()) {
            return PrintResult(false, "No printable text found in data")
        }

        // Step 4: Print each line via SDK
        return printTextLines(textLines)
    }

    fun cleanup() {
        try {
            if (bound && serviceConnection != null) {
                context.unbindService(serviceConnection!!)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Cleanup error: ${e.message}")
        }
        printerProvider = null
        bound = false
    }

    // ==================== SDK CLASS LOADING ====================

    private fun loadSdkClasses(): PrintResult {
        return try {
            val apkFile = java.io.File(SDK_APK_PATH)
            if (!apkFile.exists()) {
                return PrintResult(false, "CloudCode SDK APK not found at $SDK_APK_PATH")
            }

            val dexOutputDir = context.codeCacheDir.absolutePath

            sdkClassLoader = DexClassLoader(
                SDK_APK_PATH,
                dexOutputDir,
                null,
                context.classLoader
            )

            val cl = sdkClassLoader!!

            printerProviderClass = cl.loadClass(PRINTER_PROVIDER_CLASS)
            stubClass = cl.loadClass(PRINTER_PROVIDER_STUB)
            printerFormatClass = cl.loadClass(PRINTER_FORMAT_CLASS)

            Log.d(TAG, "SDK classes loaded successfully")
            Log.d(TAG, "  PrinterProvider: ${printerProviderClass?.name}")
            Log.d(TAG, "  Stub: ${stubClass?.name}")
            Log.d(TAG, "  PrinterFormat: ${printerFormatClass?.name}")

            // Log PrinterProvider methods for diagnostics
            printerProviderClass?.methods?.forEach { m ->
                if (m.declaringClass != Any::class.java) {
                    val params = m.parameterTypes.joinToString(", ") { it.simpleName }
                    Log.d(TAG, "  Method: ${m.returnType.simpleName} ${m.name}($params)")
                }
            }

            PrintResult(true)

        } catch (e: ClassNotFoundException) {
            Log.e(TAG, "SDK class not found", e)
            PrintResult(false, "CloudCode SDK class not found: ${e.message}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to load SDK classes", e)
            PrintResult(false, "SDK load error: ${e.message}")
        }
    }

    // ==================== SERVICE BINDING ====================

    private fun bindAndGetPrinter(): PrintResult {
        val latch = CountDownLatch(1)
        var serviceBinder: IBinder? = null
        var bindError: String? = null

        val connection = object : ServiceConnection {
            override fun onServiceConnected(name: ComponentName?, binder: IBinder?) {
                Log.d(TAG, "Service connected: $name")
                serviceBinder = binder
                latch.countDown()
            }

            override fun onServiceDisconnected(name: ComponentName?) {
                Log.w(TAG, "Service disconnected")
                printerProvider = null
                bound = false
            }
        }

        serviceConnection = connection

        val intent = Intent(SDK_ACTION)
        intent.setPackage(SDK_PACKAGE)

        return try {
            val bindOk = context.bindService(intent, connection, Context.BIND_AUTO_CREATE)
            if (!bindOk) {
                return PrintResult(false, "bindService returned false for CloudCode SDK")
            }

            if (!latch.await(5, TimeUnit.SECONDS)) {
                return PrintResult(false, "Timeout binding to CloudCode SDK service")
            }

            val binder = serviceBinder
                ?: return PrintResult(false, "Service binder is null")

            bound = true

            val descriptor = binder.interfaceDescriptor
            Log.d(TAG, "Service interface descriptor: $descriptor")

            // Load the main service Stub and get proxy
            val mainStubClass = sdkClassLoader!!.loadClass("${descriptor}\$Stub")
            val asInterface = mainStubClass.getMethod("asInterface", IBinder::class.java)
            val mainService = asInterface.invoke(null, binder)

            Log.d(TAG, "Main service proxy: ${mainService?.javaClass?.name}")

            // Log available methods on main service
            mainService?.javaClass?.methods?.forEach { m ->
                if (m.declaringClass != Any::class.java &&
                    m.declaringClass.name.contains("cloudcode")) {
                    val params = m.parameterTypes.joinToString(", ") { it.simpleName }
                    Log.d(TAG, "  Main: ${m.returnType.simpleName} ${m.name}($params)")
                }
            }

            // Call getPrinterProvider() on main service
            val getPrinterProvider = mainService!!.javaClass.getMethod("getPrinterProvider")
            printerProvider = getPrinterProvider.invoke(mainService)

            if (printerProvider == null) {
                return PrintResult(false, "getPrinterProvider() returned null")
            }

            Log.d(TAG, "PrinterProvider obtained: ${printerProvider?.javaClass?.name}")

            PrintResult(true)

        } catch (e: Exception) {
            Log.e(TAG, "Bind/connect failed", e)
            PrintResult(false, "CloudCode SDK bind error: ${e.message}")
        }
    }

    // ==================== PRINTING ====================

    // Cached SDK constants (read once via reflection)
    private var alignLeft: String? = null
    private var alignCenter: String? = null
    private var alignRight: String? = null
    private var fontSizeMedium: Int = 26
    private var fontSizeLarge: Int = 32
    private var fontSizeSmall: Int = 20
    private var doubleHeightVal: Int = 2
    private var doubleWidthVal: Int = 2
    private var normalHeightVal: Int = 1
    private var normalWidthVal: Int = 1
    private var constantsLoaded = false

    private fun loadFormatConstants() {
        if (constantsLoaded) return
        val fc = printerFormatClass ?: return
        try {
            alignLeft = getStaticStringField(fc, "ALIGN_LEFT") ?: "left"
            alignCenter = getStaticStringField(fc, "ALIGN_CENTER") ?: "center"
            alignRight = getStaticStringField(fc, "ALIGN_RIGHT") ?: "right"
            fontSizeSmall = getStaticIntField(fc, "FONT_SIZE_SMALL") ?: 16
            fontSizeMedium = getStaticIntField(fc, "FONT_SIZE_MEDIUM") ?: 24
            fontSizeLarge = getStaticIntField(fc, "FONT_SIZE_LARGE") ?: 32
            doubleHeightVal = getStaticIntField(fc, "DOUBLE_HEIGHT") ?: 1
            doubleWidthVal = getStaticIntField(fc, "DOUBLE_WIDTH") ?: 1
            normalHeightVal = getStaticIntField(fc, "NORMAL_HEIGHT") ?: 0
            normalWidthVal = getStaticIntField(fc, "NORMAL_WIDTH") ?: 0
            constantsLoaded = true
            Log.d(TAG, "Format constants: align=$alignLeft/$alignCenter/$alignRight font=$fontSizeSmall/$fontSizeMedium/$fontSizeLarge")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load format constants: ${e.message}")
        }
    }

    private fun getStaticStringField(clazz: Class<*>, name: String): String? {
        return try {
            val f = clazz.getDeclaredField(name)
            f.isAccessible = true
            f.get(null) as? String
        } catch (_: Exception) { null }
    }

    private fun getStaticIntField(clazz: Class<*>, name: String): Int? {
        return try {
            val f = clazz.getDeclaredField(name)
            f.isAccessible = true
            f.getInt(null)
        } catch (_: Exception) { null }
    }

    private fun printTextLines(lines: List<TextLine>): PrintResult {

    val provider = printerProvider ?: return PrintResult(false, "PrinterProvider not available")
    val formatClass = printerFormatClass ?: return PrintResult(false, "PrinterFormat class not loaded")

    return try {

        loadFormatConstants()

        provider.javaClass.getMethod("open").invoke(provider)

        val printTextMethod = provider.javaClass.getMethod(
            "printText",
            formatClass,
            String::class.java
        )

        val startPrintMethod = provider.javaClass.getMethod("startPrint")

        val setFontSize = formatClass.getMethod("setFontSize", Int::class.javaPrimitiveType)
        val setAlignType = formatClass.getMethod("setAlignType", String::class.java)
        val setFakeBold = formatClass.getMethod("setFakeBold", Boolean::class.javaPrimitiveType)
        val setDoubleHeight = formatClass.getMethod("setDoubleHeight", Int::class.javaPrimitiveType)
        val setDoubleWidth = formatClass.getMethod("setDoubleWith", Int::class.javaPrimitiveType)

        val setLineSpacing = try {
            formatClass.getMethod("setLineSpacing", Int::class.javaPrimitiveType)
            } catch (e: Exception) { null }


        val setPageWidthMethod = try {
            formatClass.getMethod("setPageWidth", Int::class.javaPrimitiveType)
        } catch (e: Exception) { null }

        for (line in lines) {

            val format = formatClass.getConstructor().newInstance()

            // 58mm paper width
            setPageWidthMethod?.invoke(format, 384)

            val fontSize = fontSizeLarge

            setFontSize.invoke(format, fontSize)

            val align = when (line.alignment) {
                1 -> alignCenter
                2 -> alignRight
                else -> alignLeft
            }

            setAlignType.invoke(format, align)
            setLineSpacing?.invoke(format, 8)

            // Disable fake bold
            setFakeBold.invoke(format, false)

            setDoubleHeight.invoke(format,
                if (line.doubleHeight) doubleHeightVal else normalHeightVal)

            setDoubleWidth.invoke(format,
                if (line.doubleWidth) doubleWidthVal else normalWidthVal)

            val text =
                if (line.text.isEmpty())
                    "\n"
                else
                    wrap58mm(line.text) + "\n"

            printTextMethod.invoke(provider, format, text)
        }

        val result = startPrintMethod.invoke(provider) as Int

        if (result == 0) PrintResult(true)
        else PrintResult(false, "startPrint failed: $result")

    } catch (e: Exception) {
        Log.e(TAG, "Print error", e)
        PrintResult(false, e.message ?: "Print failed")
    }
}


    // ==================== ESC/POS PARSER ====================

    data class TextLine(
        val text: String,
        val alignment: Int = 0,   // 0=left, 1=center, 2=right
        val bold: Boolean = false,
        val doubleHeight: Boolean = false,
        val doubleWidth: Boolean = false
    )

    /**
     * Parse ESC/POS byte data and extract text lines with formatting hints.
     * This is a best-effort parser - it strips escape sequences and keeps text.
     */
    private fun parseEscPosToTextLines(data: ByteArray): List<TextLine> {
        val lines = mutableListOf<TextLine>()
        val currentLine = StringBuilder()
        var alignment = 0
        var bold = false
        var doubleHeight = false
        var doubleWidth = false
        var i = 0

        while (i < data.size) {
            val b = data[i].toInt() and 0xFF

            when (b) {
                // ESC commands (0x1B)
                0x1B -> {
                    if (i + 1 < data.size) {
                        val cmd = data[i + 1].toInt() and 0xFF
                        when (cmd) {
                            0x40 -> {
                                // ESC @ - Initialize printer
                                i += 2
                                continue
                            }
                            0x61 -> {
                                // ESC a n - Alignment
                                if (i + 2 < data.size) {
                                    alignment = data[i + 2].toInt() and 0xFF
                                    i += 3
                                    continue
                                }
                            }
                            0x45 -> {
                                // ESC E n - Bold on/off
                                if (i + 2 < data.size) {
                                    bold = (data[i + 2].toInt() and 0xFF) != 0
                                    i += 3
                                    continue
                                }
                            }
                            0x21 -> {
                                // ESC ! n - Print mode
                                if (i + 2 < data.size) {
                                    val mode = data[i + 2].toInt() and 0xFF
                                    bold = (mode and 0x08) != 0
                                    doubleHeight = (mode and 0x10) != 0
                                    doubleWidth = (mode and 0x20) != 0
                                    i += 3
                                    continue
                                }
                            }
                            0x64 -> {
                                // ESC d n - Print and feed n lines
                                if (i + 2 < data.size) {
                                    if (currentLine.isNotEmpty()) {
                                        lines.add(TextLine(currentLine.toString(), alignment, bold, doubleHeight, doubleWidth))
                                        currentLine.clear()
                                    }
                                    val feedLines = data[i + 2].toInt() and 0xFF
                                    repeat(feedLines) {
                                        lines.add(TextLine("", alignment))
                                    }
                                    i += 3
                                    continue
                                }
                            }
                            else -> {
                                // Unknown ESC command - skip ESC + command byte
                                i += 2
                                // Some commands have additional parameter bytes
                                if (i < data.size && (data[i].toInt() and 0xFF) < 0x20) {
                                    i++ // Skip one parameter byte
                                }
                                continue
                            }
                        }
                    }
                    i++
                    continue
                }

                // GS commands (0x1D)
                0x1D -> {
                    if (i + 1 < data.size) {
                        val cmd = data[i + 1].toInt() and 0xFF
                        when (cmd) {
                            0x21 -> {
                                // GS ! n - Character size
                                if (i + 2 < data.size) {
                                    val size = data[i + 2].toInt() and 0xFF
                                    doubleWidth = (size and 0x0F) > 0
                                    doubleHeight = (size and 0xF0) > 0
                                    bold = doubleWidth || doubleHeight
                                    i += 3
                                    continue
                                }
                            }
                            0x56 -> {
                                // GS V - Paper cut
                                if (currentLine.isNotEmpty()) {
                                    lines.add(TextLine(currentLine.toString(), alignment, bold, doubleHeight, doubleWidth))
                                    currentLine.clear()
                                }
                                i += if (i + 2 < data.size) 3 else 2
                                continue
                            }
                            0x42 -> {
                                // GS B n - Black/white reverse
                                i += 3
                                continue
                            }
                            else -> {
                                // Unknown GS command
                                i += 2
                                if (i < data.size && (data[i].toInt() and 0xFF) < 0x20) {
                                    i++
                                }
                                continue
                            }
                        }
                    }
                    i++
                    continue
                }

                // Line feed
                0x0A -> {
                    lines.add(TextLine(currentLine.toString(), alignment, bold, doubleHeight, doubleWidth))
                    currentLine.clear()
                    i++
                    continue
                }

                // Carriage return (ignore)
                0x0D -> {
                    i++
                    continue
                }

                // DLE commands (0x10) - real-time status
                0x10 -> {
                    i += if (i + 2 < data.size) 3 else 2
                    continue
                }

                // Printable characters
                else -> {
                    if (b >= 0x20) {
                        currentLine.append(b.toChar())
                    }
                    i++
                }
            }
        }

        // Flush remaining text
        if (currentLine.isNotEmpty()) {
            lines.add(TextLine(currentLine.toString(), alignment, bold, doubleHeight, doubleWidth))
        }

        return lines
    }
    private fun wrap58mm(text: String): String {
        val maxChars = 32
        val result = StringBuilder()
        var index = 0

        while (index < text.length) {
            val end = (index + maxChars).coerceAtMost(text.length)
            result.append(text.substring(index, end))
            result.append("\n")
            index += maxChars
        }

        return result.toString().trim()
    }
}
