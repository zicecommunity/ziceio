// @flow

const path = require('path');
const mainWebpack = require('./webpack-main.config');

const outputPath = path.resolve(__dirname, '../', 'build');

module.exports = {
  output: {
    path: outputPath,
    filename: 'bundle.js',
    chunkFilename: '[name].chunk.js',
    publicPath: '/',
  },
  devServer: {
    historyApiFallback: true,
    host: process.env.HOST || '0.0.0.0',
  },
  externals: { 'sqlite3':'commonjs sqlite3', },
  ...mainWebpack,
};
