/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(createSpecFilter|createStartFn)" }]*/

'use strict'

/**
 * Decision maker for whether a stack entry is considered external to jasmine and karma.
 * @param {String} entry Error stack entry.
 * @returns {boolean} True if external, False otherwise.
 */
function isExternalStackEntry (entry) {
  return !!entry &&
    // entries related to jasmine and karma-jasmine.
    !/\/(jasmine-core|karma-jasmine)\//.test(entry) &&
    // karma specifics, e.g. "at http://localhost:7018/karma.js:185"
    !/\/(karma.js|context.html):/.test(entry)
}

/**
 * Returns relevant stack entries.
 * @param {String} stack Complete error stack trace.
 * @returns {Array} A list of relevant stack entries.
 */
function getRelevantStackFrom (stack) {
  let filteredStack = []
  let relevantStack = []

  stack = stack.split('\n')

  for (let i = 0; i < stack.length; i += 1) {
    if (isExternalStackEntry(stack[i])) {
      filteredStack.push(stack[i])
    }
  }

  // If the filtered stack is empty, i.e. the error originated entirely from within jasmine or karma, then the the whole stack
  // should be relevant.
  if (filteredStack.length === 0) {
    filteredStack = stack
  }

  for (let i = 0; i < filteredStack.length; i += 1) {
    if (filteredStack[i]) {
      relevantStack.push(filteredStack[i])
    }
  }

  return relevantStack
}

/**
 * Custom formatter for a failed step.
 *
 * Different browsers report stack trace in different ways. This function
 * attempts to provide a concise, relevant error message by removing the
 * unnecessary stack traces coming from the testing framework itself as well
 * as possible repetition.
 *
 * @see https://github.com/karma-runner/karma-jasmine/issues/60
 * @param {Object} step Step object with stack and message properties.
 * @returns {string}  Formatted step.
 */
function formatFailedStep (step) {
  // Safari seems to have no stack trace,
  // so we just return the error message:
  if (!step.stack) { return step.message }

  let relevantMessage = []
  let relevantStack = []

  // Remove the message prior to processing the stack to prevent issues like
  // https://github.com/karma-runner/karma-jasmine/issues/79
  const stack = step.stack.replace('Error: ' + step.message, '')

  const dirtyRelevantStack = getRelevantStackFrom(stack)

  // PhantomJS returns multiline error message for errors coming from specs
  // (for example when calling a non-existing function). This error is present
  // in both `step.message` and `step.stack` at the same time, but stack seems
  // preferable, so we iterate relevant stack, compare it to message:
  for (let i = 0; i < dirtyRelevantStack.length; i += 1) {
    if (typeof step.message === 'string' && step.message.indexOf(dirtyRelevantStack[i]) === -1) {
      // Stack entry is not in the message,
      // we consider it to be a relevant stack:
      relevantStack.push(dirtyRelevantStack[i])
    } else {
      // Stack entry is already in the message,
      // we consider it to be a suitable message alternative:
      relevantMessage.push(dirtyRelevantStack[i])
    }
  }

  // In most cases the above will leave us with an empty message...
  if (relevantMessage.length === 0) {
    // Let's reuse the original message:
    relevantMessage.push(step.message)

    // Now we probably have a repetition case where:
    // relevantMessage: ["Expected true to be false."]
    // relevantStack: ["Error: Expected true to be false.", ...]
    if (relevantStack.length && relevantStack[0].indexOf(step.message) !== -1) {
      // The message seems preferable, so we remove the first value from
      // the stack to get rid of repetition:
      relevantStack.shift()
    }
  }

  // Example output:
  // ---------------------
  // Chrome 40.0.2214 (Mac OS X 10.9.5) xxx should return false 1 FAILED
  //    Expected true to be false
  //    at /foo/bar/baz.spec.js:22:13
  //    at /foo/bar/baz.js:18:29
  return relevantMessage.concat(relevantStack).join('\n')
}

function SuiteNode (name, parent) {
  this.name = name
  this.parent = parent
  this.children = []

  this.addChild = function (name) {
    const suite = new SuiteNode(name, this)
    this.children.push(suite)
    return suite
  }
}

function processSuite (suite, pointer) {
  let child
  let childPointer

  for (let i = 0; i < suite.children.length; i++) {
    child = suite.children[i]

    if (child.children) {
      childPointer = pointer[child.description] = {_: []}
      processSuite(child, childPointer)
    } else {
      if (!pointer._) {
        pointer._ = []
      }
      pointer._.push(child.description)
    }
  }
}

function getAllSpecNames (topSuite) {
  let specNames = {}

  processSuite(topSuite, specNames)

  return specNames
}

/**
 * Very simple reporter for Jasmine.
 */
