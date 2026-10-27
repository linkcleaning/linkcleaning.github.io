package kr.co.linkclean.callback

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.Calendar
import java.util.concurrent.atomic.AtomicLong

/** 발송 기록 1건 */
data class SendRecord(
    val id: Long,
    val time: Long,
    val number: String,
    val kind: String,   // 수신 / 부재중 / 테스트
    val status: String  // 발송중 / 성공(MMS) / 성공(문자) / 실패 / 제외: 사유
) {
    val isAttempt: Boolean get() = !status.startsWith("제외")
    val isSuccess: Boolean get() = status.startsWith("성공")
}

/** SharedPreferences 기반 설정 · 쿨타임 · 발송 이력 저장소 */
object Prefs {
    private const val NAME = "callback_prefs"

    const val DEFAULT_MESSAGE =
        "안녕하세요, 제주 청소 전문 기업 링크클린입니다. 방금 통화 감사드리며, 상세 작업 사례와 안내는 아래 이미지를 참고해 주세요. 문의: 064-763-4545"
    const val DEFAULT_SUBJECT = "링크클린"

    const val KEY_ENABLED = "enabled"
    const val KEY_MESSAGE = "message"
    const val KEY_SUBJECT = "subject"
    const val KEY_BLACKLIST = "blacklist"
    const val KEY_SEND_INCOMING = "send_incoming"
    const val KEY_SEND_MISSED = "send_missed"
    const val KEY_MOBILE_ONLY = "mobile_only"
    const val KEY_COOLDOWN_H = "cooldown_hours"
    const val KEY_DAILY_LIMIT = "daily_limit"
    const val KEY_HISTORY = "history"
    const val KEY_PROCESSED = "processed_calls"
    const val KEY_IMAGE_VER = "image_ver"
    private const val SENT_PREFIX = "sent_"

    private val idGen = AtomicLong(System.currentTimeMillis())

    fun sp(c: Context): SharedPreferences =
        c.applicationContext.getSharedPreferences(NAME, Context.MODE_PRIVATE)

    // ---------- 설정 ----------
    fun enabled(c: Context) = sp(c).getBoolean(KEY_ENABLED, false)
    fun setEnabled(c: Context, v: Boolean) = sp(c).edit().putBoolean(KEY_ENABLED, v).apply()

    fun message(c: Context): String = sp(c).getString(KEY_MESSAGE, DEFAULT_MESSAGE) ?: DEFAULT_MESSAGE
    fun subject(c: Context): String = sp(c).getString(KEY_SUBJECT, DEFAULT_SUBJECT) ?: ""
    fun blacklistRaw(c: Context): String = sp(c).getString(KEY_BLACKLIST, "") ?: ""
    fun blacklist(c: Context): Set<String> =
        blacklistRaw(c).lines().map { PhoneUtil.normalize(it) }.filter { it.length >= 7 }.toSet()

    fun sendIncoming(c: Context) = sp(c).getBoolean(KEY_SEND_INCOMING, true)
    fun sendMissed(c: Context) = sp(c).getBoolean(KEY_SEND_MISSED, true)
    fun mobileOnly(c: Context) = sp(c).getBoolean(KEY_MOBILE_ONLY, true)
    fun cooldownHours(c: Context) = sp(c).getInt(KEY_COOLDOWN_H, 24)
    fun dailyLimit(c: Context) = sp(c).getInt(KEY_DAILY_LIMIT, 100)

    fun imageFile(c: Context) = File(c.filesDir, "promo.jpg")

    // ---------- 24시간 쿨타임 ----------
    fun lastSent(c: Context, num: String) = sp(c).getLong(SENT_PREFIX + num, 0L)
    fun markSent(c: Context, num: String, t: Long) { sp(c).edit().putLong(SENT_PREFIX + num, t).commit() }
    fun clearSent(c: Context, num: String) { sp(c).edit().remove(SENT_PREFIX + num).commit() }

    /** 7일 지난 쿨타임 기록 정리 */
    fun pruneCooldowns(c: Context) {
        val limit = System.currentTimeMillis() - 7L * 24 * 3600_000
        val e = sp(c).edit()
        sp(c).all.forEach { (k, v) -> if (k.startsWith(SENT_PREFIX) && v is Long && v < limit) e.remove(k) }
        e.apply()
    }

    // ---------- 처리한 통화기록 (중복 처리 방지) ----------
    fun processedKeys(c: Context): MutableList<String> {
        val arr = JSONArray(sp(c).getString(KEY_PROCESSED, "[]"))
        return MutableList(arr.length()) { arr.getString(it) }
    }

    fun saveProcessedKeys(c: Context, keys: List<String>) {
        val trimmed = keys.takeLast(300)
        sp(c).edit().putString(KEY_PROCESSED, JSONArray(trimmed).toString()).commit()
    }

    // ---------- 발송 이력 ----------
    fun newId(): Long = idGen.incrementAndGet()

    @Synchronized
    fun history(c: Context): List<SendRecord> {
        val arr = JSONArray(sp(c).getString(KEY_HISTORY, "[]"))
        return List(arr.length()) {
            val o = arr.getJSONObject(it)
            SendRecord(o.getLong("id"), o.getLong("t"), o.getString("n"), o.getString("k"), o.getString("s"))
        }
    }

    @Synchronized
    fun addHistory(c: Context, r: SendRecord) {
        val list = history(c).toMutableList()
        list.add(0, r)
        saveHistory(c, list.take(150))
    }

    @Synchronized
    fun updateStatus(c: Context, id: Long, status: String) {
        saveHistory(c, history(c).map { if (it.id == id) it.copy(status = status) else it })
    }

    @Synchronized
    fun clearHistory(c: Context) = saveHistory(c, emptyList())

    private fun saveHistory(c: Context, list: List<SendRecord>) {
        val arr = JSONArray()
        list.forEach {
            arr.put(JSONObject().put("id", it.id).put("t", it.time).put("n", it.number).put("k", it.kind).put("s", it.status))
        }
        sp(c).edit().putString(KEY_HISTORY, arr.toString()).commit()
    }

    fun startOfToday(): Long = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
    }.timeInMillis

    fun todaySuccess(c: Context): Int {
        val s = startOfToday()
        return history(c).count { it.time >= s && it.isSuccess }
    }

    fun todayAttempts(c: Context): Int {
        val s = startOfToday()
        return history(c).count { it.time >= s && it.isAttempt && it.kind != "테스트" }
    }
}
