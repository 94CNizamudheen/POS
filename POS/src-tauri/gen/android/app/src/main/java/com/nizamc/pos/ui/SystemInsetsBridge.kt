package com.nizamc.pos.ui

import android.app.Activity
import android.graphics.Rect
import android.os.Build
import android.util.Log
import android.view.View
import android.view.WindowInsets
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

/**
 * Bridge to inject Android system bar insets into WebView as CSS variables
 *
 * This solves the issue where POS devices (without notches) don't report
 * safe-area-inset-* values, but still have visible status/navigation bars.
 */
class SystemInsetsBridge(
    private val activity: Activity,
    private val webView: WebView
) {

    companion object {
        private const val TAG = "SystemInsetsBridge"
        const val JS_INTERFACE_NAME = "AndroidInsets"
    }

    private var statusBarHeight = 0
    private var navigationBarHeight = 0
    private var leftInset = 0
    private var rightInset = 0

    /**
     * Initialize and listen for inset changes
     */
    fun initialize() {
        // Get initial insets
        updateInsetsFromSystem()

        // Listen for inset changes
        ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            val displayCutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())

            statusBarHeight = maxOf(systemBars.top, displayCutout.top)
            navigationBarHeight = maxOf(systemBars.bottom, displayCutout.bottom)
            leftInset = maxOf(systemBars.left, displayCutout.left)
            rightInset = maxOf(systemBars.right, displayCutout.right)

            Log.d(TAG, "Insets updated: top=$statusBarHeight, bottom=$navigationBarHeight, left=$leftInset, right=$rightInset")

            // Inject CSS variables into WebView
            injectCssVariables()

            insets
        }

        // Request insets to be applied
        webView.requestApplyInsets()
    }

    /**
     * Fallback: Get insets from system resources
     */
    private fun updateInsetsFromSystem() {
        try {
            // Get status bar height from system resources
            val statusBarId = activity.resources.getIdentifier(
                "status_bar_height", "dimen", "android"
            )
            if (statusBarId > 0) {
                statusBarHeight = activity.resources.getDimensionPixelSize(statusBarId)
            }

            // Get navigation bar height from system resources
            val navBarId = activity.resources.getIdentifier(
                "navigation_bar_height", "dimen", "android"
            )
            if (navBarId > 0) {
                navigationBarHeight = activity.resources.getDimensionPixelSize(navBarId)
            }

            Log.d(TAG, "System insets: statusBar=$statusBarHeight, navBar=$navigationBarHeight")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get system insets: ${e.message}")
        }
    }

    /**
     * Inject CSS variables into the WebView
     */
    fun injectCssVariables() {
        val density = activity.resources.displayMetrics.density

        // Convert pixels to dp/css pixels
        val topPx = statusBarHeight / density
        val bottomPx = navigationBarHeight / density
        val leftPx = leftInset / density
        val rightPx = rightInset / density

        val js = """
            (function() {
                var root = document.documentElement;
                root.style.setProperty('--android-status-bar-height', '${topPx}px');
                root.style.setProperty('--android-nav-bar-height', '${bottomPx}px');
                root.style.setProperty('--android-inset-left', '${leftPx}px');
                root.style.setProperty('--android-inset-right', '${rightPx}px');

                // Also set as safe-area fallbacks
                root.style.setProperty('--safe-top-fallback', '${topPx}px');
                root.style.setProperty('--safe-bottom-fallback', '${bottomPx}px');
                root.style.setProperty('--safe-left-fallback', '${leftPx}px');
                root.style.setProperty('--safe-right-fallback', '${rightPx}px');

                console.log('[AndroidInsets] Injected: top=${topPx}px, bottom=${bottomPx}px, left=${leftPx}px, right=${rightPx}px');
            })();
        """.trimIndent()

        activity.runOnUiThread {
            webView.evaluateJavascript(js, null)
        }
    }

    // JavaScript interface methods

    @JavascriptInterface
    fun getStatusBarHeight(): Int {
        return (statusBarHeight / activity.resources.displayMetrics.density).toInt()
    }

    @JavascriptInterface
    fun getNavigationBarHeight(): Int {
        return (navigationBarHeight / activity.resources.displayMetrics.density).toInt()
    }

    @JavascriptInterface
    fun getLeftInset(): Int {
        return (leftInset / activity.resources.displayMetrics.density).toInt()
    }

    @JavascriptInterface
    fun getRightInset(): Int {
        return (rightInset / activity.resources.displayMetrics.density).toInt()
    }

    @JavascriptInterface
    fun refreshInsets() {
        activity.runOnUiThread {
            updateInsetsFromSystem()
            injectCssVariables()
        }
    }

    /**
     * Force re-request insets from the system and re-inject
     * Useful when resuming from background on POS terminals
     */
    fun forceRefresh() {
        activity.runOnUiThread {
            // Re-request insets from system
            updateInsetsFromSystem()

            // Request window insets to be reapplied
            webView.requestApplyInsets()

            // Inject with small delay to ensure WebView is ready
            webView.postDelayed({
                injectCssVariables()
                Log.d(TAG, "Force refresh completed")
            }, 50)
        }
    }

    /**
     * Inject CSS with retry mechanism for reliability
     */
    fun injectWithRetry(retryCount: Int = 3, delayMs: Long = 100) {
        activity.runOnUiThread {
            updateInsetsFromSystem()
            injectCssVariables()

            // Schedule retries with increasing delays
            for (i in 1 until retryCount) {
                webView.postDelayed({
                    injectCssVariables()
                    Log.d(TAG, "Retry injection #$i")
                }, delayMs * i)
            }
        }
    }
}