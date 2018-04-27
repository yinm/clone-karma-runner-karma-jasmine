/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(createSpecFilter|createStartFn)" }]*/

'use strict'

/**
 * Decision maker for whether a stack entry is considered external to jasmine and karma.
 * @param {string} entry Error stack entry.
 * @returns {boolean} True if external, False otherwise.
 */
function isExternalStackEntry (entry) {
  return !!entry &&
    // entries related to jasmine and karma-jasmine.
    !/\/(jasmine-core|karma-jasmine)\//.test(entry) &&
    // karma specifics, e.g. "at http://localhost:7018/karma.js:185"
    !/\/(karma.js|context.html):/.test(entry)
}