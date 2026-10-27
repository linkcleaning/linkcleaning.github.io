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
    val kind: String,   // 수신 / 발신 / 부재중 / 기타 / 테스트
    val status: String, // 발송중 / 성공(사진문자) / 성공(문자) / 실패 / 제외: 사유
    val tpl: String = "",      // 사용한 문자 이름
    val auto: Boolean = false  // 자동 발송 여부
) {
    val isAttempt: Boolean get() = !status.startsWith("제외")
    val isSuccess: Boolean get() = status.startsWith("성공")
    val isFail: Boolean get() = status.startsWith("실패")
}

/** SharedPreferences 기반 설정 · 쿨타임 · 발송 이력 저장소 */
object Prefs {
    private const val NAME = "callback_prefs"

    private const val OLD_DEFAULT_MESSAGE =
        "안녕하세요, 제주 청소 전문 기업 링크클린입니다. 방금 통화 감사드리며, 상세 작업 사례와 안내는 아래 이미지를 참고해 주세요. 문의: 064-763-4545"

    // 아이폰은 4바이트 이모지(🏠📞📍 등)가 있으면 링크·전화번호 밑줄 위치가 밀리는 문제가 있어
    // 기본 문구에는 2바이트 기호(✨ ✅ ■ ☎ ▶)만 사용
    val DEFAULT_MESSAGE = """
✨ 링크클린 상담 연결 안내 ✨

안녕하세요 고객님,
제주도 청소전문업체입니다

전화 주셔서 진심으로 감사드립니다.

─────────────
■ 서비스 안내
─────────────
✅ 입주·이사·준공 청소
✅ 거주·부분·상가 청소
✅ 사무실 청소
✅ 폐기물 처리
✅ 쓰레기집 청소

언제나 고객 만족 100%를 약속드립니다!

──────────────
☎ 064-763-4545
──────────────

▶ 네이버플레이스
https://m.place.naver.com/place/37742213/home

▶ 인스타그램
https://www.instagram.com/linkcleaning
""".trim()

    private val OLD_DEFAULT_MESSAGE_V2 = """
✨ 링크클린 상담 연결 안내 ✨

안녕하세요 고객님,
제주도 청소전문업체입니다 🏠

전화 주셔서 진심으로 감사드립니다.

─────────────
🧹 서비스 안내
─────────────
✅ 입주·이사·준공 청소
✅ 거주·부분·상가 청소
✅ 사무실 청소
✅ 폐기물 처리
✅ 쓰레기집 청소

언제나 고객 만족 100%를 약속드립니다!

──────────────
📞 064-763-4545
──────────────

📍 네이버플레이스
https://m.place.naver.com/place/37742213/home

📸 인스타그램
https://www.instagram.com/linkcleaning
""".trim()
    const val DEFAULT_SUBJECT = ""  // 제목 없음
    const val MAX_IMAGES = 3
    private const val KEY_SEED_VER = "seed_ver"
    private const val SEED_VER = 8

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
    const val KEY_SELECTED = "selected_tpl"
    const val KEY_AUTO_IN = "auto_in_tpl"
    const val KEY_AUTO_MISS = "auto_miss_tpl"
    const val KEY_FIELDS = "fields"
    const val KEY_TITLE_ON = "title_on"
    const val KEY_SIGN_PHONE = "sign_phone"
    const val KEY_SIGN_KAKAO = "sign_kakao"
    const val KEY_SIGN_HOME = "sign_home"
    const val KEY_SIGN_MAG = "sign_mag"
    const val KEY_USE_PHONE = "sign_use_phone"
    const val KEY_USE_KAKAO = "sign_use_kakao"
    const val KEY_USE_HOME = "sign_use_home"
    const val KEY_USE_MAG = "sign_use_mag"
    const val KEY_SAFE_TEXT = "safe_text"
    const val KEY_LAST_EVENT = "last_event"
    const val KEY_SEND_OUTGOING = "send_outgoing"
    const val KEY_AUTO_OUT = "auto_out_tpl"
    const val KEY_SKIP_CONTACTS = "skip_contacts"
    const val KEY_SIGN_TEXT = "sign_text"

    /** 백업에 포함할 설정 키 */
    val BACKUP_KEYS = listOf(
        KEY_BLACKLIST, KEY_SEND_INCOMING, KEY_SEND_MISSED, KEY_MOBILE_ONLY, KEY_COOLDOWN_H, KEY_DAILY_LIMIT,
        KEY_SELECTED, KEY_AUTO_IN, KEY_AUTO_MISS, KEY_AUTO_OUT, KEY_SEND_OUTGOING, KEY_SKIP_CONTACTS, KEY_TITLE_ON, KEY_SIGN_PHONE, KEY_SIGN_KAKAO, KEY_SIGN_HOME,
        KEY_SIGN_MAG, KEY_USE_PHONE, KEY_USE_KAKAO, KEY_USE_HOME, KEY_USE_MAG, KEY_SAFE_TEXT, KEY_SIGN_TEXT, "templates"
    )
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
    fun blacklist(c: Context): Set<String> = excludes(c).map { it.first }.toSet()

    fun sendIncoming(c: Context) = sp(c).getBoolean(KEY_SEND_INCOMING, true)
    fun sendMissed(c: Context) = sp(c).getBoolean(KEY_SEND_MISSED, true)
    /** 내가 건 전화(통화 연결된 경우) 후 자동 발송 */
    fun sendOutgoing(c: Context) = sp(c).getBoolean(KEY_SEND_OUTGOING, true)
    /** 주소록에 저장된 번호(가족·지인·거래처)는 자동 발송 제외 */
    fun skipContacts(c: Context) = sp(c).getBoolean(KEY_SKIP_CONTACTS, false)
    fun mobileOnly(c: Context) = sp(c).getBoolean(KEY_MOBILE_ONLY, true)
    fun cooldownHours(c: Context) = sp(c).getInt(KEY_COOLDOWN_H, 24)
    fun dailyLimit(c: Context) = sp(c).getInt(KEY_DAILY_LIMIT, 100)

    // ---------- 홍보 사진 (최대 3장, promo_0.jpg ~ promo_2.jpg) ----------
    fun imageSlot(c: Context, i: Int) = File(c.filesDir, "promo_$i.jpg")
    fun imageFiles(c: Context): List<File> =
        (0 until MAX_IMAGES).map { imageSlot(c, it) }.filter { it.exists() && it.length() > 0 }

    /** i번째 사진 삭제 후 뒤 사진들을 앞으로 당김 */
    fun removeImage(c: Context, index: Int) {
        val files = imageFiles(c).toMutableList()
        if (index !in files.indices) return
        val datas = files.map { it.readBytes() }.toMutableList()
        datas.removeAt(index)
        files.forEach { it.delete() }
        datas.forEachIndexed { i, b -> imageSlot(c, i).writeBytes(b) }
    }

    fun clearImages(c: Context) = (0 until MAX_IMAGES).forEach { imageSlot(c, it).delete() }

    /** 앱에 들어있는 기본 홍보 사진(assets/promo_*.jpg) 복원 */
    fun restoreDefaultImages(c: Context) {
        clearImages(c)
        for (i in 0 until MAX_IMAGES) {
            try {
                c.assets.open("promo_$i.jpg").use { input -> imageSlot(c, i).outputStream().use { input.copyTo(it) } }
            } catch (_: Exception) { }
        }
    }

