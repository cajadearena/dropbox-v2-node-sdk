var webpack = require('webpack')

var config = {
  entry: __dirname + '/src/index.js',

  output: {
    path: __dirname + '/dist',
    filename: 'dropbox-sdk.js',
  },

  module: {
    loaders: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      }
    ]
  },

  devtool: 'source-map',
}

module.exports = config
