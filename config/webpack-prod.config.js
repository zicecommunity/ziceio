// @flow

const path = require('path');
const mainWebpack = require('./webpack-main.config');

const outputPath = path.resolve(__dirname, '../', 'build');

module.exports = {
  output: {
    path: outputPath,
    filename: 'bundle.js',
    chunkFilename: '[name].chunk.js',
    publicPath: './',
  },
  externals: { 'sqlite3':'commonjs sqlite3', },
  ...mainWebpack,
};
