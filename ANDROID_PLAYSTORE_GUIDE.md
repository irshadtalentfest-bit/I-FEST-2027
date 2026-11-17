# I-FEST 2027 - Android & Google Play Store Build Guide (Capacitor)

This project is pre-configured with **PWA** (`vite-plugin-pwa`) and **Capacitor** (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) so you can compile and package it into a signed Android `.apk` or `.aab` bundle for Google Play Store publication.

## 1. Build & Sync Web Bundle to Android
Run the following commands locally after cloning/exporting the project:

```bash
npm install
npm run build
npm run cap:add:android   # Run once to generate the /android native project folder
npm run cap:sync          # Copies dist/ build into android/app/src/main/assets/public
```

## 2. Configure Android Permissions (`android/app/src/main/AndroidManifest.xml`)
For file/poster/media downloads on Android devices, add storage & internet permissions inside `<manifest>` in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
```

## 3. Generate Signed `.aab` Bundle for Google Play Store
1. Open the native Android project in **Android Studio**:
   ```bash
   npm run cap:open
   ```
2. Go to **Build -> Generate Signed Bundle / APK...**
3. Choose **Android App Bundle (.aab)** (required by Google Play Store).
4. Create or select your release Keystore (`.jks`) and build the **release** variant.
5. Upload the resulting `app-release.aab` to the **Google Play Console**.
