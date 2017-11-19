const path = require('path')
const WebpackNotifierPlugin = require('webpack-notifier')
const HtmlWebpackPlugin = require('html-webpack-plugin')

process.noDeprecation = true

module.exports = {
  entry: {
    'suggestrap': './src/js/suggestrap.js',
    '../test/browser-test': './src/test/browser-test.js',
  },
  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: '[name].js'
  },
  resolve: {
    modules: [ 'node_modules', path.resolve('./src/'),  ],
    extensions: ['.js', 'scss'],
  },
  externals: [
  ],
  plugins: [
    new WebpackNotifierPlugin(),
    new HtmlWebpackPlugin({
      filename: '../test/index.html',
      template: './src/test/index.pug',
      chunks: [],
    }),
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015']
        }
      },
      {
        test: /\.pug$/,
        exclude: /node_modules/,
        loader: ['pug-loader']
      }
    ]
  }
}