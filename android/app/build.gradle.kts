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

/* One version number for the whole app, not two kept in sync by hand.
 *
 * versionName used to be hand-edited here, completely independent of
 * package.json's version — which is what CLAUDE.md actually requires
 * bumping on every change. The two only ever matched by coincidence, and
 * cutting an Android release meant remembering to update this file too.
 * Reading package.json directly makes that impossible to forget.
 *
 * versionCode still has to be its own thing: Play requires a plain
 * ever-increasing integer, not a semver string. Deriving it from the same
 * version (major*1_000_000 + minor*1_000 + patch) means it never needs
 * separate upkeep either, as long as no version component ever reaches
 * 1000 — true for any version this app will realistically reach. */
val appVersion = Regex(""""version"\s*:\s*"([^"]+)"""")
    .find(rootProject.file("../package.json").readText())
    ?.groupValues?.get(1)
    ?: error("Could not read \"version\" from package.json")
val (appVersionMajor, appVersionMinor, appVersionPatch) = appVersion.split(".").map { it.toInt() }
val appVersionCode = appVersionMajor * 1_000_000 + appVersionMinor * 1_000 + appVersionPatch

android {
    namespace = "np.com.bimeshpoudel.lekh"
    compileSdk = 36

    defaultConfig {
        applicationId = "np.com.bimeshpoudel.lekh"
        // 26 (Oreo) is the floor because the date logic uses java.time.
        minSdk = 26
        targetSdk = 36
        versionCode = appVersionCode
        versionName = appVersion

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