function KarmaReporter (tc, jasmineEnv) {
  let currentSuite = new SuiteNode()

  // Save link on native Date object
  // because user can mock it
  const _Date = Date
  let startTimeCurrentSpec = new _Date().getTime()

  function handleGlobalErrors (result) {
    if (result.failedExpectations && result.failedExpectations.length) {
      let message = 'An error was thrown in afterAll'
      const steps = result.failedExpectations
      for (let i = 0, l = steps.length; i < l; i++) {
        message += '\n' + formatFailedStep(steps[i])
      }

      tc.error(message)
    }
  }

  /**
   * Jasmine 2.0 dispatches the following events:
   *
   * - jasmineStarted
   * - jasmineDone
   * - suiteStarted
   * - suiteDone
   * - specStarted
   * - specDone
   */

  this.jasmineStarted = function (data) {
    tc.info({
      total: data.totalSpecsDefined,
      specs: getAllSpecNames(jasmineEnv.topSuite())
    })
  }

  this.jasmineDone = function (result) {
    result = result || {}

    // Any errors in top-level afterAll blocks are given here.
    handleGlobalErrors(result)

    tc.complete({
      order: result.order,
      coverage: window.__coverage__
    })
  }

  this.specStarted = function () {
    startTimeCurrentSpec = new _Date().getTime()
  }

  this.specDone = function (specResult) {
    const skipped = specResult.status === 'disabled' || specResult.status === 'pending' || specResult.status === 'excluded'

    const result = {
      fullName: specResult.fullName,
      description: specResult.description,
      id: specResult.id,
      log: [],
      skipped: skipped,
      disabled: specResult.status === 'disabled' || specResult.status === 'excluded',
      pending: specResult.status === 'pending',
      success: specResult.failedExpectations.length === 0,
      suite: [],
      time: skipped ? 0 : new _Date().getTime() - startTimeCurrentSpec,
      executedExpectationsCount: specResult.failedExpectations.length + specResult.passedExpectations.length,
    }

    // generate ordered list of (nested) suite names
    let suitePointer = currentSuite
    while (suitePointer.parent) {
      result.suite.unshift(suitePointer.name)
      suitePointer = suitePointer.parent
    }

    if (!result.success) {
      const steps = specResult.failedExpectations
      for (let i = 0, l = steps.length; i < l; i++) {
        result.log.push(formatFailedStep(steps[i]))
      }
    }

    tc.result(result)
    delete specResult.startTime
  }
}

/**
 * Extract grep option from karma config
 * @param {[Array|string]} clientArguments The karma client arguments
 * @returns {string} The value of grep option by default empty string
 */
const getGrepOption = (clientArguments) => {
  const grepRegex = /^--grep=(.*)$/

  if (Object.prototype.toString.call(clientArguments) === '[object Array]') {
    const indexOfGrep = indexOf(clientArguments, '--grep')

    if (indexOfGrep !== -1) {
      return clientArguments[indexOfGrep + 1]
    }

    return map(filter(clientArguments, (arg) => {
      return grepRegex.test(arg)
    }), (arg) => {
      return arg.replace(grepRegex, '$1')
    })[0] || ''

  } else if (typeof clientArguments === 'string') {
    const match = /--grep=([^=]+)/.exec(clientArguments)

    return match ? match[1] : ''
  }
}

/**
 * Create Jasmine spec filter
 * @param {Object} options Spec filter options
 */
const KarmaSpecFilter = function (options) {
  const filterString = options && options.filterString() && options.filterString().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
  const filterPattern = new RegExp(filterString)

  this.matches = function (specName) {
    return filterPattern.test(specName)
  }
}

/**
 * @param {Object} config The karma config
 * @param {Object} jasmineEnv Jasmine environment object
 */
const createSpecFilter = (config, jasmineEnv) => {
  const specFilter = new KarmaSpecFilter({
    filterString() {
      return getGrepOption(config.args)
    }
  })

  jasmineEnv.specFilter = (spec) => {
    return specFilter.matches(spec.getFullName())
  }
}

/**
 * Karma starter function factory.
 *
 * This function is invokd from the wrapper.
 * @see adapter.wrapper
 *
 * @param {Object} karma  Karma runner instance.
 * @param {Object} [jasmineEnv] Optional Jasmine environment for testing.
 * @returns {function()}  Karma starter function.
 */
function createStartFn (karma, jasmineEnv) {
  // This function will be assigned to `window.__karma__.start`:
  return () => {
    const clientConfig = karma.config || {}
    const jasmineConfig = clientConfig.jasmine || {}

    jasmineEnv = jasmineEnv || window.jasmine.getEnv()

    setOption(jasmineConfig.stopOnFailure, jasmineEnv.throwOnExpectationFailure)
    setOption(jasmineConfig.failFast, jasmineEnv.stopOnSpecFailure)
    setOption(jasmineConfig.seed, jasmineEnv.seed)
    setOption(jasmineConfig.random, jasmineEnv.randomizeTests)

    jasmineEnv.addReporter(new KarmaReporter(karma, jasmineEnv))
    jasmineEnv.execute()
  }

  function setOption (option, set) {
    if (option != null && typeof set === 'function') {
      set(option)
    }
  }
}

function indexOf (collection, find, i /* opt*/) {
  if (collection.indexOf) {
    return collection.indexOf(find, i)
  }

  if (i === undefined) { i = 0 }
  if (i < 0) { i += collection.length }
  if (i < 0) { i = 0 }

  for (let n = collection.length; i < n; i++) {
    if (i in collection && collection[i] === find) {
      return i
    }
  }

  return -1
}

function filter (collection, filter, that /* opt*/) {
  if (collection.filter) {
    return collection.filter(filter, that)
  }

  let other = []
  let v
  for (let i = 0, n = collection.length; i < n; i++) {
    if (i in collection && filter.call(that, v = collection[i], i, collection)) {
      other.push(v)
    }
  }

  return other
}

function map (collection, mapper, that /* opt*/) {
  if (collection.map) {
    return collection.map(mapper, that)
  }

  let other = new Array(collection.length)
  for (let i = 0, n = collection.length; i < n; i++) {
    if (i in collection) {
      other[i] = mapper.call(that, collection[i], i, collection)
    }
  }

  return other
}