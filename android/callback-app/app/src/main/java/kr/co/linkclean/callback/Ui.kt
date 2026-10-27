package kr.co.linkclean.callback

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.graphics.drawable.StateListDrawable
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import android.widget.CheckBox
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView

/** 웹앱(Tailwind)과 같은 색상표 */
object Col {
    const val WHITE = 0xFFFFFFFF.toInt()
    const val B50 = 0xFFF0F9FF.toInt()
    const val B100 = 0xFFE0F2FE.toInt()
    const val B200 = 0xFFBAE6FD.toInt()
    const val B300 = 0xFF7DD3FC.toInt()
    const val B500 = 0xFF0EA5E9.toInt()
    const val B600 = 0xFF0284C7.toInt()
    const val B700 = 0xFF0369A1.toInt()
    const val B800 = 0xFF075985.toInt()
    const val B900 = 0xFF0C4A6E.toInt()
    const val S50 = 0xFFF8FAFC.toInt()
    const val S100 = 0xFFF1F5F9.toInt()
    const val S200 = 0xFFE2E8F0.toInt()
    const val S300 = 0xFFCBD5E1.toInt()
    const val S400 = 0xFF94A3B8.toInt()
    const val S500 = 0xFF64748B.toInt()
    const val S600 = 0xFF475569.toInt()
    const val S700 = 0xFF334155.toInt()
    const val S800 = 0xFF1E293B.toInt()
    const val S900 = 0xFF0F172A.toInt()
    const val GREEN = 0xFF059669.toInt()
    const val GREEN50 = 0xFFECFDF5.toInt()
    const val GREEN700 = 0xFF047857.toInt()
    const val RED = 0xFFDC2626.toInt()
    const val RED50 = 0xFFFEF2F2.toInt()
    const val RED700 = 0xFFB91C1C.toInt()
    const val AMBER300 = 0xFFFCD34D.toInt()
    const val AMBER50 = 0xFFFFFBEB.toInt()
    const val AMBER800 = 0xFF92400E.toInt()
    const val SKY = 0xFF0EA5E9.toInt()
    const val CYAN = 0xFF06B6D4.toInt()

    /** 통화 구분 배지 색 (글자색, 배경색) */
    fun kind(k: String): Pair<Int, Int> = when (k) {
        "수신" -> B700 to B50
        "발신" -> GREEN700 to GREEN50
        "부재중" -> RED to RED50
        else -> S600 to S100
    }
}

class Ui(private val ctx: Context) {
    private val density = ctx.resources.displayMetrics.density
    val MATCH = ViewGroup.LayoutParams.MATCH_PARENT
    val WRAP = ViewGroup.LayoutParams.WRAP_CONTENT

    fun dp(v: Number): Int = (v.toFloat() * density).toInt()

    fun rect(color: Int, radius: Float, stroke: Int = 0, strokeW: Float = 1f, dashed: Boolean = false) =
        GradientDrawable().apply {
            setColor(color)
            cornerRadius = dp(radius).toFloat()
            if (stroke != 0) {
                if (dashed) setStroke(dp(strokeW), stroke, dp(7).toFloat(), dp(5).toFloat())
                else setStroke(dp(strokeW), stroke)
            }
        }

    fun ripple(bg: Drawable): Drawable = RippleDrawable(ColorStateList.valueOf(0x22000000), bg, null)

    fun lp(w: Int = MATCH, h: Int = WRAP, weight: Float = 0f, top: Int = 0, bottom: Int = 0, start: Int = 0, end: Int = 0) =
        LinearLayout.LayoutParams(w, h, weight).apply {
            topMargin = dp(top); bottomMargin = dp(bottom); marginStart = dp(start); marginEnd = dp(end)
        }

    fun col(): LinearLayout = LinearLayout(ctx).apply { orientation = LinearLayout.VERTICAL }
    fun row(): LinearLayout = LinearLayout(ctx).apply {
        orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL
    }

    fun text(s: CharSequence, size: Float = 15f, color: Int = Col.S800, bold: Boolean = false): TextView =
        TextView(ctx).apply {
            text = s
            setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
            setTextColor(color)
            if (bold) typeface = Typeface.DEFAULT_BOLD
            setLineSpacing(0f, 1.18f)
        }

    /** 흰색 둥근 카드 (rounded-3xl ring-1) */
    fun card(ring: Int = Col.S200, ringW: Float = 1f, bg: Int = Col.WHITE): LinearLayout = col().apply {
        background = rect(bg, 24f, ring, ringW)
        setPadding(dp(16), dp(16), dp(16), dp(16))
        layoutParams = lp(bottom = 14)
    }

    fun button(
        s: CharSequence, bg: Int, fg: Int, h: Int = 56, size: Float = 17f, stroke: Int = 0,
        radius: Float = 16f, dashed: Boolean = false, onClick: () -> Unit
    ): TextView = text(s, size, fg, true).apply {
        gravity = Gravity.CENTER
        background = ripple(rect(bg, radius, stroke, 2f, dashed))
        minHeight = dp(h)
        setPadding(dp(10), dp(6), dp(10), dp(6))
        isClickable = true; isFocusable = true
        setOnClickListener { onClick() }
    }

    fun gradientButton(s: CharSequence, from: Int, to: Int, h: Int = 60, size: Float = 17f, onClick: () -> Unit): TextView =
        text(s, size, Col.WHITE, true).apply {
            gravity = Gravity.CENTER
            background = ripple(GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT, intArrayOf(from, to)).apply {
                cornerRadius = dp(16).toFloat()
            })
            minHeight = dp(h)
            setPadding(dp(8), dp(6), dp(8), dp(6))
            isClickable = true
            setOnClickListener { onClick() }
        }

    fun input(hint: String, big: Boolean = false, multi: Boolean = false, type: Int = InputType.TYPE_CLASS_TEXT): EditText =
        EditText(ctx).apply {
            this.hint = hint
            setHintTextColor(Col.S300)
            setTextColor(Col.S900)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, if (big) 26f else 17f)
            if (big) typeface = Typeface.DEFAULT_BOLD
            inputType = if (multi) InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE else type
            if (multi) { gravity = Gravity.TOP or Gravity.START; setLineSpacing(0f, 1.25f) }
            background = StateListDrawable().apply {
                addState(intArrayOf(android.R.attr.state_focused), rect(Col.WHITE, 16f, Col.B500, 2f))
                addState(intArrayOf(), rect(Col.S50, 16f, Col.S200, 2f))
            }
            setPadding(dp(14), dp(12), dp(14), dp(12))
            minHeight = dp(if (big) 64 else 48)
        }

    fun check(label: String, checked: Boolean, onChange: (Boolean) -> Unit): CheckBox = CheckBox(ctx).apply {
        text = label
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 15f)
        setTextColor(Col.S700)
        typeface = Typeface.DEFAULT_BOLD
        isChecked = checked
        buttonTintList = ColorStateList.valueOf(Col.B600)
        setOnCheckedChangeListener { _, b -> onChange(b) }
    }

    /** 작은 배지 */
    fun badge(s: String, fg: Int, bg: Int): TextView = text(s, 12f, fg, true).apply {
        background = rect(bg, 8f)
        setPadding(dp(8), dp(3), dp(8), dp(3))
    }
}

fun watcher(after: (String) -> Unit) = object : TextWatcher {
    override fun beforeTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
    override fun onTextChanged(s: CharSequence?, a: Int, b: Int, c: Int) {}
    override fun afterTextChanged(s: Editable?) = after(s?.toString() ?: "")
}
