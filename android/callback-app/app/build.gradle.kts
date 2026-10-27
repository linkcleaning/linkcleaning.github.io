plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val ksFile = file("release.jks")
// 개인용 사이드로드 앱 – 업데이트 설치가 끊기지 않도록 고정 서명키 사용
val ksPass: String = System.getenv("KS_PASS") ?: "Llf4gi2Mn1MrsUbAR9_RxEub"

android {
    namespace = "kr.co.linkclean.callback"
    compileSdk = 35

    defaultConfig {
        applicationId = "kr.co.linkclean.callback"
        minSdk = 26
        targetSdk = 34
        versionCode = (System.getenv("VERSION_CODE") ?: "1").toInt()
        versionName = "1.0." + (System.getenv("VERSION_CODE") ?: "1")
    }

    signingConfigs {
        create("release") {
            storeFile = ksFile
            storePassword = ksPass
            keyAlias = "linkclean"
            keyPassword = ksPass
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (ksFile.exists() && ksPass.isNotEmpty())
                signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
}
