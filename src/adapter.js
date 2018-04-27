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
  const startTimeCurrentSpec = new _Date().getTime()

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
}
