package kr.co.linkclean.callback

import android.Manifest
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.content.res.ColorStateList
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.View
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.android.material.button.MaterialButton
import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.max

class MainActivity : AppCompatActivity() {

    private lateinit var btnToggle: MaterialButton
    private lateinit var todayCount: TextView
    private lateinit var historyList: LinearLayout
    private lateinit var warnBox: View
    private lateinit var warnText: TextView
    private lateinit var imgPreview: ImageView
    private lateinit var imgInfo: TextView
    private lateinit var batteryInfo: TextView

    private val prefListener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
        if (key == Prefs.KEY_HISTORY || key == Prefs.KEY_ENABLED) runOnUiThread { refreshStatus() }
    }

    private val requiredPerms: Array<String>
        get() = buildList {
            add(Manifest.permission.READ_PHONE_STATE)
            add(Manifest.permission.READ_CALL_LOG)
            add(Manifest.permission.SEND_SMS)
            if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
        }.toTypedArray()

    private val permLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        refreshStatus()
        if (missingCorePerms().isEmpty() && pendingEnable) {
            pendingEnable = false
            enable()
        } else if (missingCorePerms().isNotEmpty()) {
            showRestrictedHelp()
        }
    }

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) saveImage(uri)
    }

    private var pendingEnable = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        btnToggle = findViewById(R.id.btnToggle)
        todayCount = findViewById(R.id.todayCount)
        historyList = findViewById(R.id.historyList)
        warnBox = findViewById(R.id.warnBox)
        warnText = findViewById(R.id.warnText)
        imgPreview = findViewById(R.id.imgPreview)
        imgInfo = findViewById(R.id.imgInfo)
        batteryInfo = findViewById(R.id.batteryInfo)

        val editSubject = findViewById<EditText>(R.id.editSubject)
        val editMessage = findViewById<EditText>(R.id.editMessage)
        val editBlacklist = findViewById<EditText>(R.id.editBlacklist)
        val chkIncoming = findViewById<CheckBox>(R.id.chkIncoming)
        val chkMissed = findViewById<CheckBox>(R.id.chkMissed)
        val chkMobile = findViewById<CheckBox>(R.id.chkMobile)
        val editCooldown = findViewById<EditText>(R.id.editCooldown)
        val editDailyLimit = findViewById<EditText>(R.id.editDailyLimit)

        editSubject.setText(Prefs.subject(this))
        editMessage.setText(Prefs.message(this))
        editBlacklist.setText(Prefs.blacklistRaw(this))
        chkIncoming.isChecked = Prefs.sendIncoming(this)
        chkMissed.isChecked = Prefs.sendMissed(this)
        chkMobile.isChecked = Prefs.mobileOnly(this)
        editCooldown.setText(Prefs.cooldownHours(this).toString())
        editDailyLimit.setText(Prefs.dailyLimit(this).toString())

        btnToggle.setOnClickListener {
            if (Prefs.enabled(this)) disable() else tryEnable()
        }
        findViewById<View>(R.id.btnFix).setOnClickListener { fixProblems() }

        findViewById<View>(R.id.btnSaveMessage).setOnClickListener {
            val msg = editMessage.text.toString().trim()
            if (msg.isEmpty()) { toast("문구를 입력해 주세요"); return@setOnClickListener }
            Prefs.sp(this).edit()
                .putString(Prefs.KEY_MESSAGE, msg)
                .putString(Prefs.KEY_SUBJECT, editSubject.text.toString().trim())
                .apply()
            toast("문구 저장됨")
        }

        findViewById<View>(R.id.btnSaveOptions).setOnClickListener {
            val cd = editCooldown.text.toString().toIntOrNull()?.coerceIn(1, 24 * 30) ?: 24
            val lim = editDailyLimit.text.toString().toIntOrNull()?.coerceIn(1, 1000) ?: 100
            editCooldown.setText(cd.toString()); editDailyLimit.setText(lim.toString())
            Prefs.sp(this).edit()
                .putBoolean(Prefs.KEY_SEND_INCOMING, chkIncoming.isChecked)
                .putBoolean(Prefs.KEY_SEND_MISSED, chkMissed.isChecked)
                .putBoolean(Prefs.KEY_MOBILE_ONLY, chkMobile.isChecked)
                .putInt(Prefs.KEY_COOLDOWN_H, cd)
                .putInt(Prefs.KEY_DAILY_LIMIT, lim)
                .apply()
            toast("발송 조건 저장됨")
        }

        findViewById<View>(R.id.btnSaveBlacklist).setOnClickListener {
            Prefs.sp(this).edit().putString(Prefs.KEY_BLACKLIST, editBlacklist.text.toString()).apply()
            toast("제외 번호 ${Prefs.blacklist(this).size}개 저장됨")
        }

        findViewById<View>(R.id.btnPickImage).setOnClickListener { pickImage.launch("image/*") }
        findViewById<View>(R.id.btnRemoveImage).setOnClickListener {
            Prefs.imageFile(this).delete()
            refreshImage()
        }

        findViewById<View>(R.id.btnTest).setOnClickListener {
            val num = PhoneUtil.normalize(findViewById<EditText>(R.id.editTestNumber).text.toString())
            if (num.length < 9) { toast("받을 번호를 입력해 주세요"); return@setOnClickListener }
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) != PackageManager.PERMISSION_GRANTED) {
                permLauncher.launch(requiredPerms); return@setOnClickListener
            }
            val id = Prefs.newId()
            Prefs.addHistory(this, SendRecord(id, System.currentTimeMillis(), num, "테스트", "발송중"))
            MmsSender.send(this, num, id)
            toast("테스트 발송 요청함 – 아래 기록에서 결과 확인")
        }

        findViewById<View>(R.id.btnClearHistory).setOnClickListener {
            AlertDialog.Builder(this)
                .setMessage("발송 기록을 모두 지울까요?\n(24시간 재발송 금지 기록은 유지됩니다)")
                .setPositiveButton("지우기") { _, _ -> Prefs.clearHistory(this) }
                .setNegativeButton("취소", null)
                .show()
        }

        findViewById<View>(R.id.btnBattery).setOnClickListener { requestBatteryExemption() }
        findViewById<View>(R.id.btnAppSettings).setOnClickListener { openAppSettings() }

        findViewById<TextView>(R.id.versionText).text = "버전 ${BuildConfig.VERSION_NAME}"
        refreshImage()
    }

    override fun onResume() {
        super.onResume()
        Prefs.sp(this).registerOnSharedPreferenceChangeListener(prefListener)
        // 켜져 있는데 서비스가 죽어 있으면 다시 살림
        if (Prefs.enabled(this) && missingCorePerms().isEmpty()) CallMonitorService.start(this)
        refreshStatus()
    }

    override fun onPause() {
        Prefs.sp(this).unregisterOnSharedPreferenceChangeListener(prefListener)
        super.onPause()
    }

    // ---------------- ON / OFF ----------------
    private fun tryEnable() {
        if (missingCorePerms().isNotEmpty() || missingNotificationPerm()) {
            pendingEnable = true
            permLauncher.launch(requiredPerms)
            return
        }
        enable()
    }

    private fun enable() {
        CallbackProcessor.seedExistingCalls(this) // 과거 통화로는 문자 안 나가게
        Prefs.setEnabled(this, true)
        CallMonitorService.start(this)
        refreshStatus()
        if (!isIgnoringBattery()) {
            AlertDialog.Builder(this)
                .setTitle("배터리 최적화 예외")
                .setMessage("폰이 절전 중에도 자동 콜백이 꺼지지 않도록 '배터리 사용량 최적화 중지'를 허용해 주세요.")
                .setPositiveButton("허용하러 가기") { _, _ -> requestBatteryExemption() }
                .setNegativeButton("나중에", null)
                .show()
        } else toast("자동 콜백 시작!")
    }

    private fun disable() {
        Prefs.setEnabled(this, false)
        CallMonitorService.stop(this)
        refreshStatus()
        toast("자동 콜백 꺼짐")
    }

    // ---------------- 상태 표시 ----------------
    private fun refreshStatus() {
        val on = Prefs.enabled(this)
        btnToggle.text = if (on) "자동 콜백  ON" else "자동 콜백  OFF"
        btnToggle.backgroundTintList = ColorStateList.valueOf(
            ContextCompat.getColor(this, if (on) R.color.on_green else R.color.off_grey)
        )
        todayCount.text = "${Prefs.todaySuccess(this)}건"

        val problems = mutableListOf<String>()
        val missing = missingCorePerms()
        if (missing.isNotEmpty()) problems.add("• 전화·통화기록·문자 권한이 필요합니다")
        if (missingNotificationPerm()) problems.add("• 알림 권한이 꺼져 있습니다 (상태 알림이 안 보임)")
        if (!isIgnoringBattery()) problems.add("• 배터리 최적화 예외가 안 되어 있어 절전 시 꺼질 수 있습니다")
        warnBox.visibility = if (problems.isEmpty()) View.GONE else View.VISIBLE
        warnText.text = "확인이 필요해요\n" + problems.joinToString("\n")
        batteryInfo.text = if (isIgnoringBattery()) "✅ 배터리 최적화 예외 등록됨" else "⚠️ 배터리 최적화 예외 미등록"

        renderHistory()
    }

    private fun renderHistory() {
        historyList.removeAllViews()
        val fmt = SimpleDateFormat("MM/dd HH:mm", Locale.KOREA)
        val list = Prefs.history(this).take(30)
        if (list.isEmpty()) {
            historyList.addView(TextView(this).apply {
                text = "아직 기록이 없습니다"
                setTextColor(ContextCompat.getColor(context, R.color.text_sub))
                setPadding(0, 8, 0, 8)
            })
            return
        }
        for (r in list) {
            val row = TextView(this).apply {
                val color = when {
                    r.isSuccess -> "#12A150"
                    r.status.startsWith("제외") -> "#9AA3AE"
                    r.status.startsWith("실패") -> "#D93025"
                    else -> "#0B6BCB"
                }
                text = android.text.Html.fromHtml(
                    "<b>${fmt.format(Date(r.time))}</b> &nbsp;${PhoneUtil.pretty(r.number)} " +
                        "<small>(${r.kind})</small><br/><font color='$color'>${r.status}</font>",
                    android.text.Html.FROM_HTML_MODE_LEGACY
                )
                textSize = 14f
                setTextColor(ContextCompat.getColor(context, R.color.text_main))
                setPadding(0, 10, 0, 10)
            }
            historyList.addView(row)
        }
    }

    // ---------------- 사진 ----------------
    private fun saveImage(uri: Uri) {
        Thread {
            try {
                val bmp = decodeScaled(uri, 1280)
                // 통신사 MMS 용량 제한 대비 300KB 이하로 압축
                var q = 88
                var bytes: ByteArray
                do {
                    val bos = ByteArrayOutputStream()
                    bmp.compress(Bitmap.CompressFormat.JPEG, q, bos)
                    bytes = bos.toByteArray()
                    q -= 8
                } while (bytes.size > 300 * 1024 && q > 20)
                Prefs.imageFile(this).writeBytes(bytes)
                Prefs.sp(this).edit().putLong(Prefs.KEY_IMAGE_VER, System.currentTimeMillis()).apply()
                runOnUiThread { refreshImage(); toast("사진 교체됨 (${bytes.size / 1024}KB)") }
            } catch (e: Exception) {
                runOnUiThread { toast("사진을 불러오지 못했습니다: ${e.message}") }
            }
        }.start()
    }

    private fun decodeScaled(uri: Uri, maxSide: Int): Bitmap {
        if (Build.VERSION.SDK_INT >= 28) {
            val src = ImageDecoder.createSource(contentResolver, uri)
            return ImageDecoder.decodeBitmap(src) { decoder, info, _ ->
                val w = info.size.width; val h = info.size.height
                val scale = maxSide.toFloat() / max(w, h)
                if (scale < 1f) decoder.setTargetSize((w * scale).toInt(), (h * scale).toInt())
                decoder.allocator = ImageDecoder.ALLOCATOR_SOFTWARE
            }
        }
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        contentResolver.openInputStream(uri)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        var sample = 1
        while (max(bounds.outWidth, bounds.outHeight) / sample > maxSide * 2) sample *= 2
        val opts = BitmapFactory.Options().apply { inSampleSize = sample }
        val raw = contentResolver.openInputStream(uri)!!.use { BitmapFactory.decodeStream(it, null, opts) }
            ?: throw IllegalStateException("이미지 형식 오류")
        val scale = maxSide.toFloat() / max(raw.width, raw.height)
        return if (scale < 1f) Bitmap.createScaledBitmap(raw, (raw.width * scale).toInt(), (raw.height * scale).toInt(), true) else raw
    }

    private fun refreshImage() {
        val f = Prefs.imageFile(this)
        if (f.exists() && f.length() > 0) {
            imgPreview.setImageBitmap(BitmapFactory.decodeFile(f.absolutePath))
            imgInfo.text = "사진 + 문구를 사진문자(MMS)로 보냅니다 · ${f.length() / 1024}KB"
        } else {
            imgPreview.setImageDrawable(null)
            imgInfo.text = "사진 없음 – 글자만 보냅니다 (사진 교체를 눌러 등록)"
        }
    }

    // ---------------- 권한 / 배터리 ----------------
    private fun missingCorePerms(): List<String> = listOf(
        Manifest.permission.READ_PHONE_STATE,
        Manifest.permission.READ_CALL_LOG,
        Manifest.permission.SEND_SMS
    ).filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }

    private fun missingNotificationPerm(): Boolean =
        Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED

    private fun isIgnoringBattery(): Boolean =
        getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(packageName)

    private fun fixProblems() {
        when {
            missingCorePerms().isNotEmpty() || missingNotificationPerm() -> permLauncher.launch(requiredPerms)
            !isIgnoringBattery() -> requestBatteryExemption()
        }
    }

    @android.annotation.SuppressLint("BatteryLife")
    private fun requestBatteryExemption() {
        try {
            startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
        } catch (e: Exception) {
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
    }

    private fun openAppSettings() {
        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
    }

    /** Android 13+ 에서 APK 직접 설치 시 문자·통화기록 권한이 '제한된 설정'으로 막히는 경우 안내 */
    private fun showRestrictedHelp() {
        AlertDialog.Builder(this)
            .setTitle("권한이 허용되지 않았어요")
            .setMessage(
                "권한 창이 안 뜨거나 회색으로 막혀 있으면:\n\n" +
                    "1) 아래 '앱 정보 열기'를 누르세요\n" +
                    "2) 오른쪽 위 ⋮ 메뉴 → '제한된 설정 허용'\n" +
                    "3) 권한 → 전화, 통화 기록, SMS 모두 '허용'\n\n" +
                    "그 다음 이 앱으로 돌아와 ON을 다시 눌러 주세요."
            )
            .setPositiveButton("앱 정보 열기") { _, _ -> openAppSettings() }
            .setNegativeButton("닫기", null)
            .show()
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_SHORT).show()
}
