const epi2meWebOnly = {
  mode: 'production',
  target: 'web',
  devtool: 'source-map',
  output: {
    //	globalObject: 'typeof self !== \'undefined\' ? self : this',
    filename: '../dist/lib/epi2me.web.js',
    library: 'EPI2ME',
    libraryExport: 'default',
    libraryTarget: 'window',
    //	umdNamedDefine: true
    sourceMapFilename: '../dist/lib/epi2me.web.js.map',
  },
  entry: './build/rest.js',
  externals: {
    fs: 'empty',
    tls: 'mock',
    net: 'mock',
    request: 'mock',
    console: false,
  },
};
// const epi2meNodeOnly = {
//   mode: 'production',
//   target: 'node',
//   output: {
//     filename: '../dist/lib/epi2me.js',
//     library: 'epi2me-api',
//     libraryExport: 'default',
//     libraryTarget: 'umd',
//     //	umdNamedDefine: true
//   },
//   entry: './build/index.js',
// };

module.exports = [epi2meWebOnly];
// module.exports = [epi2meWebOnly, epi2meNodeOnly];
