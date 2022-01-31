const path = require('path')
const isProduction = process.env.prod == 1
if (isProduction) console.log('GENERATING PRODUCTION MINIFIED BUNDLES')

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
}