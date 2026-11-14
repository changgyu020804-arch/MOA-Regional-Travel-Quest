plugins {
    alias(libs.plugins.android.application)
}

android {
    useLibrary("android.car", false)
    namespace = "com.example.drivequest"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = "com.example.drivequest"
        minSdk = 28
        targetSdk = 34
        versionCode = 1
        versionName = "1.0-demo"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            optimization {
                enable = false
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
}

dependencies {
    implementation(libs.androidx.webkit)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(libs.androidx.junit)
}
