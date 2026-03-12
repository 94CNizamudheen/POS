package com.nizamc.pos.printer

import android.content.Context
import android.util.Log

/**
 * PAX Printer Service Wrapper
 * Wraps PAX SDK printer functions if available
 */
object PaxPrinterService {

    private const val TAG = "PaxPrinterService"

    fun getPrinter(context: Context): IPaxPrinter {
        return PaxPrinterImpl(context)
    }
}

/**
 * PAX Printer Interface
 */
interface IPaxPrinter {
    fun init()
    fun printStr(text: String, callback: Any?)
    fun start()
}

/**
 * PAX Printer Implementation
 * Tries to use PAX SDK via reflection if available
 */
class PaxPrinterImpl(private val context: Context) : IPaxPrinter {

    private val TAG = "PaxPrinterImpl"
    private var paxPrinter: Any? = null

    init {
        try {
            // Try to get PAX printer via reflection
            val dalClass = Class.forName("com.pax.dal.IDAL")
            val printerClass = Class.forName("com.pax.dal.IPrinter")

            // Get DAL instance
            val getDalMethod = Class.forName("com.pax.neptunelite.api.NeptuneLiteUser")
                .getMethod("getInstance")
                .invoke(null)

            if (getDalMethod != null) {
                val dalInstance = getDalMethod.javaClass.getMethod("getDal", Context::class.java)
                    .invoke(getDalMethod, context)

                paxPrinter = dalInstance?.javaClass?.getMethod("getPrinter")?.invoke(dalInstance)
            }

            Log.d(TAG, "PAX printer initialized: ${paxPrinter != null}")

        } catch (e: ClassNotFoundException) {
            Log.d(TAG, "PAX SDK not available")
        } catch (e: Exception) {
            Log.w(TAG, "PAX init failed: ${e.message}")
        }
    }

    override fun init() {
        try {
            paxPrinter?.javaClass?.getMethod("init")?.invoke(paxPrinter)
        } catch (e: Exception) {
            Log.w(TAG, "PAX init() failed: ${e.message}")
            throw RuntimeException("PAX printer init failed")
        }
    }

    override fun printStr(text: String, callback: Any?) {
        try {
            paxPrinter?.javaClass?.getMethod("printStr", String::class.java, Any::class.java)
                ?.invoke(paxPrinter, text, callback)
        } catch (e: Exception) {
            Log.w(TAG, "PAX printStr() failed: ${e.message}")
            throw RuntimeException("PAX printer printStr failed")
        }
    }

    override fun start() {
        try {
            paxPrinter?.javaClass?.getMethod("start")?.invoke(paxPrinter)
        } catch (e: Exception) {
            Log.w(TAG, "PAX start() failed: ${e.message}")
            throw RuntimeException("PAX printer start failed")
        }
    }
}