package kr.co.linkclean.callback

import android.content.Context
import android.graphics.*
import java.io.ByteArrayOutputStream

/** 예약 확정 안내 카드 이미지 (사진문자로 함께 보냄) */
object ReservationCard {
    private const val W = 1080
    private const val H = 1430

    fun render(c: Context, f: Map<String, String>): Bitmap {
        val bmp = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
        val cv = Canvas(bmp)
        val bold = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        fun p(color: Int, size: Float, b: Boolean = true, align: Paint.Align = Paint.Align.LEFT) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color; textSize = size; typeface = if (b) bold else Typeface.DEFAULT; textAlign = align
        }

        // 배경
        cv.drawColor(0xFFF1F5F9.toInt())
        // 상단 파란 헤더
        val head = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(0f, 0f, W.toFloat(), 420f, 0xFF0369A1.toInt(), 0xFF0EA5E9.toInt(), Shader.TileMode.CLAMP)
        }
        cv.drawRect(0f, 0f, W.toFloat(), 430f, head)

        // 로고 (흰 원)
        val logo = BitmapFactory.decodeResource(c.resources, R.drawable.logo_sm)
        val lr = 92f; val lx = W / 2f; val ly = 150f
        cv.drawCircle(lx, ly, lr + 8, p(Color.WHITE, 1f))
        if (logo != null) {
            val path = Path().apply { addCircle(lx, ly, lr, Path.Direction.CW) }
            cv.save(); cv.clipPath(path)
            cv.drawBitmap(logo, null, RectF(lx - lr, ly - lr, lx + lr, ly + lr), Paint(Paint.FILTER_BITMAP_FLAG))
            cv.restore()
        }
        cv.drawText("제주 청소 전문 링크클린", W / 2f, 312f, p(0xFFE0F2FE.toInt(), 38f, true, Paint.Align.CENTER))
        cv.drawText("예약 확정 안내", W / 2f, 386f, p(Color.WHITE, 64f, true, Paint.Align.CENTER))

        // 흰 카드
        val card = RectF(60f, 470f, W - 60f, 1110f)
        cv.drawRoundRect(card, 40f, 40f, p(Color.WHITE, 1f))
        val rows = listOf(
            "청소하는 날" to Compose.fieldText("청소날짜", f),
            "도착 시간" to Compose.fieldText("도착시간", f).let { if (it.isEmpty()) "" else "${it}경" },
            "청소 비용" to Compose.fieldText("청소비용", f),
            "계약금" to Compose.fieldText("계약금", f),
            "잔금 (청소 후)" to Compose.fieldText("잔금", f)
        ).filter { it.second.isNotEmpty() }
        var y = 560f
        val labelP = p(0xFF64748B.toInt(), 38f, true)
        val valueP = p(0xFF0F172A.toInt(), 46f, true, Paint.Align.RIGHT)
        val line = p(0xFFE2E8F0.toInt(), 1f).apply { strokeWidth = 3f }
        rows.forEachIndexed { i, (k, v) ->
            if (i > 0) cv.drawLine(110f, y - 62f, W - 110f, y - 62f, line)
            cv.drawText(k, 110f, y, labelP)
            val vp = if (k == "계약금") p(0xFF0369A1.toInt(), 50f, true, Paint.Align.RIGHT) else valueP
            cv.drawText(v, W - 110f, y, vp)
            y += 108f
        }

        // 입금 계좌 박스
        val box = RectF(60f, 1140f, W - 60f, 1290f)
        cv.drawRoundRect(box, 32f, 32f, p(0xFFFFFBEB.toInt(), 1f))
        cv.drawRoundRect(box, 32f, 32f, p(0xFFFCD34D.toInt(), 1f).apply { style = Paint.Style.STROKE; strokeWidth = 4f })
        cv.drawText("계약금 입금 계좌 · 예금주 ${Prefs.accHolder(c)}", 110f, 1198f, p(0xFF92400E.toInt(), 34f, true))
        cv.drawText("${Prefs.accBank(c)} ${Prefs.accNum(c)}", 110f, 1258f, p(0xFF0F172A.toInt(), 46f, true).also { while (it.measureText("${Prefs.accBank(c)} ${Prefs.accNum(c)}") > 860f && it.textSize > 30f) it.textSize -= 2f })

        cv.drawText("입금 확인 후 예약이 확정됩니다", W / 2f, 1345f, p(0xFF334155.toInt(), 34f, true, Paint.Align.CENTER))
        cv.drawText("정확한 주소(동·호수)를 문자로 남겨주세요" + Prefs.accPhone(c).let { if (it.isBlank()) "" else " · $it" }, W / 2f, 1400f, p(0xFF64748B.toInt(), 30f, true, Paint.Align.CENTER))
        return bmp
    }

    fun jpeg(c: Context, f: Map<String, String>): ByteArray {
        val bos = ByteArrayOutputStream()
        render(c, f).compress(Bitmap.CompressFormat.JPEG, 85, bos)
        return bos.toByteArray()
    }

    /** 입금 계좌 안내 카드 – 토스 스타일 (흰 바탕) */
    fun renderAccount(c: Context): Bitmap {
        val W = 1080; val H = 1080
        val bmp = Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888)
        val cv = Canvas(bmp)
        val bold = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
        fun p(color: Int, size: Float, align: Paint.Align = Paint.Align.LEFT) = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            this.color = color; textSize = size; typeface = bold; textAlign = align
        }
        fun fit(paint: Paint, text: String, maxW: Float) { while (paint.measureText(text) > maxW && paint.textSize > 30f) paint.textSize -= 2f }
        val ink = 0xFF191F28.toInt(); val gray = 0xFF8B95A1.toInt(); val sub = 0xFF4E5968.toInt()
        val blue = 0xFF3182F6.toInt(); val box = 0xFFF2F4F6.toInt()
        cv.drawColor(Color.WHITE)

        // 로고 + 상호
        val logo = BitmapFactory.decodeResource(c.resources, R.drawable.logo_sm)
        cv.drawCircle(150f, 150f, 76f, p(box, 1f))
        if (logo != null) {
            cv.save(); cv.clipPath(Path().apply { addCircle(150f, 150f, 70f, Path.Direction.CW) })
            cv.drawBitmap(logo, null, RectF(80f, 80f, 220f, 220f), Paint(Paint.FILTER_BITMAP_FLAG)); cv.restore()
        }
        cv.drawText("링크클린", 250f, 160f, p(ink, 44f))
        cv.drawText("제주 청소 전문", 250f, 208f, p(gray, 30f))

        cv.drawText("입금 계좌 안내", 90f, 385f, p(ink, 56f))

        // 계좌 박스
        cv.drawRoundRect(RectF(90f, 440f, 990f, 800f), 40f, 40f, p(box, 1f))
        val bank = Prefs.accBank(c)
        cv.drawCircle(180f, 530f, 40f, p(blue, 1f))
        val badge = if (bank.contains("토스")) "toss" else bank.take(2)
        val bp = p(Color.WHITE, if (badge == "toss") 26f else 30f, Paint.Align.CENTER)
        cv.drawText(badge, 180f, 530f - (bp.descent() + bp.ascent()) / 2, bp)
        val bankP = p(sub, 40f); cv.drawText(bank, 245f, 530f - (bankP.descent() + bankP.ascent()) / 2, bankP)
        val numP = p(ink, 92f); fit(numP, Prefs.accNum(c), 800f)
        cv.drawText(Prefs.accNum(c), 140f, 700f, numP)
        cv.drawText("예금주  ${Prefs.accHolder(c)}", 140f, 768f, p(sub, 36f))

        // 안내 버튼 모양
        cv.drawRoundRect(RectF(90f, 860f, 990f, 960f), 28f, 28f, p(blue, 1f))
        val btn = p(Color.WHITE, 36f, Paint.Align.CENTER)
        cv.drawText("입금 후 문자 주시면 바로 확인해 드려요", 540f, 910f - (btn.descent() + btn.ascent()) / 2, btn)
        val ph = Prefs.accPhone(c)
        if (ph.isNotBlank()) cv.drawText("문의 $ph", 540f, 1030f, p(gray, 30f, Paint.Align.CENTER))
        return bmp
    }

    fun accountJpeg(c: Context): ByteArray {
        val bos = ByteArrayOutputStream()
        renderAccount(c).compress(Bitmap.CompressFormat.JPEG, 85, bos)
        return bos.toByteArray()
    }
}
