package com.hashone.hashoneplat

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.hardware.usb.UsbDevice
import android.hardware.usb.UsbManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import com.hashone.hashoneplat.printer.PrinterBridge
import com.hashone.hashoneplat.service.WebSocketServiceBridge
import com.hashone.hashoneplat.ui.SystemInsetsBridge
import com.hashone.hashoneplat.display.CustomerDisplayBridge
import com.hashone.hashoneplat.display.CustomerDisplayMediaCache
import com.hashone.hashoneplat.scanner.BarcodeScannerBridge
import com.hashone.hashoneplat.printer.UsbPrinterAdapter

class MainActivity : TauriActivity() {

  companion object {
    private const val TAG = "MainActivity"
  }

  private lateinit var printerBridge: PrinterBridge
  private lateinit var webSocketServiceBridge: WebSocketServiceBridge
  private lateinit var systemInsetsBridge: SystemInsetsBridge
  private lateinit var customerDisplayBridge: CustomerDisplayBridge
  private lateinit var mediaCache: CustomerDisplayMediaCache
  private lateinit var barcodeScannerBridge: BarcodeScannerBridge
  private var isWebViewReady = false

  // USB device that was attached before the WebView was ready (cold-start scenario)
  private var pendingUsbDevice: UsbDevice? = null

  // Single launcher for all runtime permissions (avoids Android dropping back-to-back requests)
  private val runtimePermissionLauncher = registerForActivityResult(
    ActivityResultContracts.RequestMultiplePermissions()
  ) { results ->
    results.forEach { (permission, granted) ->
      val label = permission.substringAfterLast('.')
      if (granted) Log.d(TAG, "$label granted")
      else Log.w(TAG, "$label denied")
    }
  }

  private val usbPermissionReceiver = object : android.content.BroadcastReceiver() {
  override fun onReceive(context: android.content.Context?, intent: Intent?) {

    if (intent?.action != UsbPrinterAdapter.ACTION_USB_PERMISSION) return

    val device: UsbDevice? =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
      } else {
        @Suppress("DEPRECATION")
        intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
      }

    val granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)

    if (granted && device != null) {
      Log.d(TAG, "USB permission granted for ${device.deviceName}")
      if (::printerBridge.isInitialized) {
        printerBridge.onUsbPermissionGranted(device)
      }
    } else {
      Log.w(TAG, "USB permission denied")
    }
  }
}

  override fun onCreate(savedInstanceState: Bundle?) {
    // enableEdgeToEdge works on API 21+ but may have visual issues on older POS terminals
    // Only enable on Android 8.0+ (API 26) for better compatibility with Sunmi/POS devices
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      enableEdgeToEdge()
    }
    super.onCreate(savedInstanceState)

    // Request all runtime permissions at once (notifications + bluetooth)
    requestRuntimePermissionsIfNeeded()

    // Handle USB_DEVICE_ATTACHED if the app was launched by plugging in a printer
    intent?.let { handleUsbAttachIntent(it) }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
  registerReceiver(
    usbPermissionReceiver,
    IntentFilter(UsbPrinterAdapter.ACTION_USB_PERMISSION),
    RECEIVER_NOT_EXPORTED
    )
    } else {
  registerReceiver(
    usbPermissionReceiver,
    IntentFilter(UsbPrinterAdapter.ACTION_USB_PERMISSION)
     )
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleUsbAttachIntent(intent)
  }

  private fun handleUsbAttachIntent(intent: Intent) {
    if (UsbManager.ACTION_USB_DEVICE_ATTACHED != intent.action) return

    val device: UsbDevice? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      intent.getParcelableExtra(UsbManager.EXTRA_DEVICE, UsbDevice::class.java)
    } else {
      @Suppress("DEPRECATION")
      intent.getParcelableExtra(UsbManager.EXTRA_DEVICE)
    }

    device?.let {
      Log.d(TAG, "USB device attached via intent: ${it.deviceName}")
      if (::printerBridge.isInitialized) {
        printerBridge.onUsbDeviceAttached(it)
      } else {
        // WebView not ready yet (cold start) — store and forward once bridge is initialized
        Log.d(TAG, "PrinterBridge not ready, storing pending USB device: ${it.deviceName}")
        pendingUsbDevice = it
      }
    }
  }

  @SuppressLint("SetJavaScriptEnabled")
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    // Initialize and inject the printer bridge
    printerBridge = PrinterBridge(this)
    webView.addJavascriptInterface(printerBridge, PrinterBridge.JS_INTERFACE_NAME)
    Log.d(TAG, "PrinterBridge injected as '${PrinterBridge.JS_INTERFACE_NAME}'")

    // Forward any USB attach event that arrived before the bridge was ready (cold start)
    pendingUsbDevice?.let {
      Log.d(TAG, "Forwarding cold-start USB device to PrinterBridge: ${it.deviceName}")
      printerBridge.onUsbDeviceAttached(it)
      pendingUsbDevice = null
    }

    // Initialize and inject the WebSocket service bridge
    webSocketServiceBridge = WebSocketServiceBridge(this)
    webView.addJavascriptInterface(webSocketServiceBridge, WebSocketServiceBridge.JS_INTERFACE_NAME)
    Log.d(TAG, "WebSocketServiceBridge injected as '${WebSocketServiceBridge.JS_INTERFACE_NAME}'")

    // Initialize system insets bridge for safe area handling on POS devices
    systemInsetsBridge = SystemInsetsBridge(this, webView)
    webView.addJavascriptInterface(systemInsetsBridge, SystemInsetsBridge.JS_INTERFACE_NAME)
    systemInsetsBridge.initialize()
    isWebViewReady = true
    Log.d(TAG, "SystemInsetsBridge initialized for safe area handling")

    // Initialize customer display bridge for secondary screen support
    customerDisplayBridge = CustomerDisplayBridge(this)
    webView.addJavascriptInterface(customerDisplayBridge, CustomerDisplayBridge.JS_INTERFACE_NAME)
    Log.d(TAG, "CustomerDisplayBridge injected as '${CustomerDisplayBridge.JS_INTERFACE_NAME}'")

    // Initialize customer display media cache for local image/video storage
    mediaCache = CustomerDisplayMediaCache(this)
    webView.addJavascriptInterface(mediaCache, CustomerDisplayMediaCache.JS_INTERFACE_NAME)
    Log.d(TAG, "CustomerDisplayMediaCache injected as '${CustomerDisplayMediaCache.JS_INTERFACE_NAME}'")

    // Initialize hardware barcode scanner bridge (Intent broadcast mode)
    // Handles Sunmi, Urovo, MSWAP/Chainway, CloudCode, Honeywell, and other POS terminals
    barcodeScannerBridge = BarcodeScannerBridge(this, webView)
    webView.addJavascriptInterface(barcodeScannerBridge, BarcodeScannerBridge.JS_INTERFACE_NAME)
    barcodeScannerBridge.register()
    Log.d(TAG, "BarcodeScannerBridge injected as '${BarcodeScannerBridge.JS_INTERFACE_NAME}'")
  }

  override fun onResume() {
    super.onResume()
    Log.d(TAG, "onResume - re-injecting safe area insets")

    // Re-inject CSS variables when app comes back from background
    // Use retry mechanism to ensure it works on slow POS terminals
    if (isWebViewReady && ::systemInsetsBridge.isInitialized) {
      window.decorView.postDelayed({
        systemInsetsBridge.injectWithRetry(retryCount = 3, delayMs = 150)
        Log.d(TAG, "Safe area insets re-injection scheduled after resume")
      }, 100)
    }
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    Log.d(TAG, "onWindowFocusChanged: hasFocus=$hasFocus")

    // Re-inject when window gains focus (important for POS terminals)
    if (hasFocus && isWebViewReady && ::systemInsetsBridge.isInitialized) {
      window.decorView.postDelayed({
        systemInsetsBridge.forceRefresh()
        Log.d(TAG, "Safe area insets force refresh after focus change")
      }, 200)
    }
  }

 override fun onDestroy() {
  super.onDestroy()

  try {
    unregisterReceiver(usbPermissionReceiver)
  } catch (e: Exception) {
    Log.w(TAG, "Receiver already unregistered")
  }

  if (::printerBridge.isInitialized) {
    printerBridge.cleanup()
  }

  if (::customerDisplayBridge.isInitialized) {
    customerDisplayBridge.onDestroy()
  }

  if (::mediaCache.isInitialized) {
    mediaCache.onDestroy()
  }

  if (::barcodeScannerBridge.isInitialized) {
    barcodeScannerBridge.unregister()
  }
}

  private fun requestRuntimePermissionsIfNeeded() {
    val needed = mutableListOf<String>()

    // Notification permission (Android 13+)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
        != PackageManager.PERMISSION_GRANTED) {
        needed.add(Manifest.permission.POST_NOTIFICATIONS)
      }
    }

    // Bluetooth permissions (Android 12+)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
        != PackageManager.PERMISSION_GRANTED) {
        needed.add(Manifest.permission.BLUETOOTH_CONNECT)
      }
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_SCAN)
        != PackageManager.PERMISSION_GRANTED) {
        needed.add(Manifest.permission.BLUETOOTH_SCAN)
      }
    }

    if (needed.isNotEmpty()) {
      Log.d(TAG, "Requesting permissions: ${needed.map { it.substringAfterLast('.') }}")
      runtimePermissionLauncher.launch(needed.toTypedArray())
    }
  }
}