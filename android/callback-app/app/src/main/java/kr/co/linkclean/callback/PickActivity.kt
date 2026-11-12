package kr.co.linkclean.callback

import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity

/** 알림을 눌렀을 때 뜨는 '어떤 문자 보낼까요?' 창 */
class PickActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val num = intent.getStringExtra(CallPicker.EXTRA_NUM) ?: run { finish(); return }
        if (!CallPicker.isPending(this, num)) { finish(); return }
        val ui = Ui(this)
        val col = ui.col().apply { setPadding(ui.dp(20), ui.dp(20), ui.dp(20), ui.dp(16)); setBackgroundColor(Col.WHITE) }
        col.addView(ui.text("📞 ${PhoneUtil.pretty(num)}", 20f, Col.S900, true))
        col.addView(ui.text("통화한 내용에 맞는 문자를 골라 주세요", 14f, Col.S500), ui.lp(top = 2, bottom = 14))
        CallPicker.CHOICES.chunked(2).forEach { pair ->
            val r = ui.row()
            pair.forEachIndexed { i, (tid, label) ->
                val icon = Templates.find(this, tid)?.icon ?: "💬"
                r.addView(ui.button("$icon\n$label", Col.B50, Col.B800, 84, 17f, Col.B200) { pick(num, tid) },
                    ui.lp(0, ui.WRAP, 1f, end = if (i == 0) 8 else 0))
            }
            col.addView(r, ui.lp(bottom = 8))
        }
        col.addView(ui.button("🌟 기본 문자 보내기", Col.B600, Col.WHITE, 54, 16f) { pick(num, "") }, ui.lp(top = 4, bottom = 6))
        col.addView(ui.button("안 보내기", Col.S100, Col.S500, 46, 15f) { pick(num, "-") }, ui.lp())
        col.gravity = Gravity.CENTER_HORIZONTAL
        setContentView(col, LinearLayout.LayoutParams(resources.displayMetrics.widthPixels * 9 / 10, LinearLayout.LayoutParams.WRAP_CONTENT))
    }

    private fun pick(num: String, tpl: String) {
        CallPicker.choose(this, num, tpl)
        android.widget.Toast.makeText(this, if (tpl == "-") "안 보내요" else "✅ 보냈어요", android.widget.Toast.LENGTH_SHORT).show()
        finish()
    }
}
