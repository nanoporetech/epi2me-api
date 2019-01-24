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
  entry: './src/rest.js',
  externals: {
    fs: 'empty',
    tls: 'mock',
    net: 'mock',
    request: true,
    console: false,
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-object-rest-spread'],
          },
        },
      },
    ],
  },
};
const epi2meNodeOnly = {
  mode: 'production',
  target: 'node',
  output: {
    filename: '../dist/lib/epi2me.js',
    library: 'epi2me-api',
    // libraryExport: 'default',
    libraryTarget: 'umd',
    //	umdNamedDefine: true
  },
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-proposal-object-rest-spread'],
          },
        },
      },
    ],
  },
};

module.exports = [epi2meWebOnly, epi2meNodeOnly];
