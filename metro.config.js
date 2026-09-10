const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

const isCiExport = process.env.CI === "1" || process.env.RAILWAY_ENVIRONMENT;

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Dev: write CSS to disk (helps iOS). CI/Railway: virtual modules so Metro
  // does not SHA-1 a cache file that does not exist yet (web.css).
  forceWriteFileSystem: !isCiExport,
});
