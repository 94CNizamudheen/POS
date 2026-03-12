package com.nizamc.pos.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import com.nizamc.pos.MainActivity
import com.nizamc.pos.R

/**
 * Foreground Service to keep the WebSocket server running on Android
 *
 * This service ensures the WebSocket server stays active even when
 * the app is in the background or the screen is off.
 */
class WebSocketForegroundService : Service() {

    companion object {
        private const val TAG = "WebSocketService"
        private const val CHANNEL_ID = "hashtouch_websocket_channel"
        private const val CHANNEL_NAME = "POS Server"
        private const val NOTIFICATION_ID = 1001

        private const val ACTION_START = "com.nizamc.pos.action.START_WS_SERVICE"
        private const val ACTION_STOP = "com.nizamc.pos.action.STOP_WS_SERVICE"

        private var isRunning = false

        fun isServiceRunning(): Boolean = isRunning

        fun startService(context: Context) {
            val intent = Intent(context, WebSocketForegroundService::class.java).apply {
                action = ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, WebSocketForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "WebSocket Foreground Service created")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                Log.d(TAG, "Starting WebSocket Foreground Service")
                startForegroundService()
                acquireWakeLock()
                isRunning = true
            }
            ACTION_STOP -> {
                Log.d(TAG, "Stopping WebSocket Foreground Service")
                releaseWakeLock()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                isRunning = false
            }
        }
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        releaseWakeLock()
        isRunning = false
        Log.d(TAG, "WebSocket Foreground Service destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the POS server running for device communication"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    private fun startForegroundService() {
        val notification = createNotification()
        startForeground(NOTIFICATION_ID, notification)
    }

    private fun createNotification(): Notification {
        // Intent to open the app when notification is tapped
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            },
            PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("POS Server Active")
            .setContentText("WebSocket server is running for device communication")
            .setSmallIcon(android.R.drawable.ic_dialog_info) // Use system icon
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun acquireWakeLock() {
        if (wakeLock == null) {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "HashTouch::WebSocketWakeLock"
            ).apply {
                acquire() // Indefinite - foreground service manages lifecycle
            }
            Log.d(TAG, "WakeLock acquired")
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let {
            if (it.isHeld) {
                it.release()
                Log.d(TAG, "WakeLock released")
            }
        }
        wakeLock = null
    }
}