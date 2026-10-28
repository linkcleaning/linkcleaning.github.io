package kr.co.linkclean.callback

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/** 문자 템플릿 (웹앱 '문자설정'과 같은 구조) */
data class Tpl(
    val id: String,
    val icon: String,
    val name: String,
    val type: String,       // 수신 / 발신 / 부재중 / 기타
    val title: String,      // MMS 제목 (비우면 제목 없음)
    val body: String,
    val sign: Boolean,      // 하단 서명 붙이기
    val useImages: Boolean  // 공통 홍보 사진 같이 보내기
) {
    fun toJson(): JSONObject = JSONObject()
        .put("id", id).put("icon", icon).put("name", name).put("type", type)
        .put("title", title).put("body", body).put("sign", sign).put("img", useImages)

    val hasTokens: Boolean get() = Templates.TOKEN_RE.containsMatchIn(body)

    companion object {
        fun from(o: JSONObject) = Tpl(
            o.optString("id"), o.optString("icon", "💬"), o.optString("name"), o.optString("type", "수신"),
            o.optString("title"), o.optString("body"), o.optBoolean("sign", true), o.optBoolean("img", true)
        )
    }
}

data class FieldDef(val key: String, val label: String, val type: String, val def: String = "")

object Templates {
    const val KEY = "templates"
    val TYPES = listOf("수신", "발신", "부재중", "기타")
    private const val LINE = "────────────"
    val TOKEN_RE = Regex("\\{(청소날짜|도착시간|청소비용|계약금|잔금)\\}")

    val FIELDS = listOf(
        FieldDef("청소날짜", "▷ 청소 날짜", "date"),
        FieldDef("도착시간", "▷ 도착 시간", "time", "08:30"),
        FieldDef("청소비용", "▷ 청소 비용", "money"),
        FieldDef("계약금", "▷ 계약금", "money", "100000"),
    )

    const val CARD_URL = "https://linkcleaning.github.io/card/"

    /** 수신 감사 – 짧은 안내 + 모바일 명함 링크 하나 (링크는 맨 끝에 두어야 미리보기 카드가 뜸) */
    val CARD_IN = """
[링크클린] 전화 주셔서 진심으로 감사드립니다.

제주 청소 전문 링크클린입니다.
입주·이사·거주·상가·사무실 청소,
폐기물·쓰레기집 청소까지 꼼꼼하게 해드립니다.

Tel. 064-763-4545

아래를 누르면 전화·카톡 상담, 작업 사진,
위치를 한 번에 보실 수 있어요.
$CARD_URL
""".trim()

    /** 부재중 안내 – 명함 링크 버전 */
    val CARD_MISS = """
[링크클린] 전화를 받지 못해 죄송합니다.

지금 현장 작업 중이라 통화가 어려웠어요.
작업이 끝나는 대로 가장 먼저 연락드리겠습니다.
급하시면 문자나 카톡으로 남겨 주세요.

Tel. 064-763-4545

아래를 누르면 전화·카톡 상담, 작업 사진,
위치를 한 번에 보실 수 있어요.
$CARD_URL
""".trim()

    /** 발신 인사 – 대표님이 건 전화가 끝난 뒤 */
    val CARD_OUT = """
[링크클린] 통화 감사드립니다.

제주 청소 전문 링크클린입니다.
말씀 나눈 내용 꼼꼼히 준비하겠습니다.
궁금하신 점은 언제든 편하게 연락 주세요.

Tel. 064-763-4545

아래를 누르면 전화·카톡 상담, 작업 사진,
위치를 한 번에 보실 수 있어요.
$CARD_URL
""".trim()


    // ---- 짧은 버전 (한 화면에 다 보이게 – '모두 보기' 안 생기도록) ----
    val CARD_IN_SHORT = """
[링크클린] 전화 주셔서 감사합니다.
제주 청소 전문 링크클린입니다.
Tel. 064-763-4545

상담·작업사진·위치 한 번에 보기
$CARD_URL
""".trim()

    val CARD_MISS_SHORT = """
[링크클린] 전화를 받지 못해 죄송합니다.
현장 작업 중이라 끝나는 대로 바로 연락드릴게요.
Tel. 064-763-4545

상담·작업사진·위치 한 번에 보기
$CARD_URL
""".trim()

    val CARD_OUT_SHORT = """
[링크클린] 통화 감사드립니다.
궁금하신 점은 언제든 편하게 연락 주세요.
Tel. 064-763-4545

상담·작업사진·위치 한 번에 보기
$CARD_URL
""".trim()


