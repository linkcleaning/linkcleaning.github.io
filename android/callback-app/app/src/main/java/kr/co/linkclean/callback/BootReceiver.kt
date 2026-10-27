package kr.co.linkclean.callback

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** 재부팅 / 앱 업데이트 후 자동 콜백 서비스 재시작 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (Prefs.enabled(context)) {
            try { CallMonitorService.start(context) } catch (_: Exception) { }
        }
    }
}
