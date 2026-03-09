
package com.hashone.hashoneplat.printer

import android.content.Context

class SerialPrinterAdapter(context: Context) {

    private val builtin = BuiltinPrinter.getInstance(context)

    fun isAvailable(): Boolean {
        return builtin.detectPrinter().type == "serial_builtin"
    }

    fun print(data: ByteArray): PrintResult {
        return builtin.printRaw(data)
    }
}