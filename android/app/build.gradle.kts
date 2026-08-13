import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/* Signing config comes from keystore.properties, which is gitignored and
 * points at a keystore kept outside the repo. Absent it, release builds are
 * simply unsigned rather than failing — so a fresh clone can still run
 * `assembleDebug` without any secrets. */
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) keystorePropsFile.inputStream().use { load(it) }
}

android {
    namespace = "np.com.bimeshpoudel.lekh"
    compileSdk = 35

    defaultConfig {
        applicationId = "np.com.bimeshpoudel.lekh"
        // 26 (Oreo) is the floor because the date logic uses java.time.
        minSdk = 26
        targetSdk = 35
        /* versionCode must increase for Android to accept an update over an
           installed copy; versionName is what humans read. */
        versionCode = 6
        versionName = "1.4.1"

        /* The URL the Trusted Web Activity opens, injected into the manifest so
         * it is stated once. It must be the same origin as the assetlinks.json
         * that verifies this app, or Chrome shows its address bar instead of
         * running full-screen. */
        manifestPlaceholders["twaUrl"] = "https://lekh-gamma.vercel.app/"
        manifestPlaceholders["twaHost"] = "lekh-gamma.vercel.app"
    }

    signingConfigs {
        if (keystoreProps.isNotEmpty()) {
            create("release") {
                storeFile = file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (keystoreProps.isNotEmpty()) {
                signingConfig = signingConfigs.getByName("release")
            }
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
    /* The only dependency, and it is what makes this one install instead of
     * two. androidbrowserhelper provides the Trusted Web Activity launcher:
     * the app opens Lekh full-screen in the user's Chrome, with no address bar
     * once the domain is verified — so a single APK carries both the app and
     * the home-screen widget. The widget itself still uses nothing but the
     * platform. */
    implementation("com.google.androidbrowserhelper:androidbrowserhelper:2.5.0")
}
