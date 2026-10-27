package kr.co.linkclean.callback

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.widget.Toast

/** 업데이트 설치 결과 – 확인이 필요하면 시스템 '업데이트하시겠습니까?' 창을 띄움 */
class InstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.getIntExtra(PackageInstaller.EXTRA_STATUS, -999)) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm: Intent? = if (Build.VERSION.SDK_INT >= 33)
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                else @Suppress("DEPRECATION") intent.getParcelableExtra(Intent.EXTRA_INTENT)
                confirm?.let {
                    it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    try { context.startActivity(it) } catch (_: Exception) { }
                }
            }
            PackageInstaller.STATUS_SUCCESS -> { /* 새 버전으로 교체됨 – BootReceiver(MY_PACKAGE_REPLACED)가 서비스 재시작 */ }
            PackageInstaller.STATUS_FAILURE_ABORTED -> Toast.makeText(context, "업데이트를 취소했어요", Toast.LENGTH_SHORT).show()
            else -> Toast.makeText(context, "업데이트 실패: " + (intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE) ?: ""), Toast.LENGTH_LONG).show()
        }
    }
}
