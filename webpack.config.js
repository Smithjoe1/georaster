const webpack = require('webpack');
const path = require('path');
//const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
//const ThreadsPlugin = require('threads-plugin');


//module.exports = {
//  entry: './src/index.js',
//  output: {
//    filename: 'main.js',
//    path: path.resolve(__dirname, 'dist'),
//  },
//};

module.exports = (env, argv) => {

    const {mode, target} = argv;
    const targetFileNamePart = target === 'node' ? '' : '.browser';

    const externals = {};
    const node = {};

    //if (target === 'web') node['fs'] = 'empty';

    return {
        entry: ['./src/index.js', './src_geotiff/geotiff.js'],
        mode,
        target: target,
        output: {
          path: path.resolve(__dirname, 'dist'),
          filename: mode === 'production' ? `georaster${targetFileNamePart}.bundle.min.js` : `georaster${targetFileNamePart}.bundle.js`,
          globalObject: 'typeof self !== \'undefined\' ? self : this',
          library: 'GeoRaster',
          libraryTarget: 'umd',
        },

        module: {
            rules: [
              {
                test: /\.(?:js|mjs|cjs)$/,
                exclude: /node_modules/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: [
                      ['@babel/preset-env', { targets: "defaults" }]
                    ]
                  }
                }
              }
    ].filter(Boolean),
    },
    optimization: {
        minimize: false
     },
     node: {
      },
      resolve: {
        fallback: {
          //fs: require.resolve('browserify-fs'),
            "fs": false,
            "tls": false,
            "net": false,
            "path": false,
            "zlib": false,
            "http": false,
            "https": false,
            "stream": false,
            "crypto": false,
        },
      },



    externals,
  //  plugins
  };
};