package com.nizamc.pos.display

import android.content.Context
import android.util.Log
import android.webkit.JavascriptInterface
import kotlinx.coroutines.*
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

class CustomerDisplayMediaCache(private val context: Context) {

    companion object {
        private const val TAG = "CDMediaCache"
        const val JS_INTERFACE_NAME = "CustomerDisplayMediaCache"
        private const val CACHE_DIR = "customer_display_media"
    }

    private val cacheDir: File by lazy {
        File(context.cacheDir, CACHE_DIR).also {
            if (!it.exists()) it.mkdirs()
        }
    }

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    /**
     * Download and cache media OR return local URI directly
     */
    @JavascriptInterface
    fun cacheMedia(remoteUrl: String, filename: String): String {
        if (remoteUrl.isBlank()) {
            Log.d(TAG, "cacheMedia: empty URL")
            return ""
        }

        Log.d(TAG, "cacheMedia input URL: $remoteUrl")

        // ✅ Handle local URIs directly (VERY IMPORTANT FIX)
        if (
            remoteUrl.startsWith("file://") ||
            remoteUrl.startsWith("content://") ||
            remoteUrl.startsWith("android_asset") ||
            !remoteUrl.startsWith("http")
        ) {
            Log.d(TAG, "cacheMedia: local URI detected, returning as-is")
            return remoteUrl
        }

        return runBlocking(Dispatchers.IO) {
            downloadAndCache(remoteUrl, filename)
        }
    }

    /**
     * Actual download logic (runs on IO thread)
     */
    private fun downloadAndCache(remoteUrl: String, filename: String): String {
        try {
            // Generate safe filename
            val safeFilename = if (filename.isBlank()) {
                "media_${remoteUrl.hashCode()}"
            } else {
                filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
            }

            val file = File(cacheDir, safeFilename)

            // Already cached
            if (file.exists() && file.length() > 0) {
                val localUrl = "file://${file.absolutePath}"
                Log.d(TAG, "cacheMedia: already cached at $localUrl")
                return localUrl
            }

            Log.d(TAG, "Downloading $remoteUrl → $safeFilename")

            val url = URL(remoteUrl)
            val connection = url.openConnection() as HttpURLConnection

            connection.connectTimeout = 15000
            connection.readTimeout = 30000
            connection.instanceFollowRedirects = true
            connection.setRequestProperty("User-Agent", "Mozilla/5.0")
            connection.connect()

            val responseCode = connection.responseCode
            Log.d(TAG, "HTTP response: $responseCode")

            if (responseCode != HttpURLConnection.HTTP_OK) {
                Log.e(TAG, "HTTP error $responseCode")
                return ""
            }

            connection.inputStream.use { input ->
                FileOutputStream(file).use { output ->
                    input.copyTo(output)
                    output.flush()
                }
            }

            connection.disconnect()

            val localUrl = "file://${file.absolutePath}"
            Log.d(TAG, "Saved: $localUrl (${file.length()} bytes)")

            return localUrl

        } catch (e: Exception) {
            Log.e(TAG, "Download failed: ${e.message}", e)
            return ""
        }
    }

    @JavascriptInterface
    fun cacheMediaAsync(remoteUrl: String, filename: String, callbackName: String) {
        scope.launch {
            val result = downloadAndCache(remoteUrl, filename)
            Log.d(TAG, "cacheMediaAsync complete: $result")
        }
    }

    @JavascriptInterface
    fun getCachedMedia(filename: String): String {
        val safeFilename = filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val file = File(cacheDir, safeFilename)

        return if (file.exists()) {
            val localUrl = "file://${file.absolutePath}"
            Log.d(TAG, "getCachedMedia: found $localUrl")
            localUrl
        } else {
            Log.d(TAG, "getCachedMedia: not found $filename")
            ""
        }
    }

    @JavascriptInterface
    fun deleteCachedMedia(filename: String): Boolean {
        val safeFilename = filename.replace(Regex("[^a-zA-Z0-9._-]"), "_")
        val file = File(cacheDir, safeFilename)

        return if (file.exists()) {
            val deleted = file.delete()
            Log.d(TAG, "deleteCachedMedia: $filename deleted=$deleted")
            deleted
        } else {
            false
        }
    }

    @JavascriptInterface
    fun clearAllCachedMedia(): Int {
        return try {
            var count = 0
            cacheDir.listFiles()?.forEach { file ->
                if (file.delete()) count++
            }
            Log.d(TAG, "clearAllCachedMedia: deleted $count files")
            count
        } catch (e: Exception) {
            Log.e(TAG, "clearAllCachedMedia error", e)
            0
        }
    }

    @JavascriptInterface
    fun listCachedMedia(): String {
        return try {
            val files = cacheDir.listFiles()?.map { it.name } ?: emptyList()
            "[${files.joinToString(",") { "\"$it\"" }}]"
        } catch (e: Exception) {
            "[]"
        }
    }

    fun onDestroy() {
        scope.cancel()
    }
}
