const webpack=require("webpack");
module.exports = {
    target: "web",
    output: {
	filename: "rest.web.js",
    },
    entry: "./dist/rest.js",
    externals: {
        fs: '{}',
        tls: '{}',
        net: '{}',
        console: '{}'
    }
}
