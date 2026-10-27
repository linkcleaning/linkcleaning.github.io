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
 * 새 APK를 받아서 시스템 설치기(PackageInstaller)로 바로 설치한다.
 * (한 번 이 앱으로 업데이트하면, 안드로이드 12+ 에서는 다음부터 확인 창 없이 설치될 수 있음)
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

    /** 시스템 설치기로 설치 – 결과는 InstallReceiver 로 옴 */
    fun install(c: Context, apk: File) {
        val pi = c.packageManager.packageInstaller
        val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL).apply {
            setAppPackageName(c.packageName)
            if (Build.VERSION.SDK_INT >= 31) setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
        }
        val id = pi.createSession(params)
        pi.openSession(id).use { s ->
            apk.inputStream().use { input ->
                s.openWrite("base.apk", 0, apk.length()).use { out -> input.copyTo(out); s.fsync(out) }
            }
            val intent = Intent(c, InstallReceiver::class.java).setAction(ACTION_INSTALL)
            val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
            s.commit(PendingIntent.getBroadcast(c, 77, intent, flags).intentSender)
        }
    }
}
