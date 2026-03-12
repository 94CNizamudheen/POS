package com.nizamc.pos.printer

import android.content.Context
import android.content.Intent
import android.util.Log

class SunmiPrinterAdapter(private val context: Context) {

    private val SERVICE_ACTION = "woyou.aidlservice.jiuiv5.IWoyouService"

    fun isAvailable(): Boolean {
        val intent = Intent(SERVICE_ACTION)
        val services = context.packageManager.queryIntentServices(intent, 0)
        return services.isNotEmpty()
    }

    fun print(data: ByteArray): PrintResult {
        return try {

            // SUNMI printers accept ESC/POS directly
            val sunmiService = SunmiServiceHolder.getService(context)
                ?: return PrintResult(false, "Sunmi printer service not bound")

            sunmiService.sendRAWData(data, null)

            PrintResult(true)

        } catch (e: Exception) {
            PrintResult(false, e.message)
        }
    }
}