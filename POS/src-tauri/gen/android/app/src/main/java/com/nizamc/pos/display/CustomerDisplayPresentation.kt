package com.nizamc.pos.display

import android.annotation.SuppressLint
import android.app.Presentation
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.Display
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class CustomerDisplayPresentation(
    context: Context,
    display: Display
) : Presentation(context, display) {

    companion object {
        private const val TAG = "CustomerDisplayPres"
        private const val HTML_URL = "file:///android_asset/customer_display.html"
    }

    private lateinit var webView: WebView
    private var isWebViewReady = false
    private val pendingUpdates = mutableListOf<String>()
    private var initialLogoUrl: String = ""
    private var initialWelcomeMessage: String = "Welcome!"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Fullscreen + keep screen on
        window?.apply {
            setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            )
            setFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        webView = WebView(context).apply {

            // 🔥 CRITICAL: Full WebView settings for media loading
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                allowFileAccessFromFileURLs = true
                allowUniversalAccessFromFileURLs = true
                mediaPlaybackRequiresUserGesture = false

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }
            }

            // 🔥 Register media cache JS bridge
            addJavascriptInterface(
                CustomerDisplayMediaCache(context),
                CustomerDisplayMediaCache.JS_INTERFACE_NAME
            )

            // Background color during load
            setBackgroundColor(android.graphics.Color.parseColor("#111111"))

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)

                    Log.d(TAG, "Customer display page loaded")

                    isWebViewReady = true

                    // Send branding
                    sendInitialData()

                    // Flush queued updates
                    pendingUpdates.forEach { evaluateJs(it) }
                    pendingUpdates.clear()
                }
            }

            webChromeClient = WebChromeClient()

            loadUrl(HTML_URL)
        }

        setContentView(webView)

        Log.d(TAG, "Presentation created on display: ${display.name}")
    }

    /**
     * Set branding data
     */
    fun setInitialData(logoUrl: String, welcomeMessage: String) {
        Log.d(TAG, "setInitialData: logo=$logoUrl message=$welcomeMessage")

        initialLogoUrl = logoUrl
        initialWelcomeMessage = welcomeMessage

        if (isWebViewReady) {
            sendInitialData()
        }
    }

    private fun sendInitialData() {
        val logoEscaped = escapeForJs(initialLogoUrl)
        val msgEscaped = escapeForJs(initialWelcomeMessage)

        val js =
            "window.setInitialData && window.setInitialData('$logoEscaped', '$msgEscaped')"

        Log.d(TAG, "sendInitialData JS: $js")

        webView.evaluateJavascript(js, null)
    }

    /**
     * Send JSON update
     */
    fun updateContent(json: String) {
        Log.d(TAG, "updateContent: ${json.take(200)}")

        if (!isWebViewReady) {
            Log.d(TAG, "WebView not ready → queued")
            pendingUpdates.add(json)
            return
        }

        evaluateJs(json)
    }

    private fun evaluateJs(json: String) {
        val escaped = escapeForJs(json)

        val js =
            "window.updateCustomerDisplay && window.updateCustomerDisplay('$escaped')"

        Log.d(TAG, "evaluateJs: ${js.take(300)}")

        webView.evaluateJavascript(js) { result ->
            Log.d(TAG, "JS result: $result")
        }
    }

    /**
     * Escape string for JS
     */
    private fun escapeForJs(str: String): String {
        return str
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
    }

    override fun onStop() {
        super.onStop()

        // 🔥 Safe WebView cleanup (prevents memory leaks)
        webView.apply {
            loadUrl("about:blank")
            stopLoading()
            clearHistory()
            removeAllViews()
            destroy()
        }

        Log.d(TAG, "Presentation stopped")
    }
}
