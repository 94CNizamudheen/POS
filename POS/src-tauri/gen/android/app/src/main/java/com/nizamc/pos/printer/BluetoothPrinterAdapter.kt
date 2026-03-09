package com.hashone.hashoneplat.printer

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.util.Log
import java.io.IOException
import java.util.UUID

class BluetoothPrinterAdapter(private val context: Context) {

    companion object {
        private const val TAG = "BluetoothPrinterAdapter"

        // Standard Serial Port Profile (SPP) UUID — used by virtually all BT thermal printers
        private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }

    private val bluetoothAdapter: BluetoothAdapter? by lazy {
        val manager = context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        manager?.adapter
    }

    data class BtDevice(val name: String, val address: String)

    /**
     * Returns all Bluetooth devices that are already PAIRED with this Android device.
     * The user must pair the printer via Android Settings → Bluetooth first.
     * Requires BLUETOOTH_CONNECT permission on API 31+.
     */
    @SuppressLint("MissingPermission")
    fun getPairedDevices(): List<BtDevice> {
        val adapter = bluetoothAdapter ?: return emptyList()

        if (!adapter.isEnabled) {
            Log.w(TAG, "Bluetooth is disabled")
            return emptyList()
        }

        return try {
            adapter.bondedDevices.map { device ->
                BtDevice(
                    name = device.name?.takeIf { it.isNotBlank() } ?: "Unknown Device",
                    address = device.address
                )
            }.sortedBy { it.name }
        } catch (e: SecurityException) {
            Log.e(TAG, "BLUETOOTH_CONNECT permission denied: ${e.message}")
            throw e  // propagate so the bridge can return a structured error
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get paired devices: ${e.message}")
            emptyList()
        }
    }

    /**
     * Test RFCOMM connection to a Bluetooth printer without printing anything.
     * Connects and immediately disconnects — used to verify the printer is reachable.
     */
    @SuppressLint("MissingPermission")
    fun testConnection(address: String): PrintResult {
        val adapter = bluetoothAdapter ?: return PrintResult(false, "Bluetooth not available on this device")
        if (!adapter.isEnabled) return PrintResult(false, "Bluetooth is disabled. Enable Bluetooth and try again.")

        val device: BluetoothDevice = try {
            adapter.getRemoteDevice(address)
        } catch (e: IllegalArgumentException) {
            return PrintResult(false, "Invalid Bluetooth address: $address")
        } catch (e: SecurityException) {
            return PrintResult(false, "BLUETOOTH_CONNECT permission denied")
        }

        var socket: BluetoothSocket? = null
        return try {
            try { adapter.cancelDiscovery() } catch (_: Exception) {}

            socket = try {
                device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
            } catch (_: Exception) {
                device.createRfcommSocketToServiceRecord(SPP_UUID)
            }

            socket!!.connect()
            Log.d(TAG, "Test connection OK: $address")
            PrintResult(true)
        } catch (e: SecurityException) {
            PrintResult(false, "Bluetooth permission denied")
        } catch (e: IOException) {
            Log.w(TAG, "Test connection failed for $address: ${e.message}")
            PrintResult(false, "Cannot connect to printer. Make sure it is powered on and in range.")
        } catch (e: Exception) {
            PrintResult(false, e.message ?: "Connection test failed")
        } finally {
            try { socket?.close() } catch (_: Exception) {}
        }
    }

    /**
     * Print ESC/POS data to a Bluetooth printer at the given MAC address.
     * Connects via RFCOMM socket (SPP), sends data, then disconnects.
     * Requires BLUETOOTH_CONNECT permission on API 31+.
     */
    @SuppressLint("MissingPermission")
    fun print(address: String, data: ByteArray): PrintResult {
        val adapter = bluetoothAdapter
            ?: return PrintResult(false, "Bluetooth not available on this device")

        if (!adapter.isEnabled) {
            return PrintResult(false, "Bluetooth is disabled. Enable Bluetooth and try again.")
        }

        val device: BluetoothDevice = try {
            adapter.getRemoteDevice(address)
        } catch (e: IllegalArgumentException) {
            return PrintResult(false, "Invalid Bluetooth address: $address")
        } catch (e: SecurityException) {
            return PrintResult(false, "BLUETOOTH_CONNECT permission denied")
        }

        var socket: BluetoothSocket? = null

        return try {
            // Cancel discovery before connecting (speeds up connection)
            try { adapter.cancelDiscovery() } catch (_: Exception) {}

            // Try insecure socket first — more compatible with thermal printers (Epson, Xprinter, etc.)
            // Secure socket can silently drop data on printers that don't require PIN pairing.
            socket = try {
                device.createInsecureRfcommSocketToServiceRecord(SPP_UUID)
            } catch (_: Exception) {
                device.createRfcommSocketToServiceRecord(SPP_UUID)
            }

            try {
                socket!!.connect()
            } catch (_: IOException) {
                // Fallback: connect via reflection on RFCOMM channel 1
                // Needed on some Android versions / printer firmware combos
                socket!!.close()
                val method = device.javaClass.getMethod("createInsecureRfcommSocket", Int::class.java)
                socket = method.invoke(device, 1) as BluetoothSocket
                socket.connect()
            }

            val outputStream = socket!!.outputStream

            // Small delay after connect — some printers need a moment before they accept data
            Thread.sleep(100)

            val chunkSize = 4096
            var offset = 0
            while (offset < data.size) {
                val len = minOf(chunkSize, data.size - offset)
                outputStream.write(data, offset, len)
                offset += len
            }

            outputStream.flush()

            // Give the printer time to process before closing the socket
            Thread.sleep(500)

            Log.d(TAG, "Bluetooth print complete: ${data.size} bytes to $address")
            PrintResult(true)

        } catch (e: SecurityException) {
            Log.e(TAG, "Bluetooth permission denied", e)
            PrintResult(false, "Bluetooth permission denied. Grant BLUETOOTH_CONNECT in app settings.")
        } catch (e: IOException) {
            Log.e(TAG, "Bluetooth connection/print failed for $address", e)
            PrintResult(false, "Bluetooth connection failed: ${e.message}. Ensure printer is powered on and paired.")
        } catch (e: Exception) {
            Log.e(TAG, "Bluetooth print error", e)
            PrintResult(false, e.message ?: "Bluetooth print failed")
        } finally {
            try { socket?.close() } catch (_: Exception) {}
        }
    }
}