    /** 첫 실행(또는 업데이트) 시 기본 문구·사진 세팅 */
    fun seedDefaults(c: Context) {
        val sp = sp(c)
        if (sp.getInt(KEY_SEED_VER, 0) >= SEED_VER) return
        File(c.filesDir, "promo.jpg").delete() // 1.0 버전의 단일 사진
        if (sp.getInt(KEY_SEED_VER, 0) < 2 && imageFiles(c).isEmpty()) restoreDefaultImages(c)
        val e = sp.edit()
        val saved = sp.getString(KEY_MESSAGE, null)
        if (saved == OLD_DEFAULT_MESSAGE || saved == OLD_DEFAULT_MESSAGE_V2) e.remove(KEY_MESSAGE)
        if (sp.getString(KEY_SUBJECT, null) == "링크클린") e.remove(KEY_SUBJECT)
        e.commit()
        // v4: 문자 템플릿 6종 도입 – 직접 고친 문구가 있으면 '수신 감사'에 옮겨 담기
        if (sp.getString(Templates.KEY, null) == null) {
            val custom = sp.getString(KEY_MESSAGE, null)
            val list = Templates.defaults().toMutableList()
            if (!custom.isNullOrBlank() && custom != DEFAULT_MESSAGE) {
                list[0] = list[0].copy(body = custom, title = sp.getString(KEY_SUBJECT, "") ?: "")
            }
            Templates.save(c, list)
        }
        // v5: 수신 감사·부재중 안내를 '모바일 명함 링크' 문구로 교체 (직접 고친 문구는 '(이전)' 문자로 보관)
        if (sp.getInt(KEY_SEED_VER, 0) < 5 && sp.getString(Templates.KEY, null) != null) {
            val list = Templates.load(c).toMutableList()
            val known = setOf(DEFAULT_MESSAGE, OLD_DEFAULT_MESSAGE, OLD_DEFAULT_MESSAGE_V2, Templates.OLD_MISS, Templates.CARD_IN, Templates.CARD_MISS, Templates.CARD_IN_SHORT, Templates.CARD_MISS_SHORT)
            fun upgrade(id: String, body: String) {
                val i = list.indexOfFirst { it.id == id }
                if (i < 0) { Templates.defaults().firstOrNull { it.id == id }?.let { list.add(it) }; return }
                val old = list[i]
                if (old.body.trim() !in known) list.add(i + 1, old.copy(id = id + "_old", name = old.name + "(이전)"))
                list[i] = old.copy(body = body, title = "", sign = false, useImages = true)
            }
            upgrade("t_in", Templates.CARD_IN)
            upgrade("t_miss", Templates.CARD_MISS)
            Templates.save(c, list)
        }
        // v6: 발신 인사도 명함 링크 문구로 (기본 문구 그대로일 때만)
        if (sp.getInt(KEY_SEED_VER, 0) < 6 && sp.getString(Templates.KEY, null) != null) {
            val list = Templates.load(c).toMutableList()
            val i = list.indexOfFirst { it.id == "t_out" }
            if (i >= 0 && list[i].body.trim() == Templates.OLD_OUT) {
                list[i] = list[i].copy(body = Templates.CARD_OUT, title = "", sign = false, useImages = true)
                Templates.save(c, list)
            } else if (i < 0) {
                Templates.defaults().firstOrNull { it.id == "t_out" }?.let { list.add(1, it); Templates.save(c, list) }
            }
        }
        // v7: 자동 문자 3종을 짧은 버전으로 (예전 기본 문구 그대로일 때만 – 직접 고친 문구는 유지)
        if (sp.getInt(KEY_SEED_VER, 0) < 8 && sp.getString(Templates.KEY, null) != null) {
            val list = Templates.load(c).toMutableList()
            val swap = mapOf(
                // v8: 짧게 줄였던 3종은 원래 문구로 되돌리고, 계약 확정만 짧게
                "t_in" to (setOf(Templates.CARD_IN_SHORT) to Templates.CARD_IN),
                "t_miss" to (setOf(Templates.CARD_MISS_SHORT) to Templates.CARD_MISS),
                "t_out" to (setOf(Templates.CARD_OUT_SHORT) to Templates.CARD_OUT),
                "t_contract" to (setOf(Templates.CONTRACT_OLD) to Templates.CONTRACT)
            )
            var changed = false
            list.forEachIndexed { i, t ->
                val (olds, new) = swap[t.id] ?: return@forEachIndexed
                if (t.body.trim() in olds) { list[i] = t.copy(body = new); changed = true }
            }
            if (changed) Templates.save(c, list)
        }
        sp.edit().putInt(KEY_SEED_VER, SEED_VER).commit()
    }

    // ---------- 자동 콜백 문자 / 서명 ----------
    fun autoInId(c: Context): String = sp(c).getString(KEY_AUTO_IN, "t_in") ?: "t_in"
    fun autoMissId(c: Context): String = sp(c).getString(KEY_AUTO_MISS, "t_miss") ?: "t_miss"
    fun autoOutId(c: Context): String = sp(c).getString(KEY_AUTO_OUT, "t_out") ?: "t_out"
    fun selectedId(c: Context): String = sp(c).getString(KEY_SELECTED, "t_in") ?: "t_in"
    fun titleOn(c: Context) = sp(c).getBoolean(KEY_TITLE_ON, false)
    /** 아이폰 보정 (이모지 빼고 보내기) – 기본 켜짐 */
    fun safeText(c: Context) = sp(c).getBoolean(KEY_SAFE_TEXT, true)
    fun signPhone(c: Context) = sp(c).getString(KEY_SIGN_PHONE, "064-763-4545") ?: ""
    fun signKakao(c: Context) = sp(c).getString(KEY_SIGN_KAKAO, "https://pf.kakao.com/_xfxdrxmM") ?: ""
    fun signHome(c: Context) = sp(c).getString(KEY_SIGN_HOME, "www.linkclean.co.kr") ?: ""
    fun signMag(c: Context) = sp(c).getString(KEY_SIGN_MAG, "") ?: ""
    fun signUsePhone(c: Context) = sp(c).getBoolean(KEY_USE_PHONE, true)
    fun signUseKakao(c: Context) = sp(c).getBoolean(KEY_USE_KAKAO, true)
    fun signUseHome(c: Context) = sp(c).getBoolean(KEY_USE_HOME, true)
    fun signUseMag(c: Context) = sp(c).getBoolean(KEY_USE_MAG, false)
    /** 직접 쓴 서명 (null 이면 기본 서명) */
    fun signCustom(c: Context): String? = sp(c).getString(KEY_SIGN_TEXT, null)

