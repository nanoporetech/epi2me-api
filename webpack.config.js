const webpack=require("webpack");
module.exports = {
    target: "web",
    output: {
//	globalObject: 'typeof self !== \'undefined\' ? self : this',
	filename: "rest.web.js",
	library: "EPI2ME",
//	libraryTarget: "umd",
//	umdNamedDefine: true
    },
    entry: "./dist/rest.js",
    externals: {
        fs: '{}',
        tls: '{}',
        net: '{}',
        console: '{}'
    }
}
