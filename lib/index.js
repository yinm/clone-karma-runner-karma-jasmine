const createPattern = function(path) {
  return {pattern: path, included: true, served: true, watched: false}
}

const initJasmine = function(files) {
  files.unshift(createPattern(__dirname + '/adapter.js'))
  files.unshift(createPattern(__dirname + '/jasmine.js'))
}

initJasmine.$inject = ['config.files']

module.exports = {
  'framework:jasmine': ['factory', initJasmine]
}