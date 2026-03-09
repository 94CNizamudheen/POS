package com.hashone.hashoneplat.service

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat

/**
 * JavaScript bridge for controlling the WebSocket Foreground Service
 *
 * Exposed to JavaScript as `window.WebSocketService`
 */
class WebSocketServiceBridge(private val context: Context) {

    companion object {
        private const val TAG = "WebSocketServiceBridge"
        const val JS_INTERFACE_NAME = "WebSocketService"
    }

    /**
     * Start the WebSocket foreground service
     * Call this when device is set to POS role
     */
    @JavascriptInterface
    fun startService(): Boolean {
        return try {
            // Check notification permission on Android 13+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                val hasPermission = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.POST_NOTIFICATIONS
                ) == PackageManager.PERMISSION_GRANTED

                if (!hasPermission) {
                    Log.w(TAG, "POST_NOTIFICATIONS permission not granted, service may not show notification")
                }
            }

            WebSocketForegroundService.startService(context)
            Log.d(TAG, "WebSocket foreground service started")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start WebSocket service: ${e.message}")
            false
        }
    }

    /**
     * Stop the WebSocket foreground service
     * Call this when device role changes from POS
     */
    @JavascriptInterface
    fun stopService(): Boolean {
        return try {
            WebSocketForegroundService.stopService(context)
            Log.d(TAG, "WebSocket foreground service stopped")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop WebSocket service: ${e.message}")
            false
        }
    }

    /**
     * Check if the foreground service is currently running
     */
    @JavascriptInterface
    fun isServiceRunning(): Boolean {
        return WebSocketForegroundService.isServiceRunning()
    }

    /**
     * Check if notification permission is granted (Android 13+)
     */
    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true // No runtime permission needed before Android 13
        }
    }
}