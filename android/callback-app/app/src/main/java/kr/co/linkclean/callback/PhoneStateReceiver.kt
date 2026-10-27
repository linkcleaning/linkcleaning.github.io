package kr.co.linkclean.callback

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager

/**
 * 매니페스트 등록 리시버 – 서비스가 시스템에 의해 잠시 죽어 있어도
 * 통화 종료(EXTRA_STATE_IDLE) 브로드캐스트로 앱이 깨어나 처리한다.
 * (서비스와 동시에 와도 CallbackProcessor가 통화기록 단위로 중복을 막음)
 */
class PhoneStateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        if (intent.getStringExtra(TelephonyManager.EXTRA_STATE) != TelephonyManager.EXTRA_STATE_IDLE) return
        if (!Prefs.enabled(context)) return
        val pending = goAsync()
        CallbackProcessor.onCallEnded(context) { pending.finish() }
    }
}
