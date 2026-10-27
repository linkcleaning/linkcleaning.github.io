package kr.co.linkclean.callback

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.CallLog
import android.util.Log
import androidx.core.content.ContextCompat
import java.util.concurrent.Executors

/**
 * 통화 종료(IDLE) 시점에 호출됨.
 * 통화기록(CallLog)을 읽어 "수신 / 부재중" 여부와 상대 번호를 확인한 뒤
 * 제외번호 · 24시간 쿨타임 · 하루 한도를 통과한 경우에만 MMS를 발송한다.
 *
 * 발신(내가 건 전화)은 통화기록 TYPE = OUTGOING 이므로 자동으로 걸러진다.
 */
object CallbackProcessor {
    private const val TAG = "CallbackProcessor"
    const val KIND_IN = "수신"
    const val KIND_MISSED = "부재중"

    private val executor = Executors.newSingleThreadExecutor()
    private val lock = Any()
    @Volatile private var lastTrigger = 0L

    private data class Entry(val id: Long, val number: String, val type: Int, val date: Long, val duration: Long) {
        val key get() = "$id:$date"
    }

    /** 서비스(TelephonyCallback)와 매니페스트 리시버 양쪽에서 호출 – 5초 내 중복 트리거는 무시 */
    fun onCallEnded(context: Context, done: (() -> Unit)? = null) {
        val app = context.applicationContext
        val now = System.currentTimeMillis()
        if (!Prefs.enabled(app) || now - lastTrigger < 5000) {
            done?.invoke(); return
        }
        lastTrigger = now
        executor.execute {
            try {
                // 통화기록이 DB에 기록되기까지 1~3초 걸리므로 몇 번 재시도
                for (i in 0 until 4) {
                    Thread.sleep(if (i == 0) 1500 else 2000)
                    if (checkNewCalls(app) > 0) break
                }
            } catch (e: Exception) {
                Log.e(TAG, "check failed", e)
            } finally {
                done?.invoke()
            }
        }
    }

    /** 자동 콜백을 켤 때 호출 – 기존 통화기록은 '이미 처리함'으로 표시해서 과거 통화로 문자가 나가지 않게 함 */
    fun seedExistingCalls(c: Context) {
        synchronized(lock) {
            val keys = queryRecent(c).map { it.key }
            Prefs.saveProcessedKeys(c, keys)
        }
    }

    private fun queryRecent(c: Context): List<Entry> {
        if (ContextCompat.checkSelfPermission(c, Manifest.permission.READ_CALL_LOG) != PackageManager.PERMISSION_GRANTED) {
            return emptyList()
        }
        val since = System.currentTimeMillis() - 3L * 3600_000 // 최근 3시간
        val proj = arrayOf(
            CallLog.Calls._ID, CallLog.Calls.NUMBER, CallLog.Calls.TYPE,
            CallLog.Calls.DATE, CallLog.Calls.DURATION
        )
        val out = mutableListOf<Entry>()
        try {
            c.contentResolver.query(
                CallLog.Calls.CONTENT_URI, proj,
                "${CallLog.Calls.DATE} > ?", arrayOf(since.toString()),
                "${CallLog.Calls.DATE} ASC"
            )?.use { cur ->
                while (cur.moveToNext()) {
                    out.add(Entry(cur.getLong(0), cur.getString(1) ?: "", cur.getInt(2), cur.getLong(3), cur.getLong(4)))
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "call log query failed", e)
        }
        return out
    }

    private fun checkNewCalls(c: Context): Int {
        synchronized(lock) {
            val processed = Prefs.processedKeys(c)
            val processedSet = processed.toHashSet()
            val fresh = queryRecent(c).filter { it.key !in processedSet }
            if (fresh.isEmpty()) return 0
            fresh.forEach { processed.add(it.key) }
            Prefs.saveProcessedKeys(c, processed)
            fresh.forEach { evaluate(c, it) }
            return fresh.size
        }
    }

    private fun evaluate(c: Context, e: Entry) {
        val kind = when (e.type) {
            CallLog.Calls.INCOMING_TYPE -> if (e.duration > 0) KIND_IN else KIND_MISSED
            CallLog.Calls.MISSED_TYPE, CallLog.Calls.REJECTED_TYPE -> KIND_MISSED
            else -> return // OUTGOING(발신), BLOCKED(차단), VOICEMAIL 등은 무시
        }
        if (kind == KIND_IN && !Prefs.sendIncoming(c)) return
        if (kind == KIND_MISSED && !Prefs.sendMissed(c)) return

        val num = PhoneUtil.normalize(e.number)
        val now = System.currentTimeMillis()
        val hours = Prefs.cooldownHours(c)
        val reason: String? = when {
            num.length < 7 -> "발신번호 표시제한"
            Prefs.mobileOnly(c) && !PhoneUtil.isMobile(num) -> "휴대폰 번호 아님"
            num in Prefs.blacklist(c) -> "제외 번호"
            now - Prefs.lastSent(c, num) < hours * 3600_000L -> "${hours}시간 내 이미 발송"
            Prefs.todayAttempts(c) >= Prefs.dailyLimit(c) -> "하루 한도 초과"
            else -> null
        }

        val id = Prefs.newId()
        if (reason != null) {
            Prefs.addHistory(c, SendRecord(id, now, num.ifEmpty { "알 수 없음" }, kind, "제외: $reason"))
            return
        }
        Prefs.markSent(c, num, now) // 발송 전에 먼저 기록 → 동시에 두 번 나가는 것 방지
        Prefs.addHistory(c, SendRecord(id, now, num, kind, "발송중"))
        MmsSender.send(c, num, id)
        CallMonitorService.refreshNotification(c)
    }
}
