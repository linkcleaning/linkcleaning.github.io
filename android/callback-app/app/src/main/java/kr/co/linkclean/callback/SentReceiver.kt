package kr.co.linkclean.callback

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import java.io.File

/** 통신사 발송 결과 수신 → 이력 상태 업데이트, MMS 실패 시 문자로 재시도 */
class SentReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getLongExtra(MmsSender.EXTRA_ID, 0L)
        val num = intent.getStringExtra(MmsSender.EXTRA_NUM) ?: return
        when (intent.action) {
            MmsSender.ACTION_MMS_SENT -> {
                intent.getStringExtra(MmsSender.EXTRA_FILE)?.let { File(it).delete() }
                if (resultCode == Activity.RESULT_OK) {
                    Prefs.updateStatus(context, id, "성공(사진문자)")
                } else {
                    Prefs.updateStatus(context, id, "사진문자 실패($resultCode)→문자 재시도")
                    val text = intent.getStringExtra(MmsSender.EXTRA_TEXT) ?: ""
                    if (text.isNotEmpty()) MmsSender.sendSms(context, num, id, text)
                    else Prefs.updateStatus(context, id, "실패(사진문자 $resultCode)")
                }
            }
            MmsSender.ACTION_SMS_SENT -> {
                if (resultCode == Activity.RESULT_OK) {
                    Prefs.updateStatus(context, id, "성공(문자)")
                } else {
                    Prefs.updateStatus(context, id, "실패(코드 $resultCode)")
                    Prefs.clearSent(context, num) // 다음 통화 때 다시 시도할 수 있도록
                }
            }
        }
        CallMonitorService.refreshNotification(context)
    }
}
