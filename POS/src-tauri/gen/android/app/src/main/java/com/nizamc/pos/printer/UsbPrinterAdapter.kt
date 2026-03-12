package com.nizamc.pos.printer

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.hardware.usb.*
import android.os.Build
import android.util.Log

class UsbPrinterAdapter(private val context: Context) {

    private val usbManager =
        context.getSystemService(Context.USB_SERVICE) as UsbManager

    companion object {
        const val ACTION_USB_PERMISSION = "com.nizamc.pos.USB_PERMISSION"
    }

    // --------------------------------------------------
    // Detect if any USB ESC/POS printer is available
    // --------------------------------------------------
    fun isAvailable(): Boolean {
        val deviceList = usbManager.deviceList

        for (device in deviceList.values) {
            if (hasPrinterInterface(device)) {
                return true
            }
        }
        return false
    }

    // --------------------------------------------------
    // Print RAW ESC/POS data
    // --------------------------------------------------
    fun print(data: ByteArray): PrintResult {

        val device = findPrinterDevice()
            ?: return PrintResult(false, "No USB printer found")

        if (!usbManager.hasPermission(device)) {
            requestPermission(device)
            return PrintResult(false, "USB permission required")
        }

        return sendToPrinter(device, data)
    }

    // --------------------------------------------------
    // Find first USB printer device
    // --------------------------------------------------
    private fun findPrinterDevice(): UsbDevice? {
        val deviceList = usbManager.deviceList

        for (device in deviceList.values) {
            if (hasPrinterInterface(device)) {
                return device
            }
        }
        return null
    }

    // --------------------------------------------------
    // Check if device has printer interface
    // --------------------------------------------------
    private fun hasPrinterInterface(device: UsbDevice): Boolean {
        // Pass 1: standard USB Printer Class 7
        for (i in 0 until device.interfaceCount) {
            if (device.getInterface(i).interfaceClass == UsbConstants.USB_CLASS_PRINTER) {
                return true
            }
        }
        // Pass 2: known thermal printer vendor IDs (vendor-specific USB class)
        val knownPrinterVids = setOf(
            0x04B8, 0x0519, 0x6868, 0x20D1, 0x0A5F,
            0x154F, 0x28E9, 0x1504, 0x0483, 0x1D90, 0x0FE6,
        )
        if (device.vendorId in knownPrinterVids) return true

        // Pass 3: bulk OUT endpoint heuristic — catches no-brand / unknown-VID printers
        // (same exclusion list as BuiltinPrinter.findUsbPrinter)
        val nonPrinterClasses = setOf(
            UsbConstants.USB_CLASS_HUB, UsbConstants.USB_CLASS_MASS_STORAGE,
            UsbConstants.USB_CLASS_HID, UsbConstants.USB_CLASS_AUDIO,
            UsbConstants.USB_CLASS_VIDEO, UsbConstants.USB_CLASS_COMM,
            UsbConstants.USB_CLASS_CDC_DATA,
        )
        if (device.deviceClass in nonPrinterClasses) return false
        for (i in 0 until device.interfaceCount) {
            val iface = device.getInterface(i)
            if (iface.interfaceClass in nonPrinterClasses) continue
            for (j in 0 until iface.endpointCount) {
                val ep = iface.getEndpoint(j)
                if (ep.type == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                    ep.direction == UsbConstants.USB_DIR_OUT) return true
            }
        }
        return false
    }

    // --------------------------------------------------
    // Request permission
    // --------------------------------------------------
    private fun requestPermission(device: UsbDevice) {
        // FLAG_MUTABLE is required on Android 12+ so UsbManager can add EXTRA_PERMISSION_GRANTED
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
            PendingIntent.FLAG_MUTABLE else 0

        val permissionIntent = PendingIntent.getBroadcast(
            context,
            0,
            Intent(ACTION_USB_PERMISSION),
            flags
        )

        usbManager.requestPermission(device, permissionIntent)
    }

    // --------------------------------------------------
    // Send ESC/POS via bulkTransfer
    // --------------------------------------------------
    private fun sendToPrinter(device: UsbDevice, data: ByteArray): PrintResult {

        val connection = usbManager.openDevice(device)
            ?: return PrintResult(false, "Cannot open USB device")

        // Find the printer interface (Class 7) — don't assume it's always index 0
        val usbInterface = (0 until device.interfaceCount)
            .map { device.getInterface(it) }
            .firstOrNull { it.interfaceClass == UsbConstants.USB_CLASS_PRINTER }
            ?: device.getInterface(0) // fall back to index 0 for non-standard devices

        try {

            connection.claimInterface(usbInterface, true)

            val endpointOut = (0 until usbInterface.endpointCount)
                .map { usbInterface.getEndpoint(it) }
                .firstOrNull { it.direction == UsbConstants.USB_DIR_OUT }
                ?: return PrintResult(false, "No OUT endpoint found")

            val result = connection.bulkTransfer(
                endpointOut,
                data,
                data.size,
                5000
            )

            return if (result >= 0) {
                PrintResult(true, null)
            } else {
                PrintResult(false, "USB transfer failed (code $result)")
            }

        } catch (e: Exception) {
            Log.e("UsbPrinterAdapter", "Print error", e)
            return PrintResult(false, e.message)
        } finally {
            try { connection.releaseInterface(usbInterface) } catch (_: Exception) {}
            connection.close()
        }
    }
}