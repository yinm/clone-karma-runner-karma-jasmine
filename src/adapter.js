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