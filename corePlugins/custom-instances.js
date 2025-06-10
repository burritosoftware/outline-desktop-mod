module.exports = ({ registerJsPatch, asarPath, fs, path }) => {
  const envPath = path.join("build", "env.js");      // relative to asar
  const overrideFile = path.join(__dirname, "..", "instance.txt");

  let customHost = null;
  if (fs.existsSync(overrideFile)) {
    customHost = fs.readFileSync(overrideFile, "utf8").trim() || null;
  }

  if (!customHost) return;   // nothing to do

  registerJsPatch(envPath, (code) =>
    code.replace(/https:\/\/app\.getoutline\.com/g, customHost)
  );
};
