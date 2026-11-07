package kr.co.linkclean.callback

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** 예약 문자를 보낸 손님 → 청소 날짜가 지나면 '후기 문자 보내세요' 알림 */
data class ReviewItem(val id: Long, val num: String, val date: String, val status: String) // pending / sent / skipped

object ReviewReminder {
    private const val KEY = "review_list"
    private const val KEY_NOTI_DAY = "review_noti_day"
    private const val CHANNEL = "review_remind"
    private const val NOTI_ID = 4547
    const val EXTRA_NUM = "review_num"
    const val TPL_ID = "t_review"

    private fun today(): String = SimpleDateFormat("yyyy-MM-dd", Locale.KOREA).format(Date())

    @Synchronized
    fun all(c: Context): MutableList<ReviewItem> {
        val arr = JSONArray(Prefs.sp(c).getString(KEY, "[]"))
        return MutableList(arr.length()) {
            val o = arr.getJSONObject(it)
            ReviewItem(o.getLong("id"), o.getString("n"), o.getString("d"), o.optString("s", "pending"))
        }
    }

    @Synchronized
    private fun save(c: Context, list: List<ReviewItem>) {
        val arr = JSONArray()
        list.takeLast(200).forEach { arr.put(JSONObject().put("id", it.id).put("n", it.num).put("d", it.date).put("s", it.status)) }
        Prefs.sp(c).edit().putString(KEY, arr.toString()).apply()
    }

    /** 예약 문자 보낼 때 등록 (같은 번호의 대기 건은 새 날짜로 교체) */
    fun add(c: Context, num: String, date: String) {
        if (num.isBlank() || date.isBlank()) return
        val list = all(c).filterNot { it.num == num && it.status == "pending" }.toMutableList()
        list.add(ReviewItem(System.currentTimeMillis(), num, date, "pending"))
        save(c, list)
    }

    /** 청소 날짜가 지난 대기 건 */
    fun due(c: Context): List<ReviewItem> {
        val t = today()
        return all(c).filter { it.status == "pending" && it.date < t }.sortedBy { it.date }
    }

    fun mark(c: Context, num: String, status: String) {
        save(c, all(c).map { if (it.num == num && it.status == "pending") it.copy(status = status) else it })
        if (due(c).isEmpty()) cancel(c)
    }

    fun cancel(c: Context) {
        c.getSystemService(NotificationManager::class.java)?.cancel(NOTI_ID)
    }

    /** 하루 한 번 알림 */
    fun checkAndNotify(c: Context) {
        val app = c.applicationContext
        val list = due(app)
        if (list.isEmpty()) return
        val t = today()
        if (Prefs.sp(app).getString(KEY_NOTI_DAY, "") == t) return
        Prefs.sp(app).edit().putString(KEY_NOTI_DAY, t).apply()
        val nm = app.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "후기 문자 알림", NotificationManager.IMPORTANCE_DEFAULT))
        }
        val first = list.first()
        val open = Intent(app, MainActivity::class.java).putExtra(EXTRA_NUM, first.num)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        val pi = PendingIntent.getActivity(app, 11, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val title = if (list.size == 1) "⭐ ${PhoneUtil.pretty(first.num)} 손님께 후기 문자 보낼 때예요"
            else "⭐ 후기 문자 보낼 손님이 ${list.size}명 있어요"
        val n = NotificationCompat.Builder(app, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_call)
            .setContentTitle(title)
            .setContentText("청소가 끝났어요. 누르면 후기 요청 문자가 바로 준비돼요")
            .setAutoCancel(true)
            .setContentIntent(pi)
            .build()
        try { nm.notify(NOTI_ID, n) } catch (_: SecurityException) { }
    }
}
