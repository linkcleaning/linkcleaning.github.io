package kr.co.linkclean.callback

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import org.json.JSONObject

/**
 * 통화가 끝나면 '어떤 문자 보낼까요?' 알림 (입주·이사 / 유품정리 / 쓰레기집 / 상가·사무실)
 * 정해진 시간 안에 안 고르면 기본 문자(수신 감사·발신 인사)가 자동으로 나간다.
 */
object CallPicker {
    private const val CHANNEL = "call_pick"
    const val ACTION_PICK = "kr.co.linkclean.callback.PICK"
    const val EXTRA_NUM = "num"
    const val EXTRA_TPL = "tpl"          // 템플릿 id, "" = 기본 문자, "-" = 안 보냄
    private const val KEY = "pick_pending"

    /** 고르기 버튼 4개 (템플릿 id, 버튼 이름) */
    val CHOICES = listOf(
        "t_q_move" to "입주·이사",
        "t_q_estate" to "유품정리",
        "t_q_trash" to "쓰레기집",
        "t_q_shop" to "상가·사무실",
    )

    private fun notiId(num: String) = 5000 + (num.hashCode() and 0xFFF)
    private fun reqBase(num: String) = (num.hashCode() and 0xFFFF) * 10

    private fun pendingAll(c: Context): JSONObject = try { JSONObject(Prefs.sp(c).getString(KEY, "{}") ?: "{}") } catch (e: Exception) { JSONObject() }
    @Synchronized private fun savePending(c: Context, o: JSONObject) { Prefs.sp(c).edit().putString(KEY, o.toString()).commit() }

    fun pickIntent(c: Context, num: String, tpl: String, idx: Int): PendingIntent {
        val i = Intent(c, PickReceiver::class.java).setAction(ACTION_PICK).putExtra(EXTRA_NUM, num).putExtra(EXTRA_TPL, tpl)
        return PendingIntent.getBroadcast(c, reqBase(num) + idx, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    /** 고르기 알림 띄우기 */
    fun show(c: Context, num: String, recordId: Long, kind: String, defTplId: String) {
        val app = c.applicationContext
        val secs = Prefs.pickSeconds(app)
        val o = pendingAll(app)
        o.put(num, JSONObject().put("id", recordId).put("kind", kind).put("def", defTplId).put("t", System.currentTimeMillis()))
        savePending(app, o)

        val nm = app.getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "통화 후 문자 고르기", NotificationManager.IMPORTANCE_HIGH).apply {
                setSound(null, null); enableVibration(true)
            })
        }
        val defName = Templates.find(app, defTplId)?.name ?: "기본 문자"
        val title = "📞 ${PhoneUtil.pretty(num)} · 어떤 문자 보낼까요?"
        val small = RemoteViews(app.packageName, R.layout.notif_pick_small)
        val big = RemoteViews(app.packageName, R.layout.notif_pick_big)
        val ids = intArrayOf(R.id.p1, R.id.p2, R.id.p3, R.id.p4)
        for (rv in listOf(small, big)) {
            CHOICES.forEachIndexed { i, (tid, label) ->
                rv.setTextViewText(ids[i], label)
                rv.setOnClickPendingIntent(ids[i], pickIntent(app, num, tid, i + 1))
            }
        }
        big.setTextViewText(R.id.pTitle, title)
        big.setTextViewText(R.id.pInfo, "${secs}초 안에 안 고르면 [$defName] 문자가 자동으로 나가요")
        big.setTextViewText(R.id.pDef, "$defName 바로 보내기")
        big.setOnClickPendingIntent(R.id.pDef, pickIntent(app, num, "", 5))
        big.setOnClickPendingIntent(R.id.pSkip, pickIntent(app, num, "-", 6))

        val open = PendingIntent.getActivity(app, reqBase(num) + 7,
            Intent(app, PickActivity::class.java).putExtra(EXTRA_NUM, num).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val n = NotificationCompat.Builder(app, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_call)
            .setContentTitle(title)
            .setContentText("${secs}초 뒤 [$defName] 자동 발송 · 눌러서 고르기")
            .setStyle(NotificationCompat.DecoratedCustomViewStyle())
            .setCustomContentView(small)
            .setCustomHeadsUpContentView(small)
            .setCustomBigContentView(big)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_RECOMMENDATION)
            .setContentIntent(open)
            .setAutoCancel(false).setOngoing(true)
            .setUsesChronometer(true).setChronometerCountDown(true)
            .setWhen(System.currentTimeMillis() + secs * 1000L)
            .build()
        try { nm.notify(notiId(num), n) } catch (_: SecurityException) { }

        // 시간 지나면 기본 문자
        val am = app.getSystemService(AlarmManager::class.java)
        am.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + secs * 1000L, pickIntent(app, num, "", 9))
        Prefs.setLastEvent(app, "$kind ${PhoneUtil.pretty(num)} → 문자 고르는 중 (${secs}초 뒤 기본 문자)")
    }

    fun isPending(c: Context, num: String) = pendingAll(c).has(num)

    /** 고른 문자 보내기 (tpl: id / "" 기본 / "-" 안 보냄) */
    fun choose(c: Context, num: String, tpl: String) {
        val app = c.applicationContext
        val o = pendingAll(app)
        val p = o.optJSONObject(num) ?: return   // 이미 처리됨
        o.remove(num); savePending(app, o)
        app.getSystemService(NotificationManager::class.java)?.cancel(notiId(num))
        app.getSystemService(AlarmManager::class.java)?.cancel(pickIntent(app, num, "", 9))

        val id = p.getLong("id")
        if (tpl == "-") {
            Prefs.updateRecord(app, id, "제외: 직접 안 보냄", null)
            Prefs.clearSent(app, num)
            Prefs.setLastEvent(app, "${PhoneUtil.pretty(num)} → 안 보내기로 함")
            return
        }
        val t = Templates.find(app, tpl.ifEmpty { p.optString("def") })?.takeIf { !it.hasTokens }
            ?: Templates.find(app, p.optString("def"))
            ?: run { Prefs.updateRecord(app, id, "실패: 문자 없음", null); return }
        Prefs.updateRecord(app, id, "발송중", t.name)
        Prefs.setLastEvent(app, "${p.optString("kind")} ${PhoneUtil.pretty(num)} → [${t.name}] 보내는 중")
        val text = Compose.build(app, t)
        Handler(Looper.getMainLooper()).post {
            try { MmsSender.send(app, num, id, text, t.title, t.useImages) }
            catch (ex: Exception) { Prefs.updateRecord(app, id, "실패: ${ex.javaClass.simpleName}", null); Prefs.clearSent(app, num) }
            CallMonitorService.refreshNotification(app)
        }
    }
}

class PickReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != CallPicker.ACTION_PICK) return
        val num = intent.getStringExtra(CallPicker.EXTRA_NUM) ?: return
        CallPicker.choose(context, num, intent.getStringExtra(CallPicker.EXTRA_TPL) ?: "")
    }
}
