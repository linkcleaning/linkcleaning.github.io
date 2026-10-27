package kr.co.linkclean.callback

import java.io.ByteArrayOutputStream

/**
 * MMS 'M-Send.req' PDU 인코더 (OMA MMS Encapsulation 1.2 / WAP-230 WSP).
 * SmsManager.sendMultimediaMessage()에 넘길 바이너리를 직접 만든다.
 * 구성: SMIL + 이미지 0~3장 + 텍스트  → multipart/related
 */
object MmsPdu {

    fun build(to: String, subject: String, text: String, images: List<ByteArray>): ByteArray {
        val out = ByteArrayOutputStream()

        // ---- 헤더 (앞 3개는 순서 고정) ----
        out.write(0x8C); out.write(0x80)                              // X-Mms-Message-Type: m-send-req
        out.write(0x98); writeText(out, "T" + java.lang.Long.toHexString(System.currentTimeMillis())) // Transaction-Id
        out.write(0x8D); out.write(0x92)                              // X-Mms-MMS-Version: 1.2
        out.write(0x89); out.write(0x01); out.write(0x81)             // From: insert-address-token
        out.write(0x97); writeText(out, "$to/TYPE=PLMN")              // To
        if (subject.isNotBlank()) { out.write(0x96); writeEncodedUtf8(out, subject) } // Subject
        out.write(0x8A); out.write(0x80)                              // Message-Class: personal
        out.write(0x8F); out.write(0x81)                              // Priority: normal
        out.write(0x86); out.write(0x81)                              // Delivery-Report: no
        out.write(0x90); out.write(0x81)                              // Read-Report: no

        // Content-Type: application/vnd.wap.multipart.related; start=<smil>; type=application/smil
        out.write(0x84)
        val ct = ByteArrayOutputStream()
        ct.write(0xB3)
        ct.write(0x8A); writeText(ct, "<smil>")
        ct.write(0x89); writeText(ct, "application/smil")
        writeValueLength(out, ct.size()); ct.writeTo(out)

        // ---- 본문 (multipart) ----
        val parts = mutableListOf<Part>()
        parts.add(smilPart(images.size))
        images.forEachIndexed { i, img -> parts.add(imagePart(img, i)) }
        parts.add(textPart(text))

        writeUintvar(out, parts.size)
        for (p in parts) {
            writeUintvar(out, p.headers.size)
            writeUintvar(out, p.data.size)
            out.write(p.headers)
            out.write(p.data)
        }
        return out.toByteArray()
    }

    private class Part(val headers: ByteArray, val data: ByteArray)

    private fun partHeaders(contentType: ByteArray, cid: String, location: String): ByteArray {
        val h = ByteArrayOutputStream()
        h.write(contentType)
        h.write(0xC0); h.write(0x22); h.write("<$cid>".toByteArray(Charsets.US_ASCII)); h.write(0) // Content-ID
        h.write(0x8E); writeText(h, location)                                                       // Content-Location
        return h.toByteArray()
    }

    private fun smilPart(imageCount: Int): Part {
        val sb = StringBuilder()
        sb.append("<smil><head><layout><root-layout/>")
        sb.append("<region id=\"Image\" fit=\"meet\" top=\"0\" left=\"0\" height=\"80%\" width=\"100%\"/>")
        sb.append("<region id=\"Text\" top=\"80%\" left=\"0\" height=\"20%\" width=\"100%\"/>")
        sb.append("</layout></head><body>")
        for (i in 0 until imageCount) {
            sb.append("<par dur=\"5000ms\"><img src=\"image$i.jpg\" region=\"Image\"/></par>")
        }
        sb.append("<par dur=\"5000ms\"><text src=\"text.txt\" region=\"Text\"/></par>")
        sb.append("</body></smil>")
        val ct = ByteArrayOutputStream().also { writeText(it, "application/smil") }.toByteArray()
        return Part(partHeaders(ct, "smil", "smil.xml"), sb.toString().toByteArray(Charsets.UTF_8))
    }

    private fun imagePart(image: ByteArray, index: Int): Part {
        val name = "image$index.jpg"
        val inner = ByteArrayOutputStream()
        inner.write(0x9E)                     // image/jpeg
        inner.write(0x85); writeText(inner, name) // Name
        val ct = ByteArrayOutputStream()
        writeValueLength(ct, inner.size()); inner.writeTo(ct)
        return Part(partHeaders(ct.toByteArray(), "image$index", name), image)
    }

    private fun textPart(text: String): Part {
        // text/plain; charset=utf-8
        val ct = byteArrayOf(0x03, 0x83.toByte(), 0x81.toByte(), 0xEA.toByte())
        return Part(partHeaders(ct, "text", "text.txt"), text.toByteArray(Charsets.UTF_8))
    }

    // ---------- WSP 기본 인코딩 ----------
    private fun writeText(o: ByteArrayOutputStream, s: String) {
        val b = s.toByteArray(Charsets.UTF_8)
        if (b.isNotEmpty() && (b[0].toInt() and 0xFF) >= 0x80) o.write(0x7F) // Quote
        o.write(b); o.write(0)
    }

    private fun writeEncodedUtf8(o: ByteArrayOutputStream, s: String) {
        val inner = ByteArrayOutputStream()
        inner.write(0xEA) // charset utf-8 (106)
        writeText(inner, s)
        writeValueLength(o, inner.size()); inner.writeTo(o)
    }

    private fun writeValueLength(o: ByteArrayOutputStream, len: Int) {
        if (len <= 30) o.write(len) else { o.write(0x1F); writeUintvar(o, len) }
    }

    private fun writeUintvar(o: ByteArrayOutputStream, value: Int) {
        var v = value
        val bytes = ArrayList<Int>()
        bytes.add(v and 0x7F); v = v ushr 7
        while (v > 0) { bytes.add((v and 0x7F) or 0x80); v = v ushr 7 }
        for (i in bytes.indices.reversed()) o.write(bytes[i])
    }
}
