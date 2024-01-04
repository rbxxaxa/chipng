module.exports = function override(config, env) {
    config.resolve.fallback = {
        ...config.resolve.fallback,
        "util": require.resolve("util/"),
        "stream": require.resolve("stream-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "assert": require.resolve("assert"),
    };
    return config;
};