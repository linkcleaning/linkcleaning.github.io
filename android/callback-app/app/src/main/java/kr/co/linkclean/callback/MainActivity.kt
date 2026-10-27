package kr.co.linkclean.callback

import android.Manifest
import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.ClipboardManager
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.ImageDecoder
import android.graphics.drawable.ColorDrawable
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.provider.CallLog
import android.provider.Settings
import android.text.InputType
import android.text.TextUtils
import android.util.Base64
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.google.android.material.bottomsheet.BottomSheetBehavior
import com.google.android.material.bottomsheet.BottomSheetDialog
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlin.math.max

/**
 * 링크클린 콜백문자 – 웹앱(linkcleaning.github.io/callback)과 같은 화면 구성
 *  [보내기] [문자설정] [발송내역] [설정]  4개 탭
 *  + 안드로이드 전용: 통화 종료 시 자동 발송, 앱에서 바로 발송
 */
class MainActivity : AppCompatActivity() {

    private lateinit var ui: Ui
    private lateinit var titleView: TextView
    private lateinit var sendBar: View
    private lateinit var navBar: View
    private var keyboardOpen = false
    private lateinit var toastView: TextView
    private val pages = arrayOfNulls<ScrollView>(4)
    private val bodies = arrayOfNulls<LinearLayout>(4)
    private val navIcons = ArrayList<TextView>()
    private val navLabels = ArrayList<TextView>()
    private var tab = 0
    private val handler = Handler(Looper.getMainLooper())
    private val hideToast = Runnable {
        toastView.animate().translationY(-ui.dp(140).toFloat()).alpha(0f).setDuration(250).start()
    }

    // 보내기 탭
    private lateinit var autoBtn: TextView
    private lateinit var autoInfo: TextView
    private lateinit var todayText: TextView
    private lateinit var warnBox: LinearLayout
    private lateinit var warnText: TextView
    private lateinit var phoneEdit: EditText
    private lateinit var phoneWarn: TextView
    private lateinit var chipsBox: LinearLayout
    private lateinit var fieldsCard: LinearLayout
    private lateinit var fieldsBox: LinearLayout
    private lateinit var draftEdit: EditText
    private lateinit var restoreBtn: TextView
    private lateinit var sendImgs: LinearLayout
    private lateinit var charInfo: TextView
    private lateinit var recentBox: LinearLayout
    private var jangeumView: TextView? = null

    private var draftDirty = false
    private var settingDraft = false
    private var formattingPhone = false
    private val fields = mutableMapOf<String, String>()
    private var histFilter = "전체"
    private val thumbs = HashMap<String, Bitmap>()
    private var pendingEnable = false
    private var pendingUpdate = false
    private lateinit var updateCard: LinearLayout
    private lateinit var updateText: TextView

    private val prefListener = SharedPreferences.OnSharedPreferenceChangeListener { _, key ->
        if (key == Prefs.KEY_HISTORY || key == Prefs.KEY_ENABLED) runOnUiThread {
            renderAuto(); renderRecent(); if (tab == 2) renderHistory()
        }
    }

    private val requiredPerms: Array<String>
        get() = buildList {
            add(Manifest.permission.READ_PHONE_STATE)
            add(Manifest.permission.READ_CALL_LOG)
            add(Manifest.permission.SEND_SMS)
            if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
        }.toTypedArray()

