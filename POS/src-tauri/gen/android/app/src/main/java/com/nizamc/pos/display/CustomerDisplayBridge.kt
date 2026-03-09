package com.hashone.hashoneplat.display

import android.app.Activity
import android.content.Context
import android.hardware.display.DisplayManager
import android.util.Log
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject

/**
 * JavaScript bridge for controlling the customer-facing secondary display
 * on Android POS devices (Imin Swan1, Sunmi T2, etc.)
 *
 * Exposed to JavaScript as `window.AndroidCustomerDisplay`
 *
 * Uses Android's Presentation API with DisplayManager to render a standalone
 * HTML page on the secondary display, communicating via evaluateJavascript.
 */
class CustomerDisplayBridge(private val activity: Activity) {

    companion object {
        private const val TAG = "CustomerDisplayBridge"
        const val JS_INTERFACE_NAME = "AndroidCustomerDisplay"
    }

    private var presentation: CustomerDisplayPresentation? = null

    /**
     * Check if device has a secondary display suitable for customer content
     */
    @JavascriptInterface
    fun hasSecondaryDisplay(): Boolean {
        return try {
            val dm = activity.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
            val displays = dm.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)
            val has = displays.isNotEmpty()
            Log.d(TAG, "hasSecondaryDisplay: $has (found ${displays.size} presentation displays)")
            has
        } catch (e: Exception) {
            Log.e(TAG, "Error checking displays: ${e.message}")
            false
        }
    }

    /**
     * Get info about available secondary displays
     * Returns JSON string: { "displays": [{ "id": 1, "name": "...", "width": 1024, "height": 600 }] }
     */
    @JavascriptInterface
    fun getDisplayInfo(): String {
        return try {
            val dm = activity.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
            val displays = dm.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)

            val arr = JSONArray()
            for (display in displays) {
                val metrics = android.util.DisplayMetrics()
                @Suppress("DEPRECATION")
                display.getMetrics(metrics)

                val obj = JSONObject().apply {
                    put("id", display.displayId)
                    put("name", display.name ?: "Secondary Display")
                    put("width", metrics.widthPixels)
                    put("height", metrics.heightPixels)
                }
                arr.put(obj)
            }

            JSONObject().put("displays", arr).toString()
        } catch (e: Exception) {
            Log.e(TAG, "Error getting display info: ${e.message}")
            JSONObject().put("displays", JSONArray()).toString()
        }
    }

    /**
     * Open the customer display on the secondary screen
     * @param logoUrl URL of the logo to show on idle screen
     * @param welcomeMessage Welcome text to show on idle screen
     * @return true if display was opened successfully
     */
    @JavascriptInterface
    fun openDisplay(logoUrl: String, welcomeMessage: String): Boolean {
        Log.d(TAG, "openDisplay called: logo=$logoUrl, message=$welcomeMessage")
        return try {
            // Close existing presentation if any
            closeDisplayInternal()

            val dm = activity.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
            val displays = dm.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)

            if (displays.isEmpty()) {
                Log.w(TAG, "No secondary display found")
                return false
            }

            // Use the first available presentation display
            val targetDisplay = displays[0]
            Log.d(TAG, "Opening customer display on: ${targetDisplay.name} (${targetDisplay.displayId})")

            activity.runOnUiThread {
                try {
                    val pres = CustomerDisplayPresentation(activity, targetDisplay)
                    pres.setInitialData(logoUrl, welcomeMessage)
                    pres.show()
                    presentation = pres
                    Log.d(TAG, "Customer display opened successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to show presentation: ${e.message}", e)
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error opening display: ${e.message}", e)
            false
        }
    }

    /**
     * Close the customer display
     * @return true if display was closed successfully
     */
    @JavascriptInterface
    fun closeDisplay(): Boolean {
        Log.d(TAG, "closeDisplay called")
        return try {
            activity.runOnUiThread {
                closeDisplayInternal()
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error closing display: ${e.message}")
            false
        }
    }

    /**
     * Check if the customer display is currently showing
     */
    @JavascriptInterface
    fun isDisplayOpen(): Boolean {
        val isOpen = presentation?.isShowing == true
        Log.d(TAG, "isDisplayOpen: $isOpen")
        return isOpen
    }

    /**
     * Send a JSON update to the customer display
     * @param jsonData JSON string with type and payload
     */
    @JavascriptInterface
    fun sendUpdate(jsonData: String) {
        Log.d(TAG, "sendUpdate called: ${jsonData.take(200)}...")
        activity.runOnUiThread {
            try {
                if (presentation == null) {
                    Log.w(TAG, "sendUpdate: presentation is null, ignoring")
                    return@runOnUiThread
                }
                if (presentation?.isShowing != true) {
                    Log.w(TAG, "sendUpdate: presentation is not showing, ignoring")
                    return@runOnUiThread
                }
                presentation?.updateContent(jsonData)
                Log.d(TAG, "sendUpdate: forwarded to presentation")
            } catch (e: Exception) {
                Log.e(TAG, "Error sending update: ${e.message}", e)
            }
        }
    }

    /**
     * Internal cleanup — dismiss presentation
     */
    private fun closeDisplayInternal() {
        try {
            presentation?.dismiss()
            presentation = null
            Log.d(TAG, "Customer display closed")
        } catch (e: Exception) {
            Log.e(TAG, "Error dismissing presentation: ${e.message}")
        }
    }

    /**
     * Called from Activity lifecycle to clean up
     */
    fun onDestroy() {
        closeDisplayInternal()
    }
}
