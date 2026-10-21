const { withAndroidManifest } = require("@expo/config-plugins");

const CALL_PERMISSIONS = [
  "android.permission.USE_FULL_SCREEN_INTENT",
  "android.permission.WAKE_LOCK",
  "android.permission.FOREGROUND_SERVICE",
  "android.permission.FOREGROUND_SERVICE_PHONE_CALL",
];

function ensurePermission(manifest, name) {
  const list = manifest.manifest["uses-permission"] ?? [];
  if (!list.some((item) => item.$?.["android:name"] === name)) {
    list.push({ $: { "android:name": name } });
  }
  manifest.manifest["uses-permission"] = list;
}

/** Lets the installed UR app show an incoming-call card over other apps. */
function withIncomingCall(config) {
  return withAndroidManifest(config, (next) => {
    for (const name of CALL_PERMISSIONS) ensurePermission(next.modResults, name);
    return next;
  });
}

module.exports = withIncomingCall;
