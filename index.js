const fs = require("fs");
const path = require("path");
const Module = require("module");
const { app } = require("electron");

// ---- Shim app.getVersion to strip fourth semver digit ----
const originalGetVersion = app.getVersion;
app.getVersion = () => {
  const raw = originalGetVersion.call(app);
  return raw.split(".").slice(0, 3).join(".");
};

// ---- Runtime patch for env.js ----
const asarPath = path.join(__dirname, "..", "app-original.asar");
const envJsPath = path.join(asarPath, "build", "env.js");

let customHost = null;
const instanceOverrideFile = path.join(__dirname, "instance.txt");

if (fs.existsSync(instanceOverrideFile)) {
  try {
    const content = fs.readFileSync(instanceOverrideFile, "utf8").trim();
    if (content.length > 0) {
      customHost = content;
    }
  } catch (err) {
    console.warn("Failed to read instance.txt:", err);
  }
}

const originalJsLoader = Module._extensions[".js"];
Module._extensions[".js"] = function (module, filename) {
  if (filename === envJsPath && customHost) {
    let content = fs.readFileSync(filename, "utf8");
    content = content.replace(
      /https:\/\/app\.getoutline\.com/g,
      customHost
    );
    return module._compile(content, filename);
  }
  return originalJsLoader(module, filename);
};

// ---- Launch original app ----
require(asarPath);