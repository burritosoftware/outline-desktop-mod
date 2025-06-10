const fs      = require("fs");
const path    = require("path");
const Module  = require("module");
const { app } = require("electron");

/* Version Shim to fix loading */
const originalGetVersion = app.getVersion;
app.getVersion = () => originalGetVersion.call(app).split(".").slice(0, 3).join(".");

/* Constants */
const asarPath        = path.join(__dirname, "..", "app-original.asar");
const pluginsDir      = path.join(__dirname, "plugins");
const originalJsLoad  = Module._extensions[".js"];

/* Patch registry */
const jsPatches = new Map();      // absolutePath  →  [transformFn, …]

function registerJsPatch(relPathInsideAsar, transform) {
  const absPath = path.join(asarPath, relPathInsideAsar);
  if (!jsPatches.has(absPath)) jsPatches.set(absPath, []);
  jsPatches.get(absPath).push(transform);
}

/* Module interceptor */
Module._extensions[".js"] = function (module, filename) {
  const transforms = jsPatches.get(filename);
  if (transforms && transforms.length) {
    let code = fs.readFileSync(filename, "utf8");
    for (const fn of transforms) code = fn(code, filename);
    return module._compile(code, filename);
  }
  return originalJsLoad(module, filename);
};

/* Plugin API */
function buildAPI(tag) {
  return { registerJsPatch, fs, path, Module, app, asarPath, log: makeLogger(tag) };
}

/* Helper: scoped logger  */
function makeLogger(tag) {
  return {
    log : (...a) => console.log (`[${tag}]`, ...a),
    info: (...a) => console.info(`[${tag}]`, ...a),
    warn: (...a) => console.warn(`[${tag}]`, ...a),
    error:(...a) => console.error(`[${tag}]`, ...a),
  };
}

/* Plugin Loader */
function loadDir(dir, tag = "Plugin") {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".js")) continue;
    try {
      const full = path.join(dir, file);
      require(full)(buildAPI(file));
      console.log(`[${tag}] Loaded`, file);
    } catch (err) {
      console.warn(`[${tag}] Failed`, file, err);
    }
  }
}
const librariesDir = path.join(__dirname, "libraries");
const corePluginsDir = path.join(__dirname, "corePlugins");
loadDir(librariesDir, "Library"); // ← menus-utils & friends
loadDir(corePluginsDir, "Core");    // ← open-devtools & other system patches
loadDir(pluginsDir, "Plugin");      // ← user plug-ins

/* Start Outline */
require(asarPath);
