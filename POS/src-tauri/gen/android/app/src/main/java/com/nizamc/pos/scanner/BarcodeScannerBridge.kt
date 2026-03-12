package com.nizamc.pos.scanner

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * Handles barcode input from built-in hardware scanners on Android POS terminals.
 *
 * Most terminals support two modes:
 *  - Keyboard/HID mode  → already handled by the JS keydown listener
 *  - Intent broadcast   → handled here via BroadcastReceiver
 *
 * Supported brands (broadcast mode):
 *  - Sunmi   (T2 Lite, V2, V2 Pro, D3, P2 Pro, …)
 *  - Urovo   (DT40, i9100, i9200, …)
 *  - MSWAP / Chainway (C72, C3000, …)
 *  - CloudCode / CloudEA
 *  - Honeywell
 *  - Zebra DataWedge (legacy broadcast profile)
 *  - Generic fallback (common extra key names)
 *
 * When a scan is detected it calls  window.onAndroidBarcodeScan(code)  in JavaScript.
 * Exposed to JavaScript as  window.AndroidBarcodeScanner
 */
class BarcodeScannerBridge(
    private val activity: Activity,
    private val webView: WebView
) {

    companion object {
        private const val TAG = "BarcodeScannerBridge"
        const val JS_INTERFACE_NAME = "AndroidBarcodeScanner"

        // Broadcast action strings for every supported brand
        private val SCANNER_ACTIONS = listOf(
            "com.sunmi.scanner.ACTION_DATA_CODE_RECEIVED",      // Sunmi
            "android.intent.ACTION_DECODE_DATA",                 // Urovo (primary)
            "com.urovo.scanner.ACTION_DATA_CODE_RECEIVED",       // Urovo (alternate)
            "scan.rcv.message",                                  // Chainway / MSWAP
            "com.mswap.scanner.ACTION_BARCODE_RESULT",           // MSWAP alternate
            "com.cloudea.scanner.ACTION_DATA_CODE_RECEIVED",     // CloudCode / CloudEA
            "com.honeywell.decode.intent.action.EDIT_DATA",      // Honeywell
            "com.symbol.datawedge.data",                         // Zebra DataWedge (legacy)
            "nl.dsum.action.ACTION_RECEIVE_DATA",                // Generic POS scanners
            "com.android.server.scannerservice.scanning",        // Some MediaTek-based scanners
        )
    }

    private var isRegistered = false

    private val scanReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val barcode = extractBarcode(intent)
            if (barcode.isNullOrBlank()) {
                Log.w(TAG, "Scan intent received but barcode was empty [${intent.action}]")
                return
            }
            Log.d(TAG, "Scan received [${intent.action}]: $barcode")
            notifyJavaScript(barcode)
        }
    }

    /**
     * Extract the barcode string from the intent extras.
     * Each brand uses different extra key names — try the known one first,
     * then fall back to common aliases.
     */
    private fun extractBarcode(intent: Intent): String? = when (intent.action) {
        "com.sunmi.scanner.ACTION_DATA_CODE_RECEIVED" ->
            intent.getStringExtra("data")

        "android.intent.ACTION_DECODE_DATA",
        "com.urovo.scanner.ACTION_DATA_CODE_RECEIVED" ->
            intent.getStringExtra("barcode_string")
                ?: intent.getStringExtra("SCAN_BARCODE1")

        "scan.rcv.message",
        "com.mswap.scanner.ACTION_BARCODE_RESULT" ->
            // Chainway SDK has a typo ("barocode") in their official docs
            intent.getStringExtra("barocode")
                ?: intent.getStringExtra("barcode")

        "com.cloudea.scanner.ACTION_DATA_CODE_RECEIVED" ->
            intent.getStringExtra("data")

        "com.honeywell.decode.intent.action.EDIT_DATA" ->
            intent.getStringExtra("data")

        "com.symbol.datawedge.data" ->
            intent.getStringExtra("com.symbol.datawedge.data_string")
                ?: intent.getStringExtra("data")

        else ->
            // Generic fallback — try common extra key names in priority order
            intent.getStringExtra("data")
                ?: intent.getStringExtra("barcode")
                ?: intent.getStringExtra("SCAN_RESULT")
                ?: intent.getStringExtra("scannerdata")
                ?: intent.getStringExtra("scan_result")
    }

    /**
     * Push the barcode to the JavaScript layer via evaluateJavascript.
     * The barcode is escaped to be safely embedded in a JS string literal.
     */
    private fun notifyJavaScript(barcode: String) {
        val escaped = barcode
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r")

        val js = "window.onAndroidBarcodeScan?.('$escaped');"

        activity.runOnUiThread {
            webView.evaluateJavascript(js, null)
        }
    }

    /**
     * Register the BroadcastReceiver for all known scanner intent actions.
     * Safe to call multiple times — registering is skipped if already active.
     */
    fun register() {
        if (isRegistered) return

        val filter = IntentFilter()
        SCANNER_ACTIONS.forEach { filter.addAction(it) }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+ requires explicit exported flag for dynamic receivers
            activity.registerReceiver(scanReceiver, filter, Context.RECEIVER_EXPORTED)
        } else {
            activity.registerReceiver(scanReceiver, filter)
        }

        isRegistered = true
        Log.d(TAG, "BroadcastReceiver registered for ${SCANNER_ACTIONS.size} scanner actions")
    }

    /**
     * Unregister the BroadcastReceiver. Call from Activity.onDestroy.
     */
    fun unregister() {
        if (!isRegistered) return
        try {
            activity.unregisterReceiver(scanReceiver)
            isRegistered = false
            Log.d(TAG, "BroadcastReceiver unregistered")
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering receiver: ${e.message}")
        }
    }

    /**
     * JavaScript-callable: returns true if the BroadcastReceiver is active.
     * Use this on the JS side to know if hardware scanner broadcast support is running.
     */
    @JavascriptInterface
    fun isAvailable(): Boolean = isRegistered
}
