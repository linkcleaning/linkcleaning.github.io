package kr.co.linkclean.callback

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.telephony.PhoneStateListener
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

/**
 * 상시 통화 감시 포그라운드 서비스.
 * 통화 상태가 RINGING/OFFHOOK → IDLE 로 바뀌는 순간(=통화 종료/부재중)을 잡아낸다.
 */
class CallMonitorService : Service() {

    private var tm: TelephonyManager? = null
    private var prevState = TelephonyManager.CALL_STATE_IDLE
    private var callback: Any? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createChannel(this)
        ServiceCompat.startForeground(
            this, NOTI_ID, buildNotification(this),
            if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        )
        Prefs.pruneCooldowns(this)
        registerCallState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!Prefs.enabled(this)) { stopSelf(); return START_NOT_STICKY }
        return START_STICKY
    }

    override fun onDestroy() {
        unregisterCallState()
        super.onDestroy()
    }

    private fun onState(state: Int) {
        if (state == TelephonyManager.CALL_STATE_IDLE && prevState != TelephonyManager.CALL_STATE_IDLE) {
            CallbackProcessor.onCallEnded(this)
        }
        prevState = state
    }

    private fun registerCallState() {
        val t = getSystemService(TelephonyManager::class.java) ?: return
        tm = t
        try {
            if (Build.VERSION.SDK_INT >= 31) {
                val cb = Api31Callback { onState(it) }
                t.registerTelephonyCallback(ContextCompat.getMainExecutor(this), cb)
                callback = cb
            } else {
                @Suppress("DEPRECATION")
                val l = object : PhoneStateListener() {
                    @Deprecated("Deprecated in Java")
                    override fun onCallStateChanged(state: Int, phoneNumber: String?) = onState(state)
                }
                @Suppress("DEPRECATION")
                t.listen(l, PhoneStateListener.LISTEN_CALL_STATE)
                callback = l
            }
        } catch (e: SecurityException) {
            Log.e("CallMonitorService", "READ_PHONE_STATE 권한 없음", e)
        }
    }

    private fun unregisterCallState() {
        val t = tm ?: return
        val cb = callback ?: return
        if (Build.VERSION.SDK_INT >= 31 && cb is TelephonyCallback) {
            t.unregisterTelephonyCallback(cb)
        } else if (cb is PhoneStateListener) {
            @Suppress("DEPRECATION")
            t.listen(cb, PhoneStateListener.LISTEN_NONE)
        }
        callback = null
    }

    @RequiresApi(31)
    private class Api31Callback(val onChange: (Int) -> Unit) :
        TelephonyCallback(), TelephonyCallback.CallStateListener {
        override fun onCallStateChanged(state: Int) = onChange(state)
    }

    companion object {
        private const val CHANNEL_ID = "callback_service"
        private const val NOTI_ID = 4545

        fun start(c: Context) {
            if (!Prefs.useService(c)) { stop(c); return } // 상시 감시 끔 → 매니페스트 리시버만 사용
            ContextCompat.startForegroundService(c, Intent(c, CallMonitorService::class.java))
        }

        fun stop(c: Context) {
            c.stopService(Intent(c, CallMonitorService::class.java))
        }

        fun createChannel(c: Context) {
            val nm = c.getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                nm.createNotificationChannel(
                    NotificationChannel(CHANNEL_ID, "자동 콜백 상태", NotificationManager.IMPORTANCE_LOW).apply {
                        description = "자동 콜백이 켜져 있는 동안 표시됩니다"
                        setShowBadge(false)
                    }
                )
            }
        }

        fun buildNotification(c: Context): Notification {
            val open = PendingIntent.getActivity(
                c, 0, Intent(c, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            return NotificationCompat.Builder(c, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_stat_call)
                .setContentTitle("링크클린 자동 콜백 작동 중")
                .setContentText("오늘 발송 ${Prefs.todaySuccess(c)}건 · 통화 종료 시 자동 문자")
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setContentIntent(open)
                .build()
        }

        fun refreshNotification(c: Context) {
            if (!Prefs.enabled(c)) return
            try {
                createChannel(c)
                c.getSystemService(NotificationManager::class.java).notify(NOTI_ID, buildNotification(c))
            } catch (_: SecurityException) { }
        }
    }
}
