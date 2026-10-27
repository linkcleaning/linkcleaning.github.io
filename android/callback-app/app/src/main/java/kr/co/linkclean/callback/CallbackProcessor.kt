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
    const val KIND_OUT = "발신"

    private val executor = Executors.newSingleThreadExecutor()
    private val lock = Any()
    @Volatile private var lastTrigger = 0L

    private data class Entry(val id: Long, val number: String, val type: Int, val date: Long, val duration: Long, val name: String = "") {
        val key get() = "$id:$date"
    }

    /** 서비스(TelephonyCallback)와 매니페스트 리시버 양쪽에서 호출 – 5초 내 중복 트리거는 무시 */
    fun onCallEnded(context: Context, done: (() -> Unit)? = null) {
        val app = context.applicationContext
        val now = System.currentTimeMillis()
        if (!Prefs.enabled(app)) { done?.invoke(); return }
        if (now - lastTrigger < 5000) { done?.invoke(); return }
        lastTrigger = now
        Prefs.setLastEvent(app, "통화 끝남 감지 → 통화기록 확인 중")
        executor.execute {
            var finished = false
            try {
                // 통화기록이 저장되기까지 시간이 걸릴 수 있어 최대 약 20초 동안 재시도
                var found = 0
                for (i in 0 until 10) {
                    Thread.sleep(if (i == 0) 1500 else 2000)
                    found = checkNewCalls(app)
                    if (i == 3 && !finished) { finished = true; done?.invoke() } // 리시버는 8초 안에 풀어줌
                    if (found > 0) break
                }
                if (found == 0) Prefs.setLastEvent(app, "통화 끝남 감지 → 새 통화기록을 찾지 못함")
            } catch (e: Exception) {
                Log.e(TAG, "check failed", e)
                Prefs.setLastEvent(app, "오류: ${e.javaClass.simpleName} ${e.message ?: ""}")
            } finally {
                if (!finished) done?.invoke()
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
            CallLog.Calls.DATE, CallLog.Calls.DURATION, CallLog.Calls.CACHED_NAME
        )
        val out = mutableListOf<Entry>()
        try {
            c.contentResolver.query(
                CallLog.Calls.CONTENT_URI, proj,
                "${CallLog.Calls.DATE} > ?", arrayOf(since.toString()),
                "${CallLog.Calls.DATE} ASC"
            )?.use { cur ->
                while (cur.moveToNext()) {
                    out.add(Entry(cur.getLong(0), cur.getString(1) ?: "", cur.getInt(2), cur.getLong(3), cur.getLong(4), cur.getString(5) ?: ""))
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

    fun periodLabel(h: Int): String = when {
        h <= 0 -> "매번"
        h % 720 == 0 -> "${h / 720}개월"
        h % 168 == 0 -> "${h / 168}주"
        h % 24 == 0 -> "${h / 24}일"
        else -> "${h}시간"
    }

    private val main = android.os.Handler(android.os.Looper.getMainLooper())

    /** [시험] 가장 최근 통화로 자동 발송을 바로 실행 (재발송 금지·하루 한도 무시) */
    fun testLatest(c: Context, onResult: (String) -> Unit) {
        val app = c.applicationContext
        executor.execute {
            val last = synchronized(lock) { queryRecent(app).lastOrNull() }
            val msg = if (last == null) "최근 3시간 안에 통화 기록이 없어요 (통화기록 권한 확인)"
            else { evaluate(app, last, force = true); Prefs.lastEvent(app) }
            main.post { onResult(msg) }
        }
    }

    private fun evaluate(c: Context, e: Entry, force: Boolean = false) {
        val kind = when (e.type) {
            CallLog.Calls.INCOMING_TYPE -> if (e.duration > 0) KIND_IN else KIND_MISSED
            CallLog.Calls.MISSED_TYPE, CallLog.Calls.REJECTED_TYPE -> KIND_MISSED
            // 내가 건 전화: 실제로 통화가 연결된 경우만 (안 받은 발신에는 안 보냄)
            CallLog.Calls.OUTGOING_TYPE -> if (e.duration > 0) KIND_OUT else {
                Prefs.setLastEvent(c, "내가 건 전화 · 상대가 안 받음 → 안 보냄"); return
            }
            else -> { Prefs.setLastEvent(c, "차단·기타 통화 → 안 보냄"); return }
        }
        val num = PhoneUtil.normalize(e.number)
        val who = PhoneUtil.pretty(num.ifEmpty { "번호없음" })
        if ((kind == KIND_IN && !Prefs.sendIncoming(c)) || (kind == KIND_MISSED && !Prefs.sendMissed(c)) || (kind == KIND_OUT && !Prefs.sendOutgoing(c))) {
            Prefs.setLastEvent(c, "$kind $who → 설정에서 '$kind' 자동 발송이 꺼져 있음"); return
        }

        val now = System.currentTimeMillis()
        val hours = Prefs.cooldownHours(c)
        val reason: String? = when {
            num.length < 7 -> "발신번호 표시제한"
            Prefs.mobileOnly(c) && !PhoneUtil.isMobile(num) -> "휴대폰 번호 아님"
            num in Prefs.blacklist(c) -> "제외 번호"
            Prefs.skipContacts(c) && e.name.isNotBlank() -> "주소록 저장 번호 (${e.name})"
            !force && hours > 0 && now - Prefs.lastSent(c, num) < hours * 3600_000L -> "${periodLabel(hours)} 내 이미 발송"
            !force && Prefs.todayAttempts(c) >= Prefs.dailyLimit(c) -> "하루 한도 초과"
            else -> null
        }

        // 수신 / 부재중 별로 지정된 문자 사용 (빈칸 {..}이 있는 문자는 자동 발송 불가)
        val tplId = when (kind) {
            KIND_IN -> Prefs.autoInId(c)
            KIND_OUT -> Prefs.autoOutId(c)
            else -> Prefs.autoMissId(c)
        }
        val tpl = Templates.find(c, tplId)?.takeIf { !it.hasTokens }
            ?: Templates.load(c).firstOrNull { !it.hasTokens && it.type == kind }
            ?: Templates.load(c).firstOrNull { !it.hasTokens }
            ?: run { Prefs.setLastEvent(c, "$kind $who → 보낼 문자가 없음 (문자설정 확인)"); return }

        val id = Prefs.newId()
        if (reason != null) {
            Prefs.addHistory(c, SendRecord(id, now, num.ifEmpty { "알 수 없음" }, kind, "제외: $reason", tpl.name, true))
            Prefs.setLastEvent(c, "$kind $who → 안 보냄 ($reason)")
            return
        }
        Prefs.markSent(c, num, now) // 발송 전에 먼저 기록 → 동시에 두 번 나가는 것 방지
        Prefs.addHistory(c, SendRecord(id, now, num, kind, "발송중", tpl.name, true))
        Prefs.setLastEvent(c, "$kind $who → [${tpl.name}] 보내는 중")
        val text = Compose.build(c, tpl)
        // 직접 보내기와 똑같이 메인 스레드에서 발송 (삼성폰 백그라운드 발송 실패 방지)
        main.post {
            try {
                MmsSender.send(c, num, id, text, tpl.title, tpl.useImages)
            } catch (ex: Exception) {
                Prefs.updateStatus(c, id, "실패: ${ex.javaClass.simpleName}")
                Prefs.setLastEvent(c, "$kind $who → 발송 오류 ${ex.javaClass.simpleName} ${ex.message ?: ""}")
                Prefs.clearSent(c, num)
            }
            CallMonitorService.refreshNotification(c)
        }
    }
}
