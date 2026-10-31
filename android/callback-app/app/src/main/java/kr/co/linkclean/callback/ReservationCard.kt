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
        cv.drawText("계약금 입금 계좌", 110f, 1198f, p(0xFF92400E.toInt(), 34f, true))
        cv.drawText("토스뱅크 1000-1626-3066", 110f, 1258f, p(0xFF0F172A.toInt(), 46f, true))
        cv.drawText("예금주 한승우", W - 110f, 1258f, p(0xFF475569.toInt(), 36f, true, Paint.Align.RIGHT))

        cv.drawText("입금 확인 후 예약이 확정됩니다", W / 2f, 1345f, p(0xFF334155.toInt(), 34f, true, Paint.Align.CENTER))
        cv.drawText("정확한 주소(동·호수)를 문자로 남겨주세요 · 064-763-4545", W / 2f, 1400f, p(0xFF64748B.toInt(), 30f, true, Paint.Align.CENTER))
        return bmp
    }

    fun jpeg(c: Context, f: Map<String, String>): ByteArray {
        val bos = ByteArrayOutputStream()
        render(c, f).compress(Bitmap.CompressFormat.JPEG, 85, bos)
        return bos.toByteArray()
    }
}
