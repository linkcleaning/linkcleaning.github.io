package kr.co.linkclean.callback

object PhoneUtil {
    /** "+82 10-1234-5678", "010.1234.5678" 등 → "01012345678" */
    fun normalize(raw: String?): String {
        if (raw.isNullOrBlank()) return ""
        var d = raw.filter { it.isDigit() }
        if (d.startsWith("82") && d.length >= 10) d = "0" + d.removePrefix("82")
        return d
    }

    fun isMobile(n: String): Boolean = n.startsWith("01") && n.length in 10..11

    fun pretty(n: String): String = when {
        n.length == 11 -> "${n.substring(0, 3)}-${n.substring(3, 7)}-${n.substring(7)}"
        n.length == 10 && n.startsWith("02") -> "${n.substring(0, 2)}-${n.substring(2, 6)}-${n.substring(6)}"
        n.length == 10 -> "${n.substring(0, 3)}-${n.substring(3, 6)}-${n.substring(6)}"
        n.length == 9 && n.startsWith("02") -> "${n.substring(0, 2)}-${n.substring(2, 5)}-${n.substring(5)}"
        else -> n
    }
}
