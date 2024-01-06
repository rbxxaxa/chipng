const webpack = require("webpack");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    util: require.resolve("util/"),
    stream: require.resolve("stream-browserify"),
    zlib: require.resolve("browserify-zlib"),
    assert: require.resolve("assert"),
  };

  config.plugins.push(
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    })
  );

  config.plugins.push(
    new CopyPlugin({
      patterns: [{ from: "src/bleed.wasm", to: "static/js" }],
    })
  );

  return config;
};
