({
  freeSpace: (function(_this) {
    return function(done) {
      if (_this.options.downloadMode === 'telemetry') {
        return done(false, true);
      }
      return disk.check(pathRoot(_this.options.outputFolder), function(error, info) {
        var megabytes_free;
        if (error) {
          return done(error);
        }
        megabytes_free = Math.floor(info.available / 1024 / 1000);
        return done(false, megabytes_free >= 100);
      });
    };
  })(this)
});
