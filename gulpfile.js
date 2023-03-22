/*eslint-env node*/
/*eslint no-sync: 0*/

"use strict";

// Every module required-in here must be a `dependency` in package.json, not just a `devDependency`,
// so that our postinstall script (which runs `gulp post-npm-install`) is able to run without
// the devDependencies available.  Individual tasks, other than `post-npm-install` and any tasks it
// calls, may require in `devDependency` modules locally.
var gulp = require("gulp");

gulp.task("build-specs", function (done) {
  var runWebpack = require("./buildprocess/runWebpack.js");
  var webpack = require("webpack");
  var webpackConfig = require("./buildprocess/webpack.config.make.js")(
    false,
    true
  );

  runWebpack(webpack, webpackConfig, done);
});

gulp.task("release-specs", function (done) {
  var runWebpack = require("./buildprocess/runWebpack.js");
  var webpack = require("webpack");
  var webpackConfig = require("./buildprocess/webpack.config.make.js")(
    false,
    false
  );

  runWebpack(webpack, webpackConfig, done);
});

gulp.task("watch-specs", function (done) {
  var watchWebpack = require("./buildprocess/watchWebpack");
  var webpack = require("webpack");
  var webpackConfig = require("./buildprocess/webpack.config.make.js")(
    false,
    true
  );

  watchWebpack(webpack, webpackConfig, done);
});

gulp.task("lint", function (done) {
  var runExternalModule = require("./buildprocess/runExternalModule");

  runExternalModule("eslint/bin/eslint.js", [
    "lib",
    "test",
    "--ext",
    ".jsx",
    "--ext",
    ".js",
    "--ignore-pattern",
    "lib/ThirdParty",
    "--max-warnings",
    "0"
  ]);

  done();
});

gulp.task("reference-guide", function (done) {
  var runExternalModule = require("./buildprocess/runExternalModule");

  runExternalModule("jsdoc/jsdoc.js", [
    "./lib",
    "-c",
    "./buildprocess/jsdoc.json"
  ]);

  done();
});

gulp.task("copy-cesium-assets", function () {
  var path = require("path");

  var cesiumPackage = require.resolve("terriajs-cesium/package.json");
  var cesiumRoot = path.dirname(cesiumPackage);
  var cesiumWebRoot = path.join(cesiumRoot, "wwwroot");

  return gulp
    .src([path.join(cesiumWebRoot, "**")], {
      base: cesiumWebRoot
    })
    .pipe(gulp.dest("wwwroot/build/Cesium"));
});

gulp.task("test-browserstack", function (done) {
  runKarma("./buildprocess/karma-browserstack.conf.js", done);
});

gulp.task("test-saucelabs", function (done) {
  runKarma("./buildprocess/karma-saucelabs.conf.js", done);
});

gulp.task("test-firefox", function (done) {
  runKarma("./buildprocess/karma-firefox.conf.js", done);
});

gulp.task("test-travis", function (done) {
  if (process.env.SAUCE_ACCESS_KEY) {
    runKarma("./buildprocess/karma-saucelabs.conf.js", done);
  } else {
    console.log(
      "SauceLabs testing is not available for pull requests outside the main repo; using local headless Firefox instead."
    );
    runKarma("./buildprocess/karma-firefox.conf.js", done);
  }
});

gulp.task("test", function (done) {
  runKarma("./buildprocess/karma-local.conf.js", done);
});

function runKarma(configFile, done) {
  var karma = require("karma").Server;
  var path = require("path");

  karma.start(
    {
      configFile: path.join(__dirname, configFile)
    },
    function (e) {
      return done(e);
    }
  );
}

gulp.task("code-attribution", function userAttribution(done) {
  var spawnSync = require("child_process").spawnSync;

  var result = spawnSync(
    "yarn",
    ["licenses generate-disclaimer > doc/acknowledgements/attributions.md"],
    {
      stdio: "inherit",
      shell: true
    }
  );
  if (result.status !== 0) {
    throw new Error(
      "Generating code attribution exited with an error.\n" +
        result.stderr.toString(),
      { showStack: false }
    );
  }
  done();
});

gulp.task("build-for-doc-generation", function buildForDocGeneration(done) {
  var runWebpack = require("./buildprocess/runWebpack.js");
  var webpack = require("webpack");
  var webpackConfig = require("./buildprocess/webpack-tools.config.js")();

  runWebpack(webpack, webpackConfig, done);
});

gulp.task(
  "user-guide",
  gulp.series(
    gulp.parallel("code-attribution", "build-for-doc-generation"),
    function userGuide(done) {
      var fse = require("fs-extra");
      var PluginError = require("plugin-error");
      var spawnSync = require("child_process").spawnSync;

      fse.copySync("doc", "build/doc");

      fse.mkdirpSync("build/doc/connecting-to-data/catalog-type-details");

      var result = spawnSync("node", ["generateDocs.js"], {
        cwd: "build",
        stdio: "inherit",
        shell: false
      });

      if (result.status !== 0) {
        throw new PluginError(
          "user-doc",
          "Generating catalog members pages exited with an error.",
          { showStack: false }
        );
      }

      result = spawnSync(
        "mkdocs",
        ["build", "--clean", "--config-file", "mkdocs.yml"],
        {
          cwd: "build",
          stdio: "inherit",
          shell: false
        }
      );
      if (result.status !== 0) {
        throw new PluginError("user-doc", "Mkdocs exited with an error.", {
          showStack: false
        });
      }

      done();
    }
  )
);

gulp.task(
  "docs",
  gulp.series("user-guide", function docs(done) {
    var fse = require("fs-extra");
    fse.copySync("doc/index-built.html", "wwwroot/doc/index.html");
    done();
  })
);

gulp.task("terriajs-server", function (done) {
  // E.g. gulp terriajs-server --terriajsServerArg port=4000 --terriajsServerArg verbose=true
  //  or gulp dev --terriajsServerArg port=3000
  const { spawn } = require("child_process");
  const fs = require("fs");
  const minimist = require("minimist");

  const knownOptions = {
    string: ["terriajsServerArg"],
    default: {
      terriajsServerArg: []
    }
  };
  const options = minimist(process.argv.slice(2), knownOptions);

  const logFile = fs.openSync("./terriajs-server.log", "a");
  const serverArgs = Array.isArray(options.terriajsServerArg)
    ? options.terriajsServerArg
    : [options.terriajsServerArg];
  // Spawn detached - attached does not make terriajs-server
  //  quit when the gulp task is stopped
  const child = spawn(
    "node",
    [
      "./node_modules/.bin/terriajs-server",
      "--port=3002",
      ...serverArgs.map((arg) => `--${arg}`)
    ],
    { detached: true, stdio: ["ignore", logFile, logFile] }
  );
  child.on("exit", (exitCode, signal) => {
    done(
      new Error(
        "terriajs-server quit" +
          (exitCode !== null ? ` with exit code: ${exitCode}` : "") +
          (signal ? ` from signal: ${signal}` : "") +
          "\nCheck terriajs-server.log for more information."
      )
    );
  });
  // Intercept SIGINT, SIGTERM and SIGHUP, cleanup terriajs-server and re-send signal
  // May fail to catch some relevant signals on Windows
  // SIGINT: ctrl+c
  // SIGTERM: kill <pid>
  // SIGHUP: terminal closed
  process.once("SIGINT", () => {
    child.kill("SIGTERM");
    process.kill(process.pid, "SIGINT");
  });
  process.once("SIGTERM", () => {
    child.kill("SIGTERM");
    process.kill(process.pid, "SIGTERM");
  });
  process.once("SIGHUP", () => {
    child.kill("SIGTERM");
    process.kill(process.pid, "SIGHUP");
  });
});

gulp.task("build", gulp.series("copy-cesium-assets", "build-specs"));
gulp.task("release", gulp.series("copy-cesium-assets", "release-specs"));
gulp.task("watch", gulp.series("copy-cesium-assets", "watch-specs"));
gulp.task("dev", gulp.parallel("terriajs-server", "watch"));
gulp.task("post-npm-install", gulp.series("copy-cesium-assets"));
gulp.task("default", gulp.series("lint", "build"));
