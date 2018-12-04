const webpack=require("webpack");
module.exports = {
    target: "web",
    output: {
	filename: "rest.web.js",
	library: "EPI2ME",
    },
    entry: "./dist/rest.js",
    externals: {
        fs: '{}',
        tls: '{}',
        net: '{}',
        console: '{}'
    }
}
