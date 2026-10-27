package kr.co.linkclean.callback

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telephony.SmsManager
import android.util.Log
import androidx.core.content.FileProvider
import java.io.File

/**
 * 사진문자(MMS) 발송. 사진이 없으면 텍스트만 담은 장문(LMS형 MMS)으로 보낸다.
 * MMS가 실패하면 SentReceiver에서 일반 문자(SMS)로 자동 재시도한다.
 */
object MmsSender {
    private const val TAG = "MmsSender"
    const val ACTION_MMS_SENT = "kr.co.linkclean.callback.MMS_SENT"
    const val ACTION_SMS_SENT = "kr.co.linkclean.callback.SMS_SENT"
    const val EXTRA_ID = "id"
    const val EXTRA_NUM = "num"
    const val EXTRA_FILE = "file"

    fun smsManager(c: Context): SmsManager =
        if (Build.VERSION.SDK_INT >= 31) c.getSystemService(SmsManager::class.java)
        else @Suppress("DEPRECATION") SmsManager.getDefault()

    const val EXTRA_TEXT = "text"

    /**
     * 문자 보내기.
     * - 사진 있음 → 사진문자(MMS)
     * - 사진 없고 90바이트 이하 → 단문(SMS)
     * - 사진 없고 90바이트 초과 → 장문(LMS, 사진 없는 MMS)
     */
    fun send(c: Context, number: String, recordId: Long, text: String, subject: String, withImages: Boolean) {
        val app = c.applicationContext
        val images = if (withImages) Prefs.imageFiles(app).map { it.readBytes() } else emptyList()
        if (images.isEmpty() && Compose.byteLen(text) <= 90) {
            sendSms(app, number, recordId, text); return
        }
        try {
            val pdu = MmsPdu.build(number, subject, text, images)
            val dir = File(app.cacheDir, "mms").apply { mkdirs() }
            val f = File(dir, "send_$recordId.dat")
            f.writeBytes(pdu)
            val uri = FileProvider.getUriForFile(app, "${app.packageName}.files", f)

            val sent = Intent(app, SentReceiver::class.java).apply {
                action = ACTION_MMS_SENT
                putExtra(EXTRA_ID, recordId)
                putExtra(EXTRA_NUM, number)
                putExtra(EXTRA_FILE, f.absolutePath)
                putExtra(EXTRA_TEXT, text)
            }
            val pi = PendingIntent.getBroadcast(
                app, (recordId % Int.MAX_VALUE).toInt(), sent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            smsManager(app).sendMultimediaMessage(app, uri, null, null, pi)
        } catch (e: Exception) {
            Log.e(TAG, "MMS failed, fallback to SMS", e)
            Prefs.updateStatus(app, recordId, "사진문자 오류→문자 재시도")
            sendSms(app, number, recordId, text)
        }
    }

    /** 대체 발송: 일반 문자 (긴 문구는 여러 통으로 나뉘어 전송됨) */
    fun sendSms(c: Context, number: String, recordId: Long, text: String) {
        val app = c.applicationContext
        try {
            val sm = smsManager(app)
            val parts = sm.divideMessage(text)
            val sent = Intent(app, SentReceiver::class.java).apply {
                action = ACTION_SMS_SENT
                putExtra(EXTRA_ID, recordId)
                putExtra(EXTRA_NUM, number)
            }
            val pi = PendingIntent.getBroadcast(
                app, (recordId % Int.MAX_VALUE).toInt() + 1, sent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            // 마지막 조각의 결과만 받아서 성공/실패 판단
            val intents = ArrayList<PendingIntent?>(parts.size).apply {
                repeat(parts.size) { i -> add(if (i == parts.size - 1) pi else null) }
            }
            sm.sendMultipartTextMessage(number, null, parts, intents, null)
        } catch (e: Exception) {
            Log.e(TAG, "SMS failed", e)
            Prefs.updateStatus(app, recordId, "실패: ${e.javaClass.simpleName}")
            Prefs.clearSent(app, number)
        }
    }
}
