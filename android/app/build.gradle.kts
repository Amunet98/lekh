plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "np.com.bimeshpoudel.lekh"
    compileSdk = 35

    defaultConfig {
        applicationId = "np.com.bimeshpoudel.lekh"
        // 26 (Oreo) is the floor because the date logic uses java.time.
        // desugaring could lower it, but a calendar widget on Android 7 is not
        // worth the build complexity.
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    // Nothing. The widget is RemoteViews, org.json and java.time — all of
    // which are in the platform. Adding androidx here would buy nothing and
    // cost APK size on a two-screen app.
}