    /** 계약 확정(예약) 문자 – 한 화면에 들어오게 줄인 버전 */
    val CONTRACT = """
[링크클린] 예약 안내
소중한 인연 진심으로 감사드립니다.

■ 청소 일정 : {청소날짜}
■ 도착 시간 : {도착시간}경
■ 청소 비용 : {청소비용}
■ 계약금 : {계약금}

■ 입금 계좌 : 토스뱅크 1000-1626-3066 (한승우)

- 계약금 입금 확인 후 예약이 확정됩니다.
- 주소(동·호수)와 현관 비밀번호를 문자로 남겨주세요.

Tel. 064-763-4545
""".trim()

    val CONTRACT_OLD = """
[링크클린]

안녕하세요, 제주 청소 전문 "링크클린"입니다.
소중한 인연을 맺어주셔서 진심으로 감사드립니다.

$LINE
■ 청소 일정 : {청소날짜}
■ 도착 시간 : {도착시간}경
■ 청소 비용 : {청소비용}
■ 계약금 : {계약금}
$LINE

■ 계약금 입금 계좌
토스뱅크 1000-1626-3066
예금주 : 한승우

✔ 계약금 입금이 확인되면 예약이 최종 확정됩니다.
✔ 정확한 주소와 동·호수를 문자로 남겨주세요.
✔ 현관 비밀번호가 있다면 함께 알려주시면 편리합니다.

깨끗한 공간으로 보답하겠습니다. 감사합니다!
☎ 064-763-4545
""".trim()

    const val OLD_OUT = "안녕하세요, 제주 청소 전문 기업 링크클린입니다. 통화 감사드립니다. 아래 링크에서 작업 사례와 상세 안내를 확인하실 수 있습니다."

    const val OLD_MISS = "안녕하세요, 링크클린입니다. 현재 현장 작업 중이라 전화를 받지 못했습니다. 문의주신 내용을 문자로 남겨주시면 작업 종료 후 가장 먼저 연락드리겠습니다. 감사합니다!"

    // 아이폰 링크 밀림 방지를 위해 본문에는 4바이트 이모지를 쓰지 않음 (아이콘은 앱 화면에만 표시)
    fun defaults(): List<Tpl> = listOf(
        Tpl("t_in", "🌟", "수신 감사", "수신", "", CARD_IN, false, true),
        Tpl("t_out", "📤", "발신 인사", "발신", "", CARD_OUT, false, true),
        Tpl("t_miss", "⏳", "부재중 안내", "부재중", "", CARD_MISS, false, true),
        Tpl("t_contract", "🤝", "예약 문자", "기타", "링크클린", CONTRACT, false, false),
    )

    fun load(c: Context): MutableList<Tpl> {
        val raw = Prefs.sp(c).getString(KEY, null) ?: return defaults().toMutableList()
        return try {
            val arr = JSONArray(raw)
            MutableList(arr.length()) { Tpl.from(arr.getJSONObject(it)) }.ifEmpty { defaults().toMutableList() }
        } catch (e: Exception) { defaults().toMutableList() }
    }

    fun save(c: Context, list: List<Tpl>) {
        val arr = JSONArray(); list.forEach { arr.put(it.toJson()) }
        Prefs.sp(c).edit().putString(KEY, arr.toString()).apply()
    }

    fun find(c: Context, id: String?): Tpl? = load(c).firstOrNull { it.id == id }

    fun tokens(body: String): Set<String> = TOKEN_RE.findAll(body).map { it.groupValues[1] }.toSet()
}

/** 문자 본문 만들기 (제목 줄 + 본문 + 서명) */
object Compose {
    private val WEEK = arrayOf("일", "월", "화", "수", "목", "금", "토")

    fun signText(c: Context): String {
        Prefs.signCustom(c)?.let { return it.trim() }
        return defaultSign(c)
    }

    fun defaultSign(c: Context): String {
        val l = mutableListOf<String>()
        val p = Prefs.signPhone(c).trim(); val k = Prefs.signKakao(c).trim()
        val h = Prefs.signHome(c).trim(); val m = Prefs.signMag(c).trim()
        if (Prefs.signUsePhone(c) && p.isNotEmpty()) l.add("☎ $p")
        if (Prefs.signUseKakao(c) && k.isNotEmpty()) l.add("▶ 카카오톡 상담: $k")
        if (Prefs.signUseHome(c) && h.isNotEmpty()) l.add("▶ 홈페이지: $h")
        if (Prefs.signUseMag(c) && m.isNotEmpty()) l.add("▶ 작업사례 보기: $m")
        return l.joinToString("\n")
    }

    fun build(c: Context, t: Tpl, fields: Map<String, String> = emptyMap()): String {
        val sb = StringBuilder()
        if (Prefs.titleOn(c) && t.title.isNotBlank()) sb.append("[${t.title.trim()}]\n")
        sb.append(fill(t.body.trim(), fields))
        val sg = if (t.sign) signText(c) else ""
        if (sg.isNotEmpty()) sb.append("\n\n").append(sg)
        return finalize(c, sb.toString())
    }

    /** 보내기 직전 최종 처리 – '아이폰 보정'이 켜져 있으면 이모지·특수기호를 일반 글자로 */
    fun finalize(c: Context, text: String): String = if (Prefs.safeText(c)) safe(text) else text

    /**
     * 아이폰 링크 밀림 방지: 한글·영문·숫자·기본 문장부호만 남기고
     * 이모지·장식 기호는 비슷한 일반 글자로 바꾸거나 뺀다.
     */
    fun safe(text: String): String {
        val map = mapOf(
            0x2705 to "-", 0x2714 to "-", 0x2611 to "-", 0x2713 to "-",
            0x260E to "Tel.", 0x1F4DE to "Tel.", 0x1F4F1 to "Tel.",
            0x25B6 to "■", 0x25BA to "■", 0x27A1 to "→", 0x1F449 to "■", 0x1F4CD to "■", 0x1F4F8 to "■",
            0x1F9F9 to "■", 0x2B50 to "*", 0x2605 to "*", 0x2606 to "*", 0x25B7 to "■"
        )
        val sb = StringBuilder()
        var i = 0
        while (i < text.length) {
            val cp = text.codePointAt(i)
            i += Character.charCount(cp)
            val keep = cp == '\n'.code || cp in 0x20..0x7E ||
                cp in 0xAC00..0xD7A3 || cp in 0x3131..0x318E || cp in 0x1100..0x11FF ||   // 한글
                cp == 0x00B7 || cp == 0x2022 || cp == 0x203B || cp == 0x2192 ||           // · • ※ →
                cp in 0x2018..0x201D || cp == 0x2026 || cp in 0x3000..0x3011 ||           // ‘’“” … 「」【】
                cp == 0x25A0 || cp == 0x25A1 || cp == 0x25CB || cp == 0x25CF ||           // ■ □ ○ ●
                cp == 0x00D7 || cp == 0xFF5E || cp == 0x2015
            when {
                map.containsKey(cp) -> sb.append(map[cp])
                cp == 0x2500 || cp == 0x2501 || cp == 0x2014 -> sb.append('-')              // ─ 줄 → -
                keep -> sb.appendCodePoint(cp)
                else -> {} // 그 밖의 이모지·기호는 뺌
            }
        }
        return sb.toString().lines().joinToString("\n") { line ->
            line.replace(Regex(" {2,}"), " ").trim().let { l ->
                // "- " 로 시작하도록 정리 (예: "-입주" → "- 입주")
                if (l.startsWith("-") && l.length > 1 && l[1] != '-' && l[1] != ' ') "- " + l.substring(1) else l
            }
        }.replace(Regex("\n{3,}"), "\n\n").trim()
    }

    fun fill(text: String, fields: Map<String, String>): String =
        Templates.TOKEN_RE.replace(text) { m -> fieldText(m.groupValues[1], fields).ifEmpty { m.value } }

    fun won(v: String?): String {
        val n = v?.filter { it.isDigit() }?.toLongOrNull() ?: return ""
        return String.format("%,d원", n)
    }

    fun fieldText(key: String, f: Map<String, String>): String {
        if (key == "잔금") {
            val a = f["청소비용"]?.filter { it.isDigit() }?.toLongOrNull() ?: return ""
            val b = f["계약금"]?.filter { it.isDigit() }?.toLongOrNull() ?: 0L
            return won(maxOf(0L, a - b).toString())
        }
        val def = Templates.FIELDS.firstOrNull { it.key == key } ?: return ""
        val v = f[key].orEmpty()
        if (v.isEmpty()) return ""
        return when (def.type) {
            "money" -> won(v)
            "date" -> try {
                val (y, mo, d) = v.split("-").map { it.toInt() }
                val cal = Calendar.getInstance().apply { set(y, mo - 1, d) }
                "${y}년 ${mo}월 ${d}일 (${WEEK[cal.get(Calendar.DAY_OF_WEEK) - 1]})"
            } catch (e: Exception) { v }
            "time" -> try {
                val (h, mi) = v.split(":").map { it.toInt() }
                val ap = if (h < 12) "오전" else "오후"
                val hh = if (h % 12 == 0) 12 else h % 12
                "$ap ${hh}시" + if (mi > 0) " ${mi}분" else ""
            } catch (e: Exception) { v }
            else -> v
        }
    }

    /** 한글 2바이트 기준 바이트 수 (90바이트 초과 = 장문) */
    fun byteLen(s: String): Int = s.fold(0) { a, ch -> a + if (ch.code > 127) 2 else 1 }

    fun kind(text: String, withImages: Boolean): String = when {
        withImages -> "MMS(사진)"
        byteLen(text) > 90 -> "LMS(장문)"
        else -> "SMS(단문)"
    }
}
