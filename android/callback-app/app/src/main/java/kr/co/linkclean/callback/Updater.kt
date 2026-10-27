package kr.co.linkclean.callback

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL

/**
 * 앱 안에서 업데이트 – GitHub 릴리스의 version.json 을 확인하고
 * 새 APK를 받아서 시스템 설치 화면을 바로 띄운다.
 */
object Updater {
    private const val BASE = "https://github.com/linkcleaning/linkcleaning.github.io/releases/download/callback-apk/"
    const val VERSION_URL = BASE + "version.json"
    const val APK_URL = BASE + "linkclean-callback.apk"
    const val ACTION_INSTALL = "kr.co.linkclean.callback.INSTALL_RESULT"

    data class Info(val code: Int, val name: String, val notes: String)

    @Volatile var lastCheck = 0L
    @Volatile var latest: Info? = null

    private fun open(url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            instanceFollowRedirects = true
            connectTimeout = 10_000; readTimeout = 20_000
            useCaches = false
            setRequestProperty("Cache-Control", "no-cache")
        }

    /** 네트워크에서 최신 버전 정보 가져오기 (백그라운드 스레드에서 호출) */
    fun fetch(): Info? = try {
        val con = open("$VERSION_URL?t=${System.currentTimeMillis()}")
        con.inputStream.use { s ->
            val o = JSONObject(s.readBytes().toString(Charsets.UTF_8))
            Info(o.getInt("versionCode"), o.optString("versionName"), o.optString("notes"))
        }.also { latest = it; lastCheck = System.currentTimeMillis() }
    } catch (e: Exception) { null }

    fun isNewer(i: Info?) = i != null && i.code > BuildConfig.VERSION_CODE

    /** 새 APK 다운로드 (진행률 0~100 콜백) */
    fun download(c: Context, onProgress: (Int) -> Unit): File {
        val dir = File(c.cacheDir, "update").apply { mkdirs() }
        val f = File(dir, "update.apk")
        val con = open(APK_URL)
        val total = con.contentLengthLong
        con.inputStream.use { input ->
            f.outputStream().use { out ->
                val buf = ByteArray(64 * 1024)
                var done = 0L; var last = -1
                while (true) {
                    val n = input.read(buf); if (n < 0) break
                    out.write(buf, 0, n); done += n
                    if (total > 0) { val p = (done * 100 / total).toInt(); if (p != last) { last = p; onProgress(p) } }
                }
            }
        }
        return f
    }

    /** 시스템 설치 화면 열기 – '업데이트하시겠습니까?' 창에서 [업데이트]만 누르면 됨 */
    fun install(c: Context, apk: File) {
        val uri = androidx.core.content.FileProvider.getUriForFile(c, "${c.packageName}.files", apk)
        val i = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
            putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true)
        }
        c.startActivity(i)
    }
}
