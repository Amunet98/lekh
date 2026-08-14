/**
 * The Android package id, on its own with no DOM-typed imports.
 *
 * vite.config.ts needs this value for the manifest's related_applications
 * entry, and vite.config.ts type-checks under tsconfig.node.json, which has
 * no DOM lib — importing anything from androidApp.ts there would pull in
 * matchMedia/document/navigator references and fail that build. This file
 * exists purely so both sides can import one constant without that clash.
 *
 * Must match applicationId in android/app/build.gradle.kts.
 */
export const ANDROID_PACKAGE = 'np.com.bimeshpoudel.lekh'