    /** 발송제외 번호 목록 (번호, 메모) – 한 줄에 "번호 메모" */
    fun excludes(c: Context): List<Pair<String, String>> = blacklistRaw(c).lines().mapNotNull { line ->
        val t = line.trim()
        val idx = t.indexOfFirst { !(it.isDigit() || it in "-+. ()") }
        val num = PhoneUtil.normalize(if (idx < 0) t else t.substring(0, idx))
        if (num.length < 7) null else num to (if (idx < 0) "" else t.substring(idx).trim())
    }

    fun setExcludes(c: Context, list: List<Pair<String, String>>) {
        sp(c).edit().putString(KEY_BLACKLIST, list.joinToString("\n") { (n, m) -> if (m.isBlank()) n else "$n $m" }).apply()
    }

    fun excludeMemo(c: Context, num: String): String? = excludes(c).firstOrNull { it.first == num }?.second

    // ---------- 24시간 쿨타임 ----------
    fun lastSent(c: Context, num: String) = sp(c).getLong(SENT_PREFIX + num, 0L)
    fun markSent(c: Context, num: String, t: Long) { sp(c).edit().putLong(SENT_PREFIX + num, t).commit() }
    fun clearSent(c: Context, num: String) { sp(c).edit().remove(SENT_PREFIX + num).commit() }
    fun clearAllSent(c: Context) {
        val e = sp(c).edit(); sp(c).all.keys.filter { it.startsWith(SENT_PREFIX) }.forEach { e.remove(it) }; e.commit()
    }

    /** 자동 콜백 마지막 감지 결과 (점검용) */
    fun setLastEvent(c: Context, msg: String) {
        val t = java.text.SimpleDateFormat("MM/dd HH:mm:ss", java.util.Locale.KOREA).format(java.util.Date())
        sp(c).edit().putString(KEY_LAST_EVENT, "$t  $msg").apply()
    }
    fun lastEvent(c: Context): String = sp(c).getString(KEY_LAST_EVENT, "") ?: ""

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
            SendRecord(o.getLong("id"), o.getLong("t"), o.getString("n"), o.getString("k"), o.getString("s"), o.optString("tpl"), o.optBoolean("a"))
        }
    }

    @Synchronized
    fun addHistory(c: Context, r: SendRecord) {
        val list = history(c).toMutableList()
        list.add(0, r)
        saveHistory(c, list.take(300))
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
            arr.put(JSONObject().put("id", it.id).put("t", it.time).put("n", it.number).put("k", it.kind).put("s", it.status).put("tpl", it.tpl).put("a", it.auto))
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

    // ---------- 아이폰 링크 밀림 방지 ----------
    /** 4바이트(보조 평면) 이모지 개수 */
    fun countWideEmoji(text: String): Int {
        var n = 0; var i = 0
        while (i < text.length) { val cp = text.codePointAt(i); if (cp > 0xFFFF) n++; i += Character.charCount(cp) }
        return n
    }

    /** 4바이트 이모지 제거 (자주 쓰는 것은 비슷한 2바이트 기호로 교체) */
    fun stripWideEmoji(text: String): String {
        val map = mapOf(0x1F4DE to "☎", 0x1F4F1 to "☎", 0x1F4CD to "▶", 0x1F4F8 to "▶", 0x1F449 to "▶", 0x1F9F9 to "■", 0x1F3E0 to "", 0x1F3E1 to "")
        val sb = StringBuilder(); var i = 0
        while (i < text.length) {
            val cp = text.codePointAt(i)
            when {
                cp > 0xFFFF -> sb.append(map[cp] ?: "")
                cp == 0xFE0F || cp == 0x200D -> {} // 이모지 꼬리표 제거
                else -> sb.appendCodePoint(cp)
            }
            i += Character.charCount(cp)
        }
        return sb.toString().lines().joinToString("\n") { it.trimEnd() }.replace(Regex("(?m)^ +"), "")
    }
}
