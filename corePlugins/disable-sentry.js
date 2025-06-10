module.exports = ({ Module }) => {
  const load = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "@sentry/electron") {
      // one stub fits all
      return { init() {}, captureException() {}, captureMessage() {} };
    }
    return load(request, parent, isMain);
  };
};