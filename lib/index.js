const path = require('path')

const createPattern = (pattern) => {
  return {pattern: pattern, included: true, served: true, watched: false}
}

const initJasmine = (files) => {
  const jasminePath = path.dirname(require.resolve('jasmine-core'))
  files.unshift(createPattern(path.join(__dirname, '/adapter.js')))
  files.unshift(createPattern(path.join(__dirname, '/boot.js')))
  files.unshift(createPattern(jasminePath + '/jasmine-core/jasmine.js'))
}

initJasmine.$inject = ['config.files']

module.exports = {
  'framework:jasmine': ['factory', initJasmine]
}