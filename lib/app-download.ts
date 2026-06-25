// Android companion app download — hosted as a GitHub Release asset on the
// public Realdiamond/smart-care-app repo (Supabase Free caps uploads at 50MB).
// Upload the built APK to the latest release named exactly "smart-care.apk".
// "releases/latest/download/..." always points at the newest release's asset.
export const APK_DOWNLOAD_URL =
  "https://github.com/Realdiamond/smart-care-app/releases/latest/download/smart-care.apk";

// Latest published app version. Bump when you ship a new APK so the banner /
// "update available" checks can compare against it later.
export const LATEST_APP_VERSION = "1.0.0";