    private val permLauncher = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        renderAuto()
        if (missingCorePerms().isEmpty() && pendingEnable) { pendingEnable = false; enable() }
        else if (missingCorePerms().isNotEmpty()) showRestrictedHelp()
    }

    private val pickImage = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) saveImage(uri)
    }

    private val backupLauncher = registerForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) writeBackup(uri)
    }

    private val restoreLauncher = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) readBackup(uri)
    }

    // =====================================================================
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Prefs.seedDefaults(this)
        ui = Ui(this)
        loadFields()
        buildShell()
        buildSendTab()
        selectTab(0)
        setDraftFromTpl()
    }

    override fun onResume() {
        super.onResume()
        Prefs.sp(this).registerOnSharedPreferenceChangeListener(prefListener)
        if (Prefs.enabled(this) && missingCorePerms().isEmpty()) CallMonitorService.start(this)
        renderAuto(); renderRecent()
        if (tab == 3) renderSettings()
        if (pendingUpdate && canInstall()) { pendingUpdate = false; startUpdate() }
        else if (System.currentTimeMillis() - Updater.lastCheck > 30 * 60_000L) checkUpdate(silent = true)
        else showUpdateBanner()
    }

    // =====================================================================
    // 🆕 앱 안에서 업데이트
    // =====================================================================
    private fun canInstall() = packageManager.canRequestPackageInstalls()

    private fun showUpdateBanner() {
        if (!::updateCard.isInitialized) return
        val i = Updater.latest
        if (Updater.isNewer(i)) {
            updateText.text = "🆕 새 버전 ${i!!.name}이(가) 나왔어요" + if (i.notes.isNotBlank()) "\n· ${i.notes}" else ""
            updateCard.visibility = View.VISIBLE
        } else updateCard.visibility = View.GONE
    }

    private fun checkUpdate(silent: Boolean) {
        if (!silent) toast("🔎 새 버전 확인 중…")
        Thread {
            val i = Updater.fetch()
            runOnUiThread {
                showUpdateBanner()
                if (tab == 3) renderSettings()
                if (!silent) when {
                    i == null -> toast("인터넷 연결을 확인해 주세요", "err")
                    Updater.isNewer(i) -> startUpdate()
                    else -> toast("✅ 최신 버전이에요 (${BuildConfig.VERSION_NAME})", "ok")
                }
            }
        }.start()
    }

    private fun startUpdate() {
        if (!canInstall()) {
            AlertDialog.Builder(this)
                .setTitle("처음 한 번만 허용해 주세요")
                .setMessage("다음 화면에서 '이 출처 허용'을 켜고 뒤로가기를 누르세요.\n\n한 번만 켜 두면 앞으로는 앱 안에서 버튼만 눌러 업데이트할 수 있어요.")
                .setPositiveButton("허용하러 가기") { _, _ ->
                    pendingUpdate = true
                    startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:$packageName")))
                }
                .setNegativeButton("나중에", null).show()
            return
        }
        val msg = ui.text("새 버전을 받는 중… 0%", 16f, Col.S700, true).apply { setPadding(ui.dp(24), ui.dp(20), ui.dp(24), ui.dp(8)) }
        val dlg = AlertDialog.Builder(this).setTitle("⬇️ 업데이트").setView(msg).setCancelable(false).show()
        Thread {
            try {
                val apk = Updater.download(this) { p -> runOnUiThread { msg.text = "새 버전을 받는 중… $p%" } }
                runOnUiThread {
                    try { dlg.dismiss() } catch (_: Exception) { }
                    try { Updater.install(this, apk) } catch (e: Exception) { toast("설치 화면을 열지 못했어요", "err") }
                    toast("'업데이트' 창에서 [업데이트]를 눌러 주세요")
                }
            } catch (e: Exception) {
                runOnUiThread {
                    try { dlg.dismiss() } catch (_: Exception) { }
                    toast("업데이트 실패: 인터넷 연결을 확인해 주세요", "err")
                }
            }
        }.start()
    }

    override fun onPause() {
        Prefs.sp(this).unregisterOnSharedPreferenceChangeListener(prefListener)
        super.onPause()
    }

    // =====================================================================
    // 기본 틀: 헤더 + 탭 페이지 + 하단 버튼 + 탭바
    // =====================================================================
    private fun buildShell() {
        val root = FrameLayout(this)
        val main = ui.col().apply { setBackgroundColor(Col.S100) }

        val header = ui.row().apply {
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(Col.B700, Col.B500))
            setPadding(ui.dp(20), ui.dp(14), ui.dp(20), ui.dp(16))
        }
        val logo = ImageView(this).apply {
            setImageResource(R.drawable.logo_sm)
            background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Col.WHITE); setStroke(ui.dp(2), 0x99FFFFFF.toInt()) }
            clipToOutline = true
            scaleType = ImageView.ScaleType.CENTER_CROP
            setPadding(ui.dp(2), ui.dp(2), ui.dp(2), ui.dp(2))
        }
        header.addView(logo, LinearLayout.LayoutParams(ui.dp(56), ui.dp(56)))
        val tc = ui.col()
        tc.addView(ui.text("링크클린", 13f, Col.B100, true))
        titleView = ui.text("", 22f, Col.WHITE, true)
        tc.addView(titleView)
        header.addView(tc, ui.lp(0, ui.WRAP, 1f, start = 12))
        main.addView(header, ui.lp())

        val frame = FrameLayout(this)
        for (i in 0..3) {
            val sv = ScrollView(this).apply { isFillViewport = true; visibility = View.GONE }
            val body = ui.col().apply {
                setPadding(ui.dp(16), ui.dp(16), ui.dp(16), ui.dp(24))
                isClickable = true; isFocusableInTouchMode = true
                setOnClickListener { hideKeyboard() } // 빈 곳을 누르면 키보드 내림
            }
            sv.addView(body)
            frame.addView(sv, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))
            pages[i] = sv; bodies[i] = body
        }
        main.addView(frame, ui.lp(h = 0, weight = 1f))

        // 보내기 하단 버튼 (웹앱과 같은 2개 버튼)
        val bar = ui.col().apply { setBackgroundColor(Col.WHITE) }
        bar.addView(View(this).apply { setBackgroundColor(Col.S200) }, ui.lp(h = ui.dp(1)))
        val br = ui.row().apply { setPadding(ui.dp(12), ui.dp(10), ui.dp(12), ui.dp(10)) }
        br.addView(ui.button("💬 문자만 보내기", Col.B600, Col.WHITE, 60, 17f) { sendManual(false) }, ui.lp(0, ui.WRAP, 1f, end = 8))
        br.addView(ui.gradientButton("🖼️ 사진+문자 보내기", Col.SKY, Col.CYAN, 60, 17f) { sendManual(true) }, ui.lp(0, ui.WRAP, 1.15f))
        bar.addView(br)
        sendBar = bar
        main.addView(bar, ui.lp())

        // 하단 탭바
        val navWrap = ui.col()
        navWrap.addView(View(this).apply { setBackgroundColor(Col.S200) }, ui.lp(h = ui.dp(1)))
        val nav = ui.row().apply { setBackgroundColor(Col.WHITE) }
        listOf("📞" to "보내기", "✉️" to "문자설정", "📋" to "발송내역", "⚙️" to "설정").forEachIndexed { i, (ic, lb) ->
            val item = ui.col().apply {
                gravity = Gravity.CENTER
                isClickable = true
                background = ui.ripple(ColorDrawable(Col.WHITE))
                setOnClickListener { selectTab(i) }
            }
            val icv = ui.text(ic, 22f).apply { gravity = Gravity.CENTER }
            val lbv = ui.text(lb, 12f, Col.S400, true).apply { gravity = Gravity.CENTER }
            item.addView(icv); item.addView(lbv)
            nav.addView(item, ui.lp(0, ui.dp(64), 1f))
            navIcons.add(icv); navLabels.add(lbv)
        }
        navWrap.addView(nav, ui.lp())
        navBar = navWrap
        main.addView(navWrap, ui.lp())
        root.addView(main, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))

        // 상단 토스트 (웹앱과 같은 알림)
        toastView = ui.text("", 16f, Col.WHITE, true).apply {
            setPadding(ui.dp(20), ui.dp(16), ui.dp(20), ui.dp(16))
            background = ui.rect(Col.B900, 16f)
            elevation = ui.dp(12).toFloat()
            translationY = -ui.dp(140).toFloat(); alpha = 0f
        }
        root.addView(toastView, FrameLayout.LayoutParams(ui.MATCH, ui.WRAP, Gravity.TOP).apply {
            setMargins(ui.dp(14), ui.dp(12), ui.dp(14), 0)
        })
        setContentView(root)

        // 키보드가 올라오면 아래 버튼·탭바를 숨겨서 입력칸을 넓게
        root.viewTreeObserver.addOnGlobalLayoutListener {
            val r = android.graphics.Rect()
            root.getWindowVisibleDisplayFrame(r)
            val open = root.rootView.height - r.bottom > ui.dp(180)
            if (open != keyboardOpen) {
                keyboardOpen = open
                navBar.visibility = if (open) View.GONE else View.VISIBLE
                sendBar.visibility = if (!open && tab == 0) View.VISIBLE else View.GONE
            }
        }
    }

    private fun selectTab(i: Int) {
        if (::toastView.isInitialized) hideKeyboard()
        tab = i
        pages.forEachIndexed { idx, p -> p?.visibility = if (idx == i) View.VISIBLE else View.GONE }
        navIcons.forEachIndexed { idx, v -> v.alpha = if (idx == i) 1f else 0.45f }
        navLabels.forEachIndexed { idx, v -> v.setTextColor(if (idx == i) Col.B700 else Col.S400) }
        sendBar.visibility = if (i == 0 && !keyboardOpen) View.VISIBLE else View.GONE
        titleView.text = when (i) {
            0 -> android.text.SpannableString("📞 콜백 문자 보내기 (안드로이드)").apply {
                val st = indexOf("(안드로이드)")
                setSpan(android.text.style.RelativeSizeSpan(0.55f), st, length, 0)
                setSpan(android.text.style.ForegroundColorSpan(Col.B100), st, length, 0)
            }
            1 -> "✉️ 문자 설정"
            2 -> "📋 발송 내역"
            else -> "⚙️ 설정"
        }
        when (i) {
            0 -> { renderAuto(); renderChips(); renderFields(); renderSendImgs(); renderRecent(); if (!draftDirty) setDraftFromTpl() }
            1 -> renderMsgs()
            2 -> renderHistory()
            3 -> renderSettings()
        }
        pages[i]?.scrollTo(0, 0)
    }

    private fun toast(msg: String, type: String = "") {
        toastView.text = msg
        toastView.background = ui.rect(
            when (type) { "err" -> Col.RED700; "ok" -> Col.GREEN700; else -> Col.B900 }, 16f
        )
        handler.removeCallbacks(hideToast)
        toastView.animate().cancel()
        toastView.animate().translationY(0f).alpha(1f).setDuration(280).start()
        handler.postDelayed(hideToast, 2600)
    }

    private fun h2(s: String, size: Float = 15f, color: Int = Col.S600) = ui.text(s, size, color, true)
    private fun hint(s: String) = ui.text(s, 13f, Col.S500)

    private fun headerRow(title: String, link: String?, onLink: (() -> Unit)?): LinearLayout {
        val r = ui.row()
        r.addView(h2(title), ui.lp(0, ui.WRAP, 1f))
        if (link != null) r.addView(ui.text(link, 13f, Col.B600, true).apply {
            setPadding(ui.dp(8), ui.dp(4), 0, ui.dp(4)); setOnClickListener { onLink?.invoke() }
        })
        return r
    }

    // =====================================================================
    // ① 보내기 탭
    // =====================================================================
    private fun buildSendTab() {
        val b = bodies[0]!!

        // 🆕 새 버전 알림
        updateCard = ui.card(Col.GREEN, 2f, Col.GREEN50).apply { visibility = View.GONE }
        updateText = ui.text("", 15f, Col.GREEN700, true)
        updateCard.addView(updateText)
        updateCard.addView(ui.button("⬇️ 지금 업데이트 (1분)", Col.GREEN, Col.WHITE, 52, 17f) { startUpdate() }, ui.lp(top = 10))
        b.addView(updateCard)

        // 권한 경고
        warnBox = ui.card(Col.AMBER300, 2f, Col.AMBER50).apply { visibility = View.GONE }
        warnText = ui.text("", 14f, Col.AMBER800, true)
        warnBox.addView(warnText)
        warnBox.addView(ui.button("지금 설정하기", Col.AMBER800, Col.WHITE, 48, 16f) { fixProblems() }, ui.lp(top = 10))
        b.addView(warnBox)

        // 자동 콜백 카드 (안드로이드 전용)
        val ac = ui.card(Col.B200, 2f)
        ac.addView(headerRow("🤖 통화 끝나면 자동 발송", "설정 ›") { selectTab(3) }, ui.lp(bottom = 10))
        autoBtn = ui.button("", Col.S400, Col.WHITE, 76, 23f, radius = 20f) {
            if (Prefs.enabled(this)) disable() else tryEnable()
        }
        ac.addView(autoBtn, ui.lp())
        autoInfo = ui.text("", 14f, Col.S600).apply { setPadding(ui.dp(2), ui.dp(10), 0, 0) }
        ac.addView(autoInfo)
        val tr = ui.row().apply { setPadding(ui.dp(2), ui.dp(8), 0, 0) }
        tr.addView(ui.text("오늘 보낸 문자", 14f, Col.S500, true), ui.lp(0, ui.WRAP, 1f))
        todayText = ui.text("0건", 26f, Col.B700, true)
        tr.addView(todayText)
        ac.addView(tr)
        b.addView(ac)

        // ① 고객 전화번호
        val pc = ui.card()
        pc.addView(h2("① 고객 전화번호"), ui.lp(bottom = 8))
        phoneEdit = ui.input("010-0000-0000", big = true, type = InputType.TYPE_CLASS_PHONE).apply {
            letterSpacing = 0.04f
            imeOptions = android.view.inputmethod.EditorInfo.IME_ACTION_DONE
            setOnEditorActionListener { _, _, _ -> hideKeyboard(); true }
        }
        pc.addView(phoneEdit, ui.lp())
        phoneWarn = ui.text("", 14f, Col.RED, true).apply {
            visibility = View.GONE; setPadding(ui.dp(12), ui.dp(8), ui.dp(12), ui.dp(8))
        }
        pc.addView(phoneWarn, ui.lp(top = 8))
        val pr = ui.row()
        pr.addView(ui.button("📞 방금 통화", Col.B50, Col.B700, 54, 16f, Col.B200) { fillLastCall() }, ui.lp(0, ui.WRAP, 1f, end = 6))
        pr.addView(ui.button("📋 붙여넣기", Col.B50, Col.B700, 54, 16f, Col.B200) { pastePhone() }, ui.lp(0, ui.WRAP, 1f, end = 6))
        pr.addView(ui.button("✕ 초기화", Col.S100, Col.S600, 54, 16f, Col.S200) { phoneEdit.setText("") }, ui.lp(0, ui.WRAP, 0.85f))
        pc.addView(pr, ui.lp(top = 10))
        b.addView(pc)
        phoneEdit.addTextChangedListener(watcher { formatPhone(); checkPhone() })

        // ② 어떤 문자를 보낼까요?
        val cc = ui.card()
        cc.addView(headerRow("② 어떤 문자를 보낼까요?", "문자 편집 ›") { selectTab(1) }, ui.lp(bottom = 10))
        chipsBox = ui.col()
        cc.addView(chipsBox)
        b.addView(cc)

        // 📝 예약 정보 입력
        fieldsCard = ui.card(Col.AMBER300, 2f).apply { visibility = View.GONE }
        fieldsCard.addView(ui.text("📝 예약 정보 입력", 15f, Col.S700, true))
        fieldsCard.addView(hint("입력하면 아래 문자에 바로 들어가요."), ui.lp(top = 2, bottom = 10))
        fieldsBox = ui.col()
        fieldsCard.addView(fieldsBox)
        b.addView(fieldsCard)

        // 💬 보낼 문자
        val dc = ui.card()
        val dh = ui.row()
        dh.addView(h2("💬 보낼 문자 "))
        dh.addView(ui.text("(이번만 수정 가능)", 12f, Col.S400), ui.lp(0, ui.WRAP, 1f))
        restoreBtn = ui.button("↩ 원래대로", Col.S100, Col.S500, 34, 12f, radius = 10f) { setDraftFromTpl() }.apply { visibility = View.GONE }
        dh.addView(restoreBtn, ui.lp(ui.WRAP, ui.WRAP))
        dc.addView(dh, ui.lp(bottom = 8))
        sendImgs = ui.row()
        dc.addView(HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(sendImgs) }, ui.lp(bottom = 8))
        draftEdit = ui.input("", multi = true).apply {
            minLines = 9
            // 좁은 칸에서 고치지 않도록: 누르면 전체 화면 수정 창
            isFocusable = false; isFocusableInTouchMode = false; isLongClickable = false
            setOnClickListener {
                openBigEditor("보낼 문자 고치기 (이번만)", text.toString()) { t -> setText(t) }
            }
        }
        dc.addView(draftEdit, ui.lp())
        dc.addView(ui.text("✏️ 글씨 칸을 누르면 크게 열려서 고칠 수 있어요", 12f, Col.S400), ui.lp(top = 4))
        charInfo = ui.text("", 13f, Col.S400, true).apply { gravity = Gravity.END; setPadding(0, ui.dp(4), 0, 0) }
        dc.addView(charInfo, ui.lp())
        draftEdit.addTextChangedListener(watcher {
            if (!settingDraft) { draftDirty = true; restoreBtn.visibility = View.VISIBLE }
            renderCount()
        })
        b.addView(dc)

        // 🕘 최근 보낸 번호
        val rc = ui.card()
        rc.addView(headerRow("🕘 최근 보낸 번호", "전체 내역 ›") { selectTab(2) }, ui.lp(bottom = 4))
        recentBox = ui.col()
        rc.addView(recentBox)
        b.addView(rc)
    }

    private fun selectedTpl(): Tpl {
        val list = Templates.load(this)
        return list.firstOrNull { it.id == Prefs.selectedId(this) } ?: list.first()
    }

    private fun renderAuto() {
        if (!::autoBtn.isInitialized) return
        val on = Prefs.enabled(this)
        autoBtn.text = if (on) "자동 콜백  ON" else "자동 콜백  OFF"
        autoBtn.background = ui.ripple(ui.rect(if (on) Col.GREEN else Col.S400, 20f))
        autoInfo.text = if (on) {
            val tin = Templates.find(this, Prefs.autoInId(this))
            val tmiss = Templates.find(this, Prefs.autoMissId(this))
            "통화가 끝나면 자동으로 보내고 있어요\n" +
                "· 받은 전화 → " + (if (Prefs.sendIncoming(this)) "[${tin?.name ?: "-"}]" else "보내지 않음") + "\n" +
                "· 부재중 전화 → " + (if (Prefs.sendMissed(this)) "[${tmiss?.name ?: "-"}]" else "보내지 않음") + "\n" +
                "· 내가 건 전화 → " + (if (Prefs.sendOutgoing(this)) "[${Templates.find(this, Prefs.autoOutId(this))?.name ?: "-"}]" else "보내지 않음") + "\n" +
                "· 같은 번호는 ${CallbackProcessor.periodLabel(Prefs.cooldownHours(this))} 안에 다시 안 보내요"
        } else "켜 두면 전화(수신·부재중·발신)가 끝날 때마다\n아래 버튼을 누르지 않아도 문자가 자동으로 나가요"
        todayText.text = "${Prefs.todaySuccess(this)}건"

        val problems = mutableListOf<String>()
        if (missingCorePerms().isNotEmpty()) problems.add("• 전화·통화기록·문자 권한이 필요해요")
        if (missingNotificationPerm()) problems.add("• 알림 권한이 꺼져 있어요")
        if (on && !isIgnoringBattery()) problems.add("• 배터리 최적화 예외가 안 되어 있어 절전 시 꺼질 수 있어요")
        warnBox.visibility = if (problems.isEmpty()) View.GONE else View.VISIBLE
        warnText.text = "⚠️ 확인이 필요해요\n" + problems.joinToString("\n")
    }

    private fun renderChips() {
        chipsBox.removeAllViews()
        val list = Templates.load(this)
        val sel = selectedTpl()
        val imgCount = Prefs.imageFiles(this).size
        list.chunked(2).forEach { pair ->
            val r = ui.row()
            pair.forEachIndexed { i, t ->
                val on = t.id == sel.id
                val chip = ui.row().apply {
                    background = ui.ripple(if (on) ui.rect(Col.B700, 16f) else ui.rect(Col.WHITE, 16f, Col.S200, 2f))
                    setPadding(ui.dp(12), ui.dp(8), ui.dp(10), ui.dp(8))
                    minimumHeight = ui.dp(64)
                    isClickable = true
                    setOnClickListener {
                        Prefs.sp(this@MainActivity).edit().putString(Prefs.KEY_SELECTED, t.id).apply()
                        renderChips(); renderFields(); renderSendImgs(); setDraftFromTpl()
                    }
                }
                chip.addView(ui.text(t.icon.ifBlank { "💬" }, 24f), ui.lp(ui.WRAP, ui.WRAP, end = 8))
                val tc = ui.col()
                tc.addView(ui.text(t.name, 15f, if (on) Col.WHITE else Col.S700, true).apply {
                    maxLines = 1; ellipsize = TextUtils.TruncateAt.END
                })
                val sub = t.type + (if (t.useImages && imgCount > 0) " · 📷$imgCount" else "")
                tc.addView(ui.text(sub, 12f, if (on) Col.B100 else Col.S400))
                chip.addView(tc, ui.lp(0, ui.WRAP, 1f))
                r.addView(chip, ui.lp(0, ui.WRAP, 1f, end = if (i == 0) 8 else 0))
            }
            if (pair.size == 1) r.addView(View(this), ui.lp(0, 1, 1f))
            chipsBox.addView(r, ui.lp(bottom = 8))
        }
    }

    private fun renderFields() {
        val toks = Templates.tokens(selectedTpl().body)
        val need = Templates.FIELDS.filter {
            it.key in toks || ("잔금" in toks && (it.key == "청소비용" || it.key == "계약금"))
        }
        fieldsBox.removeAllViews(); jangeumView = null
        fieldsCard.visibility = if (need.isEmpty()) View.GONE else View.VISIBLE
        if (need.isEmpty()) return
        need.forEach { f -> if (fields[f.key] == null && f.def.isNotEmpty()) fields[f.key] = f.def }
        saveFields()
        need.chunked(2).forEach { pair ->
            val r = ui.row().apply { gravity = Gravity.TOP }
            pair.forEachIndexed { i, f ->
                val c = ui.col()
                c.addView(ui.text(f.label, 13f, Col.S500, true), ui.lp(bottom = 4))
                val ctrl: View = when (f.type) {
                    "money" -> ui.input("0", type = InputType.TYPE_CLASS_NUMBER).apply {
                        gravity = Gravity.END or Gravity.CENTER_VERTICAL
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                        val v = fields[f.key].orEmpty().filter { it.isDigit() }
                        setText(if (v.isEmpty()) "" else String.format("%,d", v.toLong()))
                        var busy = false
                        addTextChangedListener(watcher { s ->
                            if (busy) return@watcher
                            val d = s.filter { it.isDigit() }.take(12)
                            val shown = if (d.isEmpty()) "" else String.format("%,d", d.toLong())
                            if (shown != s) { busy = true; setText(shown); setSelection(shown.length); busy = false }
                            fields[f.key] = d; saveFields()
                            jangeumView?.text = Compose.fieldText("잔금", fields).ifEmpty { "-" }
                            if (!draftDirty) setDraftFromTpl()
                        })
                    }
                    else -> ui.button(
                        Compose.fieldText(f.key, fields).ifEmpty { if (f.type == "date") "날짜 선택" else "시간 선택" },
                        Col.S50, Col.S800, 48, 15f, Col.S200
                    ) { pickField(f) }
                }
                c.addView(ctrl, ui.lp())
                r.addView(c, ui.lp(0, ui.WRAP, 1f, end = if (i == 0) 8 else 0))
            }
            if (pair.size == 1) r.addView(View(this), ui.lp(0, 1, 1f))
            fieldsBox.addView(r, ui.lp(bottom = 8))
        }
        if ("잔금" in toks) {
            val jr = ui.row().apply { background = ui.rect(Col.AMBER50, 12f); setPadding(ui.dp(12), ui.dp(8), ui.dp(12), ui.dp(8)) }
            jr.addView(ui.text("💵 잔금 자동 계산: ", 14f, Col.AMBER800, true))
            val jv = ui.text(Compose.fieldText("잔금", fields).ifEmpty { "-" }, 14f, Col.AMBER800, true)
            jr.addView(jv); jangeumView = jv
            fieldsBox.addView(jr, ui.lp())
        }
    }

    private fun pickField(f: FieldDef) {
        if (f.type == "date") {
            val cal = Calendar.getInstance()
            fields[f.key]?.split("-")?.mapNotNull { it.toIntOrNull() }?.takeIf { it.size == 3 }?.let { cal.set(it[0], it[1] - 1, it[2]) }
            DatePickerDialog(this, { _, y, m, d ->
                fields[f.key] = String.format("%04d-%02d-%02d", y, m + 1, d)
                saveFields(); renderFields(); if (!draftDirty) setDraftFromTpl()
            }, cal.get(Calendar.YEAR), cal.get(Calendar.MONTH), cal.get(Calendar.DAY_OF_MONTH)).show()
        } else {
            val (h, mi) = (fields[f.key] ?: "08:30").split(":").map { it.toIntOrNull() ?: 0 }.let { (it.getOrElse(0) { 8 }) to (it.getOrElse(1) { 30 }) }
            TimePickerDialog(this, { _, hh, mm ->
                fields[f.key] = String.format("%02d:%02d", hh, mm)
                saveFields(); renderFields(); if (!draftDirty) setDraftFromTpl()
            }, h, mi, false).show()
        }
    }

    private fun loadFields() {
        try {
            val o = JSONObject(Prefs.sp(this).getString(Prefs.KEY_FIELDS, "{}") ?: "{}")
            o.keys().forEach { k -> fields[k] = o.optString(k) }
        } catch (_: Exception) { }
    }

    private fun saveFields() {
        Prefs.sp(this).edit().putString(Prefs.KEY_FIELDS, JSONObject(fields as Map<*, *>).toString()).apply()
    }

    private fun setDraftFromTpl() {
        settingDraft = true
        draftEdit.setText(Compose.build(this, selectedTpl(), fields))
        settingDraft = false
        draftDirty = false
        restoreBtn.visibility = View.GONE
        renderCount()
    }

    private fun renderCount() {
        val m = draftEdit.text.toString().trim()
        val withImg = selectedTpl().useImages && Prefs.imageFiles(this).isNotEmpty()
        charInfo.text = "${m.length}자 · ${Compose.kind(m, withImg)}"
    }

    private fun renderSendImgs() {
        sendImgs.removeAllViews()
        val files = Prefs.imageFiles(this)
        if (selectedTpl().useImages && files.isNotEmpty()) {
            files.forEach { f ->
                val iv = ImageView(this).apply {
                    setImageBitmap(thumb(f)); scaleType = ImageView.ScaleType.CENTER_CROP
                    background = ui.rect(Col.S100, 12f, Col.S200, 1f); clipToOutline = true
                }
                sendImgs.addView(iv, LinearLayout.LayoutParams(ui.dp(80), ui.dp(80)).apply { marginEnd = ui.dp(8) })
            }
        } else {
            val w = resources.displayMetrics.widthPixels - ui.dp(64)
            sendImgs.addView(ui.button("📷 이 문자에 사진이 없어요 · 눌러서 추가", Col.WHITE, Col.S400, 72, 13f, Col.S300, 12f, dashed = true) {
                selectTab(1)
            }, LinearLayout.LayoutParams(w, ui.dp(76)))
        }
    }

    private fun renderRecent() {
        if (!::recentBox.isInitialized) return
        recentBox.removeAllViews()
        val list = Prefs.history(this).filter { it.isAttempt }.take(5)
        if (list.isEmpty()) {
            recentBox.addView(ui.text("아직 보낸 기록이 없어요", 14f, Col.S400).apply { setPadding(0, ui.dp(10), 0, ui.dp(6)) })
            return
        }
        list.forEachIndexed { i, r ->
            if (i > 0) recentBox.addView(View(this).apply { setBackgroundColor(Col.S100) }, ui.lp(h = ui.dp(1)))
            val row = ui.row().apply {
                setPadding(0, ui.dp(10), 0, ui.dp(10)); isClickable = true
                background = ui.ripple(ColorDrawable(Col.WHITE))
                setOnClickListener { phoneEdit.setText(r.number); toast("📞 ${PhoneUtil.pretty(r.number)} 번호를 넣었어요") }
            }
            val c = ui.col()
            c.addView(ui.text(PhoneUtil.pretty(r.number), 17f, Col.S800, true))
            c.addView(ui.text(ago(r.time) + (if (r.tpl.isNotEmpty()) " · ${r.tpl}" else "") + (if (r.auto) " · 자동" else ""), 12f, Col.S400))
            row.addView(c, ui.lp(0, ui.WRAP, 1f))
            val (fg, bg) = Col.kind(r.kind)
            row.addView(ui.badge(r.kind, fg, bg))
            recentBox.addView(row, ui.lp())
        }
    }

    // ---------- 번호 입력 ----------
    private fun fmtPhone(raw: String): String {
        var d = raw.trim()
        if (d.startsWith("+82")) d = "0" + d.substring(3)
        d = d.filter { it.isDigit() }
        if (d.startsWith("82") && d.length >= 11) d = "0" + d.substring(2)
        d = d.take(11)
        if (d.startsWith("02")) return when {
            d.length <= 2 -> d
            d.length <= 5 -> "${d.substring(0, 2)}-${d.substring(2)}"
            d.length <= 9 -> "${d.substring(0, 2)}-${d.substring(2, 5)}-${d.substring(5)}"
            else -> "${d.substring(0, 2)}-${d.substring(2, 6)}-${d.substring(6, minOf(10, d.length))}"
        }
        if (Regex("^1[5-9]\\d{2}").containsMatchIn(d) && d.length <= 8) return if (d.length <= 4) d else "${d.substring(0, 4)}-${d.substring(4)}"
        return when {
            d.length <= 3 -> d
            d.length <= 6 -> "${d.substring(0, 3)}-${d.substring(3)}"
            d.length <= 10 -> "${d.substring(0, 3)}-${d.substring(3, 6)}-${d.substring(6)}"
            else -> "${d.substring(0, 3)}-${d.substring(3, 7)}-${d.substring(7)}"
        }
    }

    private fun formatPhone() {
        if (formattingPhone) return
        val s = phoneEdit.text.toString()
        val f = fmtPhone(s)
        if (f != s) { formattingPhone = true; phoneEdit.setText(f); phoneEdit.setSelection(f.length); formattingPhone = false }
    }

    private fun checkPhone() {
        val num = PhoneUtil.normalize(phoneEdit.text.toString())
        if (num.length < 9) { phoneWarn.visibility = View.GONE; return }
        val memo = Prefs.excludeMemo(this, num)
        val last = Prefs.lastSent(this, num)
        val hours = Prefs.cooldownHours(this)
        when {
            memo != null -> {
                phoneWarn.text = "🚫 발송제외 번호예요" + if (memo.isNotEmpty()) " ($memo)" else ""
                phoneWarn.setTextColor(Col.RED); phoneWarn.background = ui.rect(Col.RED50, 12f)
                phoneWarn.visibility = View.VISIBLE
            }
            last > 0 && hours > 0 && System.currentTimeMillis() - last < hours * 3600_000L -> {
                phoneWarn.text = "🔁 ${ago(last)}에 이미 보낸 번호예요"
                phoneWarn.setTextColor(Col.AMBER800); phoneWarn.background = ui.rect(Col.AMBER50, 12f)
                phoneWarn.visibility = View.VISIBLE
            }
            else -> phoneWarn.visibility = View.GONE
        }
    }

    private fun pastePhone() {
        val cm = getSystemService(ClipboardManager::class.java)
        val t = cm?.primaryClip?.takeIf { it.itemCount > 0 }?.getItemAt(0)?.coerceToText(this)?.toString().orEmpty()
        val d = PhoneUtil.normalize(t)
        if (d.length < 9) { toast("복사된 전화번호가 없어요", "err"); return }
        phoneEdit.setText(d)
        toast("📋 번호를 붙여넣었어요")
    }

    /** 통화기록에서 가장 최근 통화 번호 가져오기 (+ 통화 종류에 맞는 문자 자동 선택) */
    private fun fillLastCall() {
        if (!has(Manifest.permission.READ_CALL_LOG)) { permLauncher.launch(requiredPerms); return }
        try {
            contentResolver.query(
                CallLog.Calls.CONTENT_URI, arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.TYPE, CallLog.Calls.DURATION),
                null, null, "${CallLog.Calls.DATE} DESC"
            )?.use { c ->
                if (!c.moveToFirst()) { toast("통화 기록이 없어요", "err"); return }
                val num = PhoneUtil.normalize(c.getString(0))
                val type = c.getInt(1); val dur = c.getLong(2)
                val kind = when (type) {
                    CallLog.Calls.OUTGOING_TYPE -> "발신"
                    CallLog.Calls.MISSED_TYPE, CallLog.Calls.REJECTED_TYPE -> "부재중"
                    CallLog.Calls.INCOMING_TYPE -> if (dur > 0) "수신" else "부재중"
                    else -> "수신"
                }
                if (num.isEmpty()) { toast("발신번호 표시제한 전화예요", "err"); return }
                phoneEdit.setText(num)
                val cur = selectedTpl()
                if (cur.type != kind) {
                    Templates.load(this).firstOrNull { it.type == kind }?.let { t ->
                        Prefs.sp(this).edit().putString(Prefs.KEY_SELECTED, t.id).apply()
                        renderChips(); renderFields(); renderSendImgs(); setDraftFromTpl()
                        toast("📞 $kind 전화 · [${t.name}] 문자로 바꿨어요"); return
                    }
                }
                toast("📞 방금 $kind 전화 번호를 넣었어요")
            }
        } catch (e: Exception) { toast("통화 기록을 읽지 못했어요", "err") }
    }

    // ---------- 직접 보내기 ----------
    /** 전체 화면 글씨 수정 창 */
    private fun openBigEditor(title: String, text: String, onDone: (String) -> Unit) {
        val d = android.app.Dialog(this, android.R.style.Theme_Material_Light_NoActionBar)
        val e = EditText(this).apply {
            setText(text)
            gravity = Gravity.TOP or Gravity.START
            textSize = 18f
            setTextColor(Col.S900)
            setLineSpacing(0f, 1.3f)
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
            background = null
            setPadding(ui.dp(18), ui.dp(16), ui.dp(18), ui.dp(16))
        }
        val col = ui.col().apply { setBackgroundColor(Col.WHITE) }
        val top = ui.row().apply {
            background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(Col.B700, Col.B500))
            setPadding(ui.dp(10), ui.dp(10), ui.dp(10), ui.dp(10))
        }
        top.addView(ui.button("취소", Col.B700, Col.WHITE, 44, 16f, radius = 12f) { d.dismiss() }, ui.lp(ui.WRAP, ui.WRAP))
        top.addView(ui.text(title, 17f, Col.WHITE, true).apply { gravity = Gravity.CENTER }, ui.lp(0, ui.WRAP, 1f))
        top.addView(ui.button("✓ 완료", Col.WHITE, Col.B700, 44, 16f, radius = 12f) {
            onDone(e.text.toString()); d.dismiss()
        }, ui.lp(ui.WRAP, ui.WRAP))
        col.addView(top, ui.lp())
        val sv = ScrollView(this).apply { isFillViewport = true; addView(e, FrameLayout.LayoutParams(ui.MATCH, ui.WRAP)) }
        col.addView(sv, ui.lp(h = 0, weight = 1f))
        val info = ui.text("", 13f, Col.S400, true).apply { gravity = Gravity.END; setPadding(ui.dp(16), ui.dp(6), ui.dp(16), ui.dp(8)); setBackgroundColor(Col.S50) }
        fun count() { val m = e.text.toString().trim(); info.text = "${m.length}자 · ${Compose.byteLen(m)}바이트" }
        e.addTextChangedListener(watcher { count() }); count()
        col.addView(info, ui.lp())
        d.setContentView(col)
        d.window?.apply {
            setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE)
            statusBarColor = Col.B700
            setLayout(ui.MATCH, ui.MATCH)
        }
        d.show()
        e.requestFocus()
        e.setSelection(e.text.length)
    }

    /** 키보드 내리기 + 입력칸 선택 해제 */
    private fun hideKeyboard() {
        val v = currentFocus ?: window.decorView
        getSystemService(android.view.inputmethod.InputMethodManager::class.java)
            ?.hideSoftInputFromWindow(v.windowToken, 0)
        currentFocus?.clearFocus()
    }

    private fun sendManual(withImages: Boolean) {
        hideKeyboard()
        val num = PhoneUtil.normalize(phoneEdit.text.toString())
        if (num.length < 9) { toast("① 고객 전화번호를 입력해 주세요", "err"); phoneEdit.requestFocus(); return }
        if (!has(Manifest.permission.SEND_SMS)) { permLauncher.launch(requiredPerms); return }
        val text = Compose.finalize(this, draftEdit.text.toString().trim())
        if (text.isEmpty()) { toast("보낼 문자가 비어 있어요", "err"); return }
        if (Templates.TOKEN_RE.containsMatchIn(text)) { toast("📝 예약 정보 빈칸을 채워 주세요", "err"); return }
        val t = selectedTpl()
        val imgs = Prefs.imageFiles(this)
        val useImg = withImages && imgs.isNotEmpty()
        val notes = mutableListOf<String>()
        Prefs.excludeMemo(this, num)?.let { notes.add("🚫 발송제외 번호예요" + if (it.isNotEmpty()) " ($it)" else "") }
        val last = Prefs.lastSent(this, num); val hours = Prefs.cooldownHours(this)
        if (last > 0 && hours > 0 && System.currentTimeMillis() - last < hours * 3600_000L) notes.add("🔁 ${ago(last)}에 이미 보낸 번호예요")
        if (withImages && imgs.isEmpty()) notes.add("📷 홍보 사진이 없어서 글만 보내요")
        notes.add("[${t.icon} ${t.name}] " + if (useImg) "사진 ${imgs.size}장 + 문자" else "문자 (${Compose.kind(text, false)})")
        AlertDialog.Builder(this)
            .setTitle("${PhoneUtil.pretty(num)} 에게 보낼까요?")
            .setMessage(notes.joinToString("\n\n"))
            .setPositiveButton("보내기") { _, _ ->
                val id = Prefs.newId()
                Prefs.markSent(this, num, System.currentTimeMillis())
                Prefs.addHistory(this, SendRecord(id, System.currentTimeMillis(), num, t.type, "발송중", t.name, false))
                MmsSender.send(this, num, id, text, t.title, useImg)
                toast("✅ 보냈어요 · 결과는 발송내역에서 확인", "ok")
                phoneEdit.setText("")
                hideKeyboard()
                renderRecent()
            }
            .setNegativeButton("취소", null)
            .show()
    }

    // =====================================================================
    // ② 문자설정 탭
    // =====================================================================
    private fun renderMsgs() {
        val b = bodies[1]!!
        b.removeAllViews()

        val ic = ui.card(Col.B200, 2f)
        val tr = ui.row()
        tr.addView(ui.text("📷 공통 홍보 사진 ", 17f, Col.S800, true))
        tr.addView(ui.text("(최대 3장)", 13f, Col.S400, true))
        ic.addView(tr)
        ic.addView(hint("여기 넣은 사진이 '사진 같이 보내기'가 켜진 모든 문자와 자동 콜백에 한 번에 같이 붙어요."), ui.lp(top = 4, bottom = 12))
        val files = Prefs.imageFiles(this)
        val size = (resources.displayMetrics.widthPixels - ui.dp(16 * 2 + 16 * 2 + 8 * 2)) / 3
        val grid = ui.row()
        for (i in 0 until Prefs.MAX_IMAGES) {
            val v: View = if (i < files.size) {
                val f = files[i]
                FrameLayout(this).apply {
                    addView(ImageView(this@MainActivity).apply {
                        setImageBitmap(thumb(f)); scaleType = ImageView.ScaleType.CENTER_CROP
                        background = ui.rect(Col.S100, 16f); clipToOutline = true
                    }, FrameLayout.LayoutParams(ui.MATCH, ui.MATCH))
                    addView(ui.text("✕", 14f, Col.WHITE, true).apply {
                        gravity = Gravity.CENTER
                        background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(0x99000000.toInt()) }
                    }, FrameLayout.LayoutParams(ui.dp(28), ui.dp(28), Gravity.TOP or Gravity.END).apply { setMargins(0, ui.dp(6), ui.dp(6), 0) })
                    setOnClickListener {
                        AlertDialog.Builder(this@MainActivity).setMessage("${i + 1}번째 사진을 뺄까요?")
                            .setPositiveButton("빼기") { _, _ -> Prefs.removeImage(this@MainActivity, i); thumbs.clear(); renderMsgs() }
                            .setNegativeButton("취소", null).show()
                    }
                }
            } else ui.button("＋\n사진 추가", Col.WHITE, Col.B700, 0, 14f, Col.B300, 16f, dashed = true) { pickImage.launch("image/*") }
            grid.addView(v, LinearLayout.LayoutParams(size, size).apply { if (i < 2) marginEnd = ui.dp(8) })
        }
        ic.addView(grid)
        val kb = files.sumOf { it.length() } / 1024
        ic.addView(ui.text(
            if (files.isEmpty()) "사진이 없으면 글자만 보내요" else "사진 ${files.size}장 · 총 ${kb}KB" + if (kb > 900) "  ⚠️ 용량이 커서 실패할 수 있어요" else "",
            13f, if (kb > 900) Col.RED else Col.S500
        ), ui.lp(top = 8))
        ic.addView(ui.button("↩ 기본 홍보 사진으로 되돌리기", Col.B50, Col.B700, 44, 14f, radius = 12f) {
            Prefs.restoreDefaultImages(this); thumbs.clear(); renderMsgs(); toast("기본 홍보 사진 3장으로 되돌렸어요")
        }, ui.lp(top = 10))
        b.addView(ic)

        b.addView(hint("문자를 눌러 제목·본문을 고칠 수 있어요. 🤖 표시는 자동 콜백에 쓰는 문자예요."), ui.lp(bottom = 10, start = 4))

        val inId = Prefs.autoInId(this); val missId = Prefs.autoMissId(this); val outId = Prefs.autoOutId(this)
        Templates.load(this).forEach { t ->
            val c = ui.card().apply {
                gravity = Gravity.CENTER_HORIZONTAL
                isClickable = true
                background = ui.ripple(ui.rect(Col.WHITE, 24f, Col.S200, 1f))
                setOnClickListener { openEditor(t) }
            }
            val hr = ui.row().apply { gravity = Gravity.CENTER }
            hr.addView(ui.text("${t.icon} ${t.name}  ", 16f, Col.S800, true))
            val (fg, bg) = Col.kind(t.type)
            hr.addView(ui.badge(t.type, fg, bg))
            if (t.id == inId) hr.addView(ui.badge("🤖 자동·수신", Col.GREEN700, Col.GREEN50), ui.lp(ui.WRAP, ui.WRAP, start = 6))
            if (t.id == missId) hr.addView(ui.badge("🤖 자동·부재중", Col.GREEN700, Col.GREEN50), ui.lp(ui.WRAP, ui.WRAP, start = 6))
            if (t.id == outId) hr.addView(ui.badge("🤖 자동·발신", Col.GREEN700, Col.GREEN50), ui.lp(ui.WRAP, ui.WRAP, start = 6))
            c.addView(hr)
            c.addView(ui.text("제목: " + t.title.ifBlank { "(없음)" } + (if (t.useImages) " · 📷 사진 포함" else "") + (if (t.sign) " · ✍️ 서명" else ""), 13f, Col.S500).apply { gravity = Gravity.CENTER }, ui.lp(top = 8))
            c.addView(ui.text(t.body.replace("\n", " "), 14f, Col.S600).apply {
                gravity = Gravity.CENTER; maxLines = 3; ellipsize = TextUtils.TruncateAt.END
            }, ui.lp(top = 8))
            c.addView(ui.text("편집 ›", 14f, Col.B600, true).apply { gravity = Gravity.CENTER }, ui.lp(top = 8))
            b.addView(c)
        }
        b.addView(ui.button("＋ 새 문자 추가", Col.WHITE, Col.B700, 56, 17f, Col.B300, 16f, dashed = true) { openEditor(null) }, ui.lp(bottom = 6))
        b.addView(ui.button("↩ 기본 문자로 되돌리기", Col.S100, Col.S400, 48, 14f) {
            AlertDialog.Builder(this).setMessage("문자 6종을 처음 상태로 되돌릴까요?\n(직접 추가한 문자는 지워져요)")
                .setPositiveButton("되돌리기") { _, _ ->
                    Templates.save(this, Templates.defaults())
                    Prefs.sp(this).edit().putString(Prefs.KEY_SELECTED, "t_in").putString(Prefs.KEY_AUTO_IN, "t_in").putString(Prefs.KEY_AUTO_MISS, "t_miss").putString(Prefs.KEY_AUTO_OUT, "t_out").apply()
                    renderMsgs(); setDraftFromTpl(); toast("기본 문자로 되돌렸어요")
                }.setNegativeButton("취소", null).show()
        })
    }

    /** 문자 편집 시트 (웹앱의 '✏️ 문자 편집'과 같은 구성) */
    private fun openEditor(orig: Tpl?) {
        val isNew = orig == null
        val t = orig ?: Tpl("t_" + System.currentTimeMillis(), "💬", "", "수신", "", "", true, true)
        val dlg = BottomSheetDialog(this)
        val sv = ScrollView(this)
        val b = ui.col().apply { setPadding(ui.dp(20), ui.dp(16), ui.dp(20), ui.dp(28)) }
        sv.addView(b)

        val hr = ui.row()
        hr.addView(ui.text("✏️ 문자 편집", 19f, Col.S900, true), ui.lp(0, ui.WRAP, 1f))
        hr.addView(ui.button("✕", Col.S100, Col.S700, 44, 18f, radius = 22f) { dlg.dismiss() }, ui.lp(ui.dp(44), ui.dp(44)))
        b.addView(hr, ui.lp(bottom = 14))

        val r1 = ui.row().apply { gravity = Gravity.TOP }
        val c1 = ui.col(); c1.addView(ui.text("아이콘", 13f, Col.S500, true), ui.lp(bottom = 4))
        val eIcon = ui.input("💬").apply { setText(t.icon); gravity = Gravity.CENTER; textSize = 22f }
        c1.addView(eIcon); r1.addView(c1, ui.lp(ui.dp(76), ui.WRAP, end = 8))
        val c2 = ui.col(); c2.addView(ui.text("버튼 이름", 13f, Col.S500, true), ui.lp(bottom = 4))
        val eName = ui.input("예: 수신 감사").apply { setText(t.name) }
        c2.addView(eName); r1.addView(c2, ui.lp(0, ui.WRAP, 1f))
        b.addView(r1, ui.lp(bottom = 14))

        b.addView(ui.text("통화 구분", 13f, Col.S500, true), ui.lp(bottom = 4))
        var type = t.type
        val typeRow = ui.row()
        val typeBtns = ArrayList<TextView>()
        fun paintTypes() = typeBtns.forEachIndexed { i, v ->
            val on = Templates.TYPES[i] == type
            v.background = ui.ripple(if (on) ui.rect(Col.B700, 12f) else ui.rect(Col.WHITE, 12f, Col.S200, 2f))
            v.setTextColor(if (on) Col.WHITE else Col.S600)
        }
        Templates.TYPES.forEachIndexed { i, ty ->
            val v = ui.button(ty, Col.WHITE, Col.S600, 44, 15f, radius = 12f) { type = ty; paintTypes() }
            typeBtns.add(v); typeRow.addView(v, ui.lp(0, ui.WRAP, 1f, end = if (i < 3) 6 else 0))
        }
        paintTypes()
        b.addView(typeRow, ui.lp(bottom = 14))

        val tl = ui.row(); tl.addView(ui.text("제목 ", 13f, Col.S500, true)); tl.addView(ui.text("(사진문자 제목 · 비우면 제목 없음)", 12f, Col.S400))
        b.addView(tl, ui.lp(bottom = 4))
        val eTitle = ui.input("문자 제목").apply { setText(t.title) }
        b.addView(eTitle, ui.lp(bottom = 14))

        var useImg = t.useImages
        val imgRow = ui.row().apply { background = ui.rect(Col.B50, 16f, Col.B200, 1f); setPadding(ui.dp(12), ui.dp(4), ui.dp(12), ui.dp(4)) }
        imgRow.addView(ui.check("📷 공통 홍보 사진 같이 보내기", useImg) { useImg = it }, ui.lp())
        b.addView(imgRow, ui.lp(bottom = 14))

        b.addView(ui.text("본문", 13f, Col.S500, true))
        b.addView(ui.text("빈칸 넣기: {청소날짜} {도착시간} {청소비용} {계약금} {잔금} — 보낼 때 입력칸이 생겨요 (빈칸이 있는 문자는 자동 발송에는 못 써요)", 12f, Col.S400), ui.lp(top = 2, bottom = 4))
        val eBody = ui.input("", multi = true).apply {
            setText(t.body); minLines = 10
            isFocusable = false; isFocusableInTouchMode = false; isLongClickable = false
            setOnClickListener { openBigEditor("본문 고치기", text.toString()) { v -> setText(v) } }
        }
        b.addView(eBody, ui.lp(bottom = 14))

        var sign = t.sign
        val signRow = ui.row().apply { background = ui.rect(Col.S50, 16f, Col.S200, 1f); setPadding(ui.dp(12), ui.dp(4), ui.dp(12), ui.dp(4)) }
        signRow.addView(ui.check("✍️ 하단 서명(전화·카톡·홈페이지) 붙이기", sign) { sign = it }, ui.lp())
        b.addView(signRow, ui.lp(bottom = 14))

        var autoIn = Prefs.autoInId(this) == t.id
        var autoMiss = Prefs.autoMissId(this) == t.id
        var autoOut = Prefs.autoOutId(this) == t.id
        val autoBox = ui.col().apply { background = ui.rect(Col.GREEN50, 16f, 0xFFA7F3D0.toInt(), 1f); setPadding(ui.dp(12), ui.dp(8), ui.dp(12), ui.dp(8)) }
        autoBox.addView(ui.text("🤖 자동 콜백에 이 문자 사용", 14f, Col.GREEN700, true))
        autoBox.addView(ui.check("받은 전화가 끝나면", autoIn) { autoIn = it })
        autoBox.addView(ui.check("부재중·거절 전화 후", autoMiss) { autoMiss = it })
        autoBox.addView(ui.check("내가 건 전화가 끝나면", autoOut) { autoOut = it })
        b.addView(autoBox, ui.lp(bottom = 14))

        if (!isNew) b.addView(ui.button("🗑️ 이 문자 삭제", Col.RED50, Col.RED, 48, 15f, radius = 12f) {
            val list = Templates.load(this)
            if (list.size <= 1) { toast("문자는 최소 1개 있어야 해요", "err"); return@button }
            AlertDialog.Builder(this).setMessage("[${t.name}] 문자를 삭제할까요?")
                .setPositiveButton("삭제") { _, _ ->
                    val rest = list.filter { it.id != t.id }
                    Templates.save(this, rest)
                    val first = rest.firstOrNull { !it.hasTokens }?.id ?: rest.first().id
                    val e = Prefs.sp(this).edit()
                    if (Prefs.autoInId(this) == t.id) e.putString(Prefs.KEY_AUTO_IN, first)
                    if (Prefs.autoMissId(this) == t.id) e.putString(Prefs.KEY_AUTO_MISS, first)
                    if (Prefs.autoOutId(this) == t.id) e.putString(Prefs.KEY_AUTO_OUT, first)
                    if (Prefs.selectedId(this) == t.id) e.putString(Prefs.KEY_SELECTED, rest.first().id)
                    e.apply()
                    dlg.dismiss(); renderMsgs(); setDraftFromTpl(); toast("삭제했어요")
                }.setNegativeButton("취소", null).show()
        }, ui.lp(bottom = 10))

        b.addView(ui.button("💾 저장", Col.B600, Col.WHITE, 60, 18f) {
            val name = eName.text.toString().trim()
            val body = eBody.text.toString().trim()
            if (name.isEmpty()) { toast("버튼 이름을 입력해 주세요", "err"); return@button }
            if (body.isEmpty()) { toast("본문을 입력해 주세요", "err"); return@button }
            val doSave = { finalBody: String ->
                val nt = Tpl(t.id, eIcon.text.toString().trim().ifEmpty { "💬" }, name, type, eTitle.text.toString().trim(), finalBody, sign, useImg)
                if ((autoIn || autoMiss || autoOut) && nt.hasTokens) {
                    toast("빈칸 {..}이 있는 문자는 자동 발송에 쓸 수 없어요", "err")
                } else {
                    val list = Templates.load(this)
                    val idx = list.indexOfFirst { it.id == nt.id }
                    if (idx >= 0) list[idx] = nt else list.add(nt)
                    Templates.save(this, list)
                    val e = Prefs.sp(this).edit()
                    if (autoIn) e.putString(Prefs.KEY_AUTO_IN, nt.id)
                    if (autoMiss) e.putString(Prefs.KEY_AUTO_MISS, nt.id)
                    if (autoOut) e.putString(Prefs.KEY_AUTO_OUT, nt.id)
                    e.apply()
                    dlg.dismiss(); renderMsgs(); if (!draftDirty) setDraftFromTpl()
                    toast("💾 저장했어요", "ok")
                }
            }
            val wide = Prefs.countWideEmoji(body)
            if (wide > 0) {
                AlertDialog.Builder(this)
                    .setTitle("아이폰 링크 밀림 주의")
                    .setMessage("본문에 아이폰에서 전화번호·링크 밑줄을 밀리게 하는 이모지가 ${wide}개 있어요.\n(예: 🏠 📞 📍 📸)\n\n자동으로 바꿔서 저장할까요?\n(✅ ✨ ☎ ▶ ■ 같은 기호는 괜찮아요)")
                    .setPositiveButton("바꿔서 저장") { _, _ -> doSave(Prefs.stripWideEmoji(body)) }
                    .setNegativeButton("그대로 저장") { _, _ -> doSave(body) }
                    .show()
            } else doSave(body)
        }, ui.lp())

        dlg.setContentView(sv)
        dlg.window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
        dlg.behavior.state = BottomSheetBehavior.STATE_EXPANDED
        dlg.behavior.skipCollapsed = true
        dlg.show()
    }

    // =====================================================================
    // ③ 발송내역 탭
    // =====================================================================
    private fun renderHistory() {
        val b = bodies[2]!!
        b.removeAllViews()
        val all = Prefs.history(this)
        val filters = listOf("전체", "수신", "발신", "부재중", "기타", "자동", "제외", "실패")
        fun match(r: SendRecord, f: String) = when (f) {
            "전체" -> r.isAttempt
            "자동" -> r.auto && r.isAttempt
            "제외" -> !r.isAttempt
            "실패" -> r.isFail
            "기타" -> r.isAttempt && (r.kind == "기타" || r.kind == "테스트")
            else -> r.isAttempt && r.kind == f
        }
        val fr = ui.row()
        filters.forEach { f ->
            val on = f == histFilter
            val n = all.count { match(it, f) }
            fr.addView(ui.button("$f $n", if (on) Col.B700 else Col.WHITE, if (on) Col.WHITE else Col.S600, 40, 14f, if (on) 0 else Col.S200, 12f) {
                histFilter = f; renderHistory()
            }, ui.lp(ui.WRAP, ui.WRAP, end = 6))
        }
        b.addView(HorizontalScrollView(this).apply { isHorizontalScrollBarEnabled = false; addView(fr) }, ui.lp(bottom = 12))

        val card = ui.col().apply { background = ui.rect(Col.WHITE, 24f, Col.S200, 1f); clipToOutline = true }
        val head = ui.row().apply { setBackgroundColor(Col.S50); setPadding(ui.dp(16), ui.dp(8), ui.dp(16), ui.dp(8)) }
        head.addView(ui.text("날짜", 13f, Col.S500, true), ui.lp(0, ui.WRAP, 1.0f))
        head.addView(ui.text("번호", 13f, Col.S500, true), ui.lp(0, ui.WRAP, 1.7f))
        head.addView(ui.text("구분", 13f, Col.S500, true).apply { gravity = Gravity.END }, ui.lp(0, ui.WRAP, 1.0f))
        card.addView(head)
        val list = all.filter { match(it, histFilter) }
        if (list.isEmpty()) {
            card.addView(ui.text("발송 내역이 없어요", 14f, Col.S400).apply { gravity = Gravity.CENTER; setPadding(0, ui.dp(28), 0, ui.dp(28)) }, ui.lp())
        }
        val fd = SimpleDateFormat("MM-dd", Locale.KOREA); val ft = SimpleDateFormat("HH:mm", Locale.KOREA)
        list.take(200).forEach { r ->
            card.addView(View(this).apply { setBackgroundColor(Col.S100) }, ui.lp(h = ui.dp(1)))
            val row = ui.row().apply {
                setPadding(ui.dp(16), ui.dp(10), ui.dp(16), ui.dp(10)); gravity = Gravity.CENTER_VERTICAL
                isClickable = true; background = ui.ripple(ColorDrawable(Col.WHITE))
                setOnClickListener {
                    AlertDialog.Builder(this@MainActivity)
                        .setTitle(PhoneUtil.pretty(r.number))
                        .setMessage("${SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.KOREA).format(Date(r.time))}\n구분: ${r.kind}${if (r.auto) " (자동)" else " (직접)"}\n문자: ${r.tpl.ifEmpty { "-" }}\n결과: ${r.status}")
                        .setPositiveButton("이 번호로 보내기") { _, _ -> selectTab(0); phoneEdit.setText(r.number) }
                        .setNegativeButton("닫기", null).show()
                }
            }
            val dc = ui.col()
            dc.addView(ui.text(fd.format(Date(r.time)), 14f, Col.S700, true))
            dc.addView(ui.text(ft.format(Date(r.time)), 12f, Col.S400))
            row.addView(dc, ui.lp(0, ui.WRAP, 1.0f))
            val nc = ui.col()
            nc.addView(ui.text(PhoneUtil.pretty(r.number), 15f, Col.S800, true))
            val stColor = when { r.isSuccess -> Col.GREEN; r.isFail -> Col.RED; !r.isAttempt -> Col.S400; else -> Col.B600 }
            nc.addView(ui.text((if (r.auto) "🤖 " else "") + r.status, 12f, stColor).apply { maxLines = 1; ellipsize = TextUtils.TruncateAt.END })
            row.addView(nc, ui.lp(0, ui.WRAP, 1.7f))
            val kc = ui.col().apply { gravity = Gravity.END }
            val (fg, bg) = Col.kind(r.kind)
            kc.addView(ui.badge(r.kind, fg, bg))
            row.addView(kc, ui.lp(0, ui.WRAP, 1.0f))
            card.addView(row)
        }
        b.addView(card, ui.lp())
        b.addView(ui.text("※ 최근 300건 보관 (이 휴대폰에만 저장)", 13f, Col.S400).apply { gravity = Gravity.CENTER }, ui.lp(top = 12))
        val br = ui.row()
        br.addView(ui.button("📊 엑셀(CSV) 저장", Col.WHITE, Col.S600, 48, 14f, Col.S200, 12f) { exportCsv() }, ui.lp(0, ui.WRAP, 1f, end = 8))
        br.addView(ui.button("🗑️ 내역 지우기", Col.WHITE, Col.RED, 48, 14f, Col.S200, 12f) {
            AlertDialog.Builder(this).setMessage("발송 내역을 모두 지울까요?\n(재발송 금지 기록은 유지돼요)")
                .setPositiveButton("지우기") { _, _ -> Prefs.clearHistory(this); renderHistory() }
                .setNegativeButton("취소", null).show()
        }, ui.lp(0, ui.WRAP, 1f))
        b.addView(br, ui.lp(top = 12))
    }

    private fun exportCsv() {
        try {
            val f = SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.KOREA)
            val sb = StringBuilder("﻿날짜,번호,구분,문자,방식,결과\n")
            Prefs.history(this).forEach { r ->
                sb.append("${f.format(Date(r.time))},${PhoneUtil.pretty(r.number)},${r.kind},\"${r.tpl.replace("\"", "'")}\",${if (r.auto) "자동" else "직접"},\"${r.status.replace("\"", "'")}\"\n")
            }
            val dir = File(cacheDir, "export").apply { mkdirs() }
            val file = File(dir, "콜백발송내역_${SimpleDateFormat("yyyyMMdd", Locale.KOREA).format(Date())}.csv")
            file.writeText(sb.toString())
            shareFile(file, "text/csv", "발송 내역 저장")
        } catch (e: Exception) { toast("CSV를 만들지 못했어요", "err") }
    }

    private fun shareFile(file: File, mime: String, title: String) {
        val uri = FileProvider.getUriForFile(this, "$packageName.files", file)
        val send = Intent(Intent.ACTION_SEND).apply {
            type = mime; putExtra(Intent.EXTRA_STREAM, uri); addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(Intent.createChooser(send, title))
    }

    // =====================================================================
    // ④ 설정 탭
    // =====================================================================
    private fun renderSettings() {
        val b = bodies[3]!!
        b.removeAllViews()
        val sp = Prefs.sp(this)

        // 🤖 자동 콜백
        val ac = ui.card(Col.B200, 2f)
        ac.addView(h2("🤖 자동 콜백 (통화 끝나면 자동 발송)", 16f, Col.S800))
        ac.addView(hint("자동 콜백이 ON일 때 어떤 전화에 어떤 문자를 보낼지 정해요."), ui.lp(top = 2, bottom = 8))
        fun autoRow(label: String, key: String, checked: Boolean, tplKey: String, tplId: String) {
            val r = ui.row().apply { background = ui.rect(Col.S50, 16f, Col.S200, 1f); setPadding(ui.dp(10), ui.dp(4), ui.dp(10), ui.dp(4)) }
            r.addView(ui.check(label, checked) { sp.edit().putBoolean(key, it).apply() }, ui.lp(0, ui.WRAP, 1f))
            val t = Templates.find(this, tplId)
            r.addView(ui.button("${t?.icon ?: "💬"} ${t?.name ?: "선택"} ›", Col.WHITE, Col.B700, 40, 14f, Col.B200, 12f) {
                val choices = Templates.load(this).filter { !it.hasTokens }
                AlertDialog.Builder(this).setTitle("$label 보낼 문자")
                    .setItems(choices.map { "${it.icon} ${it.name}" }.toTypedArray()) { _, w ->
                        sp.edit().putString(tplKey, choices[w].id).apply(); renderSettings(); toast("자동 문자를 [${choices[w].name}]로 바꿨어요")
                    }.show()
            }, ui.lp(ui.WRAP, ui.WRAP))
            ac.addView(r, ui.lp(bottom = 8))
        }
        autoRow("받은 전화", Prefs.KEY_SEND_INCOMING, Prefs.sendIncoming(this), Prefs.KEY_AUTO_IN, Prefs.autoInId(this))
        autoRow("부재중·거절", Prefs.KEY_SEND_MISSED, Prefs.sendMissed(this), Prefs.KEY_AUTO_MISS, Prefs.autoMissId(this))
        autoRow("내가 건 전화", Prefs.KEY_SEND_OUTGOING, Prefs.sendOutgoing(this), Prefs.KEY_AUTO_OUT, Prefs.autoOutId(this))
        ac.addView(ui.text("※ 내가 건 전화는 상대가 받아서 통화가 된 경우에만 보내요.", 12f, Col.S500).apply { setPadding(ui.dp(6), 0, 0, ui.dp(6)) })
        ac.addView(ui.check("주소록에 저장된 번호(가족·지인·거래처)는 빼기", Prefs.skipContacts(this)) { sp.edit().putBoolean(Prefs.KEY_SKIP_CONTACTS, it).apply() })
        ac.addView(ui.check("휴대폰 번호(010 등)에만 보내기", Prefs.mobileOnly(this)) { sp.edit().putBoolean(Prefs.KEY_MOBILE_ONLY, it).apply() })
        val lr = ui.row().apply { setPadding(ui.dp(4), ui.dp(4), 0, 0) }
        lr.addView(ui.text("하루 최대 자동 발송", 15f, Col.S700, true), ui.lp(0, ui.WRAP, 1f))
        val lim = ui.input("100", type = InputType.TYPE_CLASS_NUMBER).apply { setText(Prefs.dailyLimit(this@MainActivity).toString()); gravity = Gravity.CENTER }
        lim.addTextChangedListener(watcher { s -> s.toIntOrNull()?.takeIf { it in 1..1000 }?.let { sp.edit().putInt(Prefs.KEY_DAILY_LIMIT, it).apply() } })
        lr.addView(lim, ui.lp(ui.dp(90), ui.WRAP)); lr.addView(ui.text(" 건", 15f, Col.S600))
        ac.addView(lr)
        b.addView(ac)

        // 🔁 동일번호 발송주기
        val pc = ui.card()
        pc.addView(h2("🔁 동일번호 발송주기", 16f, Col.S800))
        pc.addView(hint("같은 번호에는 이 기간 안에 자동으로 다시 보내지 않아요. 직접 보낼 땐 한 번 더 물어봐요."), ui.lp(top = 2, bottom = 10))
        val periods = listOf("매번" to 0, "1일" to 24, "1주" to 168, "15일" to 360, "1개월" to 720)
        val prow = ui.row()
        val cur = Prefs.cooldownHours(this)
        periods.forEachIndexed { i, (lb, h) ->
            val on = cur == h
            prow.addView(ui.button(lb, if (on) Col.B700 else Col.WHITE, if (on) Col.WHITE else Col.S600, 48, 15f, if (on) 0 else Col.S200, 12f) {
                sp.edit().putInt(Prefs.KEY_COOLDOWN_H, h).apply(); renderSettings(); toast("동일번호 발송주기: $lb")
            }, ui.lp(0, ui.WRAP, 1f, end = if (i < 4) 6 else 0))
        }
        pc.addView(prow)
        b.addView(pc)

        // ✍️ 서명
        val sc = ui.card()
        sc.addView(h2("✍️ 문자 하단 서명 (공통)", 16f, Col.S800))
        sc.addView(hint("아래에 쓴 내용이 체크한 문자 끝에 자동으로 붙어요."), ui.lp(top = 2, bottom = 10))
        val signEdit = ui.input("서명 내용", multi = true).apply {
            setText(Prefs.signCustom(this@MainActivity) ?: Compose.defaultSign(this@MainActivity)); minLines = 4
        }
        signEdit.addTextChangedListener(watcher { t -> sp.edit().putString(Prefs.KEY_SIGN_TEXT, t).apply(); if (!draftDirty) setDraftFromTpl() })
        sc.addView(signEdit, ui.lp(bottom = 6))
        sc.addView(ui.text("예) Tel. 064-763-4545 / 카카오톡 상담: 링크 / 영업시간 등 자유롭게 쓰세요. 고치면 바로 저장돼요.", 12f, Col.S400), ui.lp(bottom = 8))
        sc.addView(ui.button("↩ 기본 서명으로 되돌리기", Col.S100, Col.S500, 40, 13f, radius = 12f) {
            sp.edit().remove(Prefs.KEY_SIGN_TEXT).apply(); renderSettings(); if (!draftDirty) setDraftFromTpl()
        }, ui.lp(bottom = 12))
        sc.addView(ui.text("서명을 붙일 문자", 14f, Col.S700, true), ui.lp(bottom = 4))
        val signBox = ui.col().apply { background = ui.rect(Col.S50, 16f, Col.S200, 1f); setPadding(ui.dp(8), ui.dp(4), ui.dp(8), ui.dp(4)) }
        Templates.load(this).forEach { t ->
            signBox.addView(ui.check("${t.icon} ${t.name}", t.sign) { on ->
                val list = Templates.load(this)
                val idx = list.indexOfFirst { it.id == t.id }
                if (idx >= 0) { list[idx] = list[idx].copy(sign = on); Templates.save(this, list) }
                if (!draftDirty) setDraftFromTpl()
            })
        }
        sc.addView(signBox, ui.lp(bottom = 8))
        val tor = ui.row().apply { background = ui.rect(Col.S50, 16f, Col.S200, 1f); setPadding(ui.dp(10), ui.dp(4), ui.dp(10), ui.dp(4)) }
        tor.addView(ui.check("📌 제목을 문자 첫 줄에 [제목]으로 넣기", Prefs.titleOn(this)) {
            sp.edit().putBoolean(Prefs.KEY_TITLE_ON, it).apply(); if (!draftDirty) setDraftFromTpl()
        }, ui.lp())
        sc.addView(tor, ui.lp(bottom = 8))
        val sfr = ui.col().apply { background = ui.rect(Col.B50, 16f, Col.B200, 1f); setPadding(ui.dp(10), ui.dp(4), ui.dp(10), ui.dp(8)) }
        sfr.addView(ui.check("📱 아이폰 링크 보정 (이모지 빼고 보내기)", Prefs.safeText(this)) {
            sp.edit().putBoolean(Prefs.KEY_SAFE_TEXT, it).apply(); if (!draftDirty) setDraftFromTpl()
        })
        sfr.addView(ui.text("아이폰에서 전화번호·링크 밑줄이 밀리는 문제를 막아요. 앱 화면의 아이콘은 그대로이고, 나가는 문자에서만 ✅→-, ☎→Tel. 처럼 바뀌어요.", 12f, Col.S500).apply { setPadding(ui.dp(8), 0, 0, 0) })
        sc.addView(sfr)
        b.addView(sc)

        // 🚫 발송제외 번호
        val ec = ui.card()
        ec.addView(h2("🚫 발송제외 번호", 16f, Col.S800))
        ec.addView(hint("본인·가족·거래처 등 콜백 문자를 보내지 않을 번호예요. 자동 발송에서도 빠져요."), ui.lp(top = 2, bottom = 10))
        val er = ui.row()
        val exNum = ui.input("번호", type = InputType.TYPE_CLASS_PHONE)
        val exMemo = ui.input("메모 (예: 거래처)")
        er.addView(exNum, ui.lp(0, ui.WRAP, 1f, end = 6))
        er.addView(exMemo, ui.lp(0, ui.WRAP, 1.1f, end = 6))
        er.addView(ui.button("추가", Col.S800, Col.WHITE, 48, 15f, radius = 12f) {
            val n = PhoneUtil.normalize(exNum.text.toString())
            if (n.length < 7) { toast("번호를 입력해 주세요", "err"); return@button }
            val list = Prefs.excludes(this).filter { it.first != n } + (n to exMemo.text.toString().trim())
            Prefs.setExcludes(this, list); renderSettings(); toast("🚫 ${PhoneUtil.pretty(n)} 제외 번호로 추가")
        }, ui.lp(ui.WRAP, ui.WRAP))
        ec.addView(er, ui.lp(bottom = 6))
        val exs = Prefs.excludes(this)
        if (exs.isEmpty()) ec.addView(ui.text("등록된 번호가 없어요", 14f, Col.S400).apply { setPadding(ui.dp(4), ui.dp(8), 0, 0) })
        exs.forEachIndexed { i, (n, m) ->
            if (i > 0) ec.addView(View(this).apply { setBackgroundColor(Col.S100) }, ui.lp(h = ui.dp(1)))
            val r = ui.row().apply { setPadding(ui.dp(4), ui.dp(8), 0, ui.dp(8)) }
            r.addView(ui.text(PhoneUtil.pretty(n), 16f, Col.S800, true), ui.lp(ui.WRAP, ui.WRAP, end = 10))
            r.addView(ui.text(m, 14f, Col.S500), ui.lp(0, ui.WRAP, 1f))
            r.addView(ui.button("✕", Col.S100, Col.S500, 36, 14f, radius = 18f) {
                Prefs.setExcludes(this, exs.filter { it.first != n }); renderSettings()
            }, ui.lp(ui.dp(36), ui.dp(36)))
            ec.addView(r)
        }
        b.addView(ec)

        // 💾 백업
        val bc = ui.card()
        bc.addView(h2("💾 백업 · 복원", 16f, Col.S800))
        bc.addView(hint("휴대폰을 바꾸거나 다른 폰에 같은 문자를 쓸 때 파일로 옮기세요. (사진 포함)"), ui.lp(top = 2, bottom = 10))
        val bkr = ui.row()
        bkr.addView(ui.button("⬇️ 백업 파일 저장", Col.B600, Col.WHITE, 48, 15f, radius = 12f) {
            backupLauncher.launch("콜백문자_백업_${SimpleDateFormat("yyyyMMdd", Locale.KOREA).format(Date())}.json")
        }, ui.lp(0, ui.WRAP, 1f, end = 8))
        bkr.addView(ui.button("⬆️ 백업 불러오기", Col.S100, Col.S700, 48, 15f, Col.S200, 12f) {
            restoreLauncher.launch(arrayOf("application/json", "application/octet-stream", "*/*"))
        }, ui.lp(0, ui.WRAP, 1f))
        bc.addView(bkr)
        b.addView(bc)

        // 🔋 꺼지지 않게
        val pw = ui.card()
        pw.addView(h2("🔋 꺼지지 않게 하기", 16f, Col.S800))
        pw.addView(ui.text(
            (if (isIgnoringBattery()) "✅ 배터리 최적화 예외 등록됨" else "⚠️ 배터리 최적화 예외 미등록") + "\n" +
                (if (missingCorePerms().isEmpty()) "✅ 전화·통화기록·문자 권한 허용됨" else "⚠️ 권한이 부족해요"),
            14f, Col.S600
        ), ui.lp(top = 4, bottom = 10))
        pw.addView(ui.button("배터리 최적화 예외 등록", Col.WHITE, Col.B700, 48, 15f, Col.B200, 12f) { requestBatteryExemption() }, ui.lp(bottom = 8))
        pw.addView(ui.button("앱 정보 열기 (권한 · 제한된 설정)", Col.WHITE, Col.B700, 48, 15f, Col.B200, 12f) { openAppSettings() })
        b.addView(pw)

        // 🆕 앱 업데이트
        val uc = ui.card(if (Updater.isNewer(Updater.latest)) Col.GREEN else Col.S200, if (Updater.isNewer(Updater.latest)) 2f else 1f)
        uc.addView(h2("🆕 앱 업데이트", 16f, Col.S800))
        uc.addView(ui.text("지금 버전: ${BuildConfig.VERSION_NAME}" + (Updater.latest?.let { if (Updater.isNewer(it)) "  →  새 버전 ${it.name} 있음!" else "  (최신)" } ?: ""), 14f, Col.S600), ui.lp(top = 4, bottom = 10))
        uc.addView(ui.button(if (Updater.isNewer(Updater.latest)) "⬇️ 지금 업데이트" else "🔎 새 버전 확인", if (Updater.isNewer(Updater.latest)) Col.GREEN else Col.B600, Col.WHITE, 52, 16f) {
            if (Updater.isNewer(Updater.latest)) startUpdate() else checkUpdate(silent = false)
        })
        b.addView(uc)

        // 📤 공유
        val shc = ui.card()
        shc.addView(h2("📤 다른 폰에 설치하기", 16f, Col.S800))
        shc.addView(hint("설치 링크를 카톡·문자로 보내면 받는 분이 눌러서 바로 설치할 수 있어요. (안드로이드 전용)"), ui.lp(top = 2, bottom = 10))
        shc.addView(ui.button("🔗 앱 공유하기 (카톡·문자)", Col.B600, Col.WHITE, 56, 16f) { shareApp() })
        b.addView(shc)

        // ❓ 사용 안내
        val hc = ui.card()
        hc.addView(h2("❓ 사용 안내", 16f, Col.S800), ui.lp(bottom = 8))
        listOf(
            "🤖 자동 콜백: 보내기 탭의 큰 버튼을 ON으로 두면 전화가 끝날 때 지정한 문자가 자동으로 나가요. 받은 전화·부재중·내가 건 전화(통화된 경우)마다 문자를 따로 정할 수 있어요.",
            "📞 방금 통화: 누르면 가장 최근 통화 번호가 들어가고, 통화 종류(수신·발신·부재중)에 맞는 문자로 바뀌어요.",
            "💬 문자만 보내기: 글만 보내요. 길면 장문(LMS)으로 가요.",
            "🖼️ 사진+문자 보내기: 공통 홍보 사진과 글을 사진문자(MMS) 한 통으로 보내요. 모바일 데이터가 켜져 있어야 해요.",
            "📝 계약 확정처럼 {빈칸}이 있는 문자는 보내기 화면에서 날짜·금액을 입력하면 자동으로 채워져요.",
            "문자 요금은 휴대폰 요금제의 기본 문자로 나가요."
        ).forEach { hc.addView(ui.text("• $it", 14f, Col.S600), ui.lp(bottom = 8)) }
        hc.addView(ui.button("⚠️ 전체 초기화", Col.RED50, Col.RED, 48, 14f, radius = 12f) { resetAll() }, ui.lp(top = 8))
        b.addView(hc)

        b.addView(ui.text("버전 ${BuildConfig.VERSION_NAME}", 13f, Col.S400).apply { gravity = Gravity.CENTER }, ui.lp(top = 4, bottom = 12))
    }

    private fun shareApp() {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, "링크클린 자동콜백 앱")
            putExtra(Intent.EXTRA_TEXT, "링크클린 자동콜백 앱 설치 링크입니다.\n아래 링크를 눌러 초록 버튼으로 설치하세요 (안드로이드 전용)\n\nhttps://linkcleaning.github.io/callback-app/")
        }
        startActivity(Intent.createChooser(send, "앱 공유하기"))
    }

    private fun resetAll() {
        AlertDialog.Builder(this).setTitle("전체 초기화")
            .setMessage("문자·사진·서명·제외번호·발송내역이 모두 처음 상태로 돌아가요. 계속할까요?")
            .setPositiveButton("초기화") { _, _ ->
                CallMonitorService.stop(this)
                Prefs.sp(this).edit().clear().commit()
                Prefs.clearImages(this)
                Prefs.seedDefaults(this)
                Prefs.restoreDefaultImages(this)
                fields.clear(); thumbs.clear(); draftDirty = false
                selectTab(0); toast("처음 상태로 되돌렸어요")
            }.setNegativeButton("취소", null).show()
    }

    // ---------- 백업 / 복원 ----------
    private fun writeBackup(uri: Uri) {
        try {
            val sp = Prefs.sp(this)
            val p = JSONObject()
            Prefs.BACKUP_KEYS.forEach { k ->
                when (val v = sp.all[k]) {
                    is Boolean -> p.put(k, JSONObject().put("t", "b").put("v", v))
                    is Int -> p.put(k, JSONObject().put("t", "i").put("v", v))
                    is Long -> p.put(k, JSONObject().put("t", "l").put("v", v))
                    is String -> p.put(k, JSONObject().put("t", "s").put("v", v))
                    else -> {}
                }
            }
            val imgs = JSONArray()
            Prefs.imageFiles(this).forEach { imgs.put(Base64.encodeToString(it.readBytes(), Base64.NO_WRAP)) }
            val root = JSONObject().put("app", "linkclean-callback").put("v", 1).put("prefs", p).put("images", imgs)
            contentResolver.openOutputStream(uri)?.use { it.write(root.toString().toByteArray()) }
            toast("⬇️ 백업 파일을 저장했어요", "ok")
        } catch (e: Exception) { toast("백업에 실패했어요", "err") }
    }

    private fun readBackup(uri: Uri) {
        try {
            val txt = contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) } ?: return
            val root = JSONObject(txt)
            if (root.optString("app") != "linkclean-callback") { toast("콜백문자 백업 파일이 아니에요", "err"); return }
            val p = root.getJSONObject("prefs")
            val e = Prefs.sp(this).edit()
            p.keys().forEach { k ->
                val o = p.getJSONObject(k)
                when (o.optString("t")) {
                    "b" -> e.putBoolean(k, o.getBoolean("v"))
                    "i" -> e.putInt(k, o.getInt("v"))
                    "l" -> e.putLong(k, o.getLong("v"))
                    "s" -> e.putString(k, o.getString("v"))
                }
            }
            e.commit()
            val imgs = root.optJSONArray("images")
            if (imgs != null) {
                Prefs.clearImages(this)
                for (i in 0 until minOf(imgs.length(), Prefs.MAX_IMAGES)) Prefs.imageSlot(this, i).writeBytes(Base64.decode(imgs.getString(i), Base64.NO_WRAP))
            }
            thumbs.clear(); draftDirty = false
            selectTab(3); setDraftFromTpl(); toast("⬆️ 백업을 불러왔어요", "ok")
        } catch (e: Exception) { toast("백업 파일을 읽지 못했어요", "err") }
    }

    // ---------- 사진 ----------
    private fun thumb(f: File): Bitmap? {
        val key = f.absolutePath + f.lastModified()
        thumbs[key]?.let { return it }
        val bmp = BitmapFactory.decodeFile(f.absolutePath, BitmapFactory.Options().apply { inSampleSize = 4 }) ?: return null
        thumbs[key] = bmp
        return bmp
    }

    private fun saveImage(uri: Uri) {
        Thread {
            try {
                val bmp = decodeScaled(uri, 1280)
                var q = 88
                var bytes: ByteArray
                do {
                    val bos = ByteArrayOutputStream()
                    bmp.compress(Bitmap.CompressFormat.JPEG, q, bos)
                    bytes = bos.toByteArray(); q -= 8
                } while (bytes.size > 230 * 1024 && q > 20)
                val slot = Prefs.imageFiles(this).size
                if (slot >= Prefs.MAX_IMAGES) throw IllegalStateException("사진은 최대 3장")
                Prefs.imageSlot(this, slot).writeBytes(bytes)
                runOnUiThread { thumbs.clear(); renderMsgs(); toast("📷 사진 추가 (${bytes.size / 1024}KB)", "ok") }
            } catch (e: Exception) {
                runOnUiThread { toast("사진을 불러오지 못했어요: ${e.message}", "err") }
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
        val raw = contentResolver.openInputStream(uri)!!.use { BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = sample }) }
            ?: throw IllegalStateException("이미지 형식 오류")
        val scale = maxSide.toFloat() / max(raw.width, raw.height)
        return if (scale < 1f) Bitmap.createScaledBitmap(raw, (raw.width * scale).toInt(), (raw.height * scale).toInt(), true) else raw
    }

    // ---------- 자동 콜백 ON / OFF ----------
    private fun tryEnable() {
        if (missingCorePerms().isNotEmpty() || missingNotificationPerm()) {
            pendingEnable = true; permLauncher.launch(requiredPerms); return
        }
        enable()
    }

    private fun enable() {
        CallbackProcessor.seedExistingCalls(this)
        Prefs.setEnabled(this, true)
        CallMonitorService.start(this)
        renderAuto()
        if (!isIgnoringBattery()) {
            AlertDialog.Builder(this)
                .setTitle("배터리 최적화 예외")
                .setMessage("폰이 절전 중에도 자동 콜백이 꺼지지 않도록 '배터리 사용량 최적화 중지'를 허용해 주세요.")
                .setPositiveButton("허용하러 가기") { _, _ -> requestBatteryExemption() }
                .setNegativeButton("나중에", null).show()
        } else toast("🤖 자동 콜백 시작!", "ok")
    }

    private fun disable() {
        Prefs.setEnabled(this, false)
        CallMonitorService.stop(this)
        renderAuto()
        toast("자동 콜백 꺼짐")
    }

    // ---------- 권한 / 배터리 ----------
    private fun has(p: String) = ContextCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED

    private fun missingCorePerms(): List<String> = listOf(
        Manifest.permission.READ_PHONE_STATE, Manifest.permission.READ_CALL_LOG, Manifest.permission.SEND_SMS
    ).filter { !has(it) }

    private fun missingNotificationPerm(): Boolean =
        Build.VERSION.SDK_INT >= 33 && !has(Manifest.permission.POST_NOTIFICATIONS)

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

    private fun showRestrictedHelp() {
        AlertDialog.Builder(this)
            .setTitle("권한이 허용되지 않았어요")
            .setMessage(
                "권한 창이 안 뜨거나 회색으로 막혀 있으면:\n\n" +
                    "1) 아래 '앱 정보 열기'를 누르세요\n" +
                    "2) 오른쪽 위 ⋮ 메뉴 → '제한된 설정 허용'\n" +
                    "3) 권한 → 전화, 통화 기록, SMS 모두 '허용'\n\n" +
                    "그 다음 이 앱으로 돌아와 다시 눌러 주세요."
            )
            .setPositiveButton("앱 정보 열기") { _, _ -> openAppSettings() }
            .setNegativeButton("닫기", null).show()
    }

    private fun ago(ts: Long): String {
        val s = (System.currentTimeMillis() - ts) / 1000
        return when {
            s < 60 -> "방금 전"
            s < 3600 -> "${s / 60}분 전"
            s < 86400 -> "${s / 3600}시간 전"
            s < 86400 * 30 -> "${s / 86400}일 전"
            else -> SimpleDateFormat("yyyy-MM-dd", Locale.KOREA).format(Date(ts))
        }
    }
}
