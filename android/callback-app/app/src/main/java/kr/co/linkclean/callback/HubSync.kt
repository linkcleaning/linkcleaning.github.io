package kr.co.linkclean.callback

import android.content.Context
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * 링크 허브로 통화 기록을 보냄 → AI 비서실 '영업' 탭에 새 문의 전화로 뜸.
 * 최근 기록 40건을 통째로 보내고, 서버가 id로 합치므로 실패해도 다음 통화 때 자동으로 다시 올라감.
 */
object HubSync {
    private const val HUB_URL = "https://linkclean-promo.han0829.workers.dev/api/hub/calls"
    private val executor = Executors.newSingleThreadExecutor()

    fun push(context: Context) {
        val app = context.applicationContext
        executor.execute {
            try {
                val arr = JSONArray()
                Prefs.history(app).take(40).forEach {
                    arr.put(
                        JSONObject().put("id", it.id).put("t", it.time).put("n", it.number)
                            .put("k", it.kind).put("s", it.status).put("tpl", it.tpl).put("a", it.auto)
                    )
                }
                val body = JSONObject().put("device", Build.MODEL ?: "").put("events", arr).toString().toByteArray(Charsets.UTF_8)
                val con = (URL(HUB_URL).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 10_000
                    readTimeout = 15_000
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
                con.outputStream.use { it.write(body) }
                con.responseCode
                con.disconnect()
            } catch (e: Exception) {
                // 인터넷이 안 될 때는 조용히 넘어감 (다음 통화 때 다시 보냄)
            }
        }
    }
}
