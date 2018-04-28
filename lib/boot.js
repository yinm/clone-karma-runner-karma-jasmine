/**
 * Jasmine 2.0 standalone `boot.js` modified for karma.
 * This file is registered in `index.js`. This version
 * does not include `HtmlRepoter` setup.
 */
;(function (global) {
  /*global jasmineRequire */
  'use strict'

  /**
   * Require Jasmine's core files. Specifically, this requires and
   * attaches all of Jasmine's code to the `jasmine` reference.
   */
  const jasmine = jasmineRequire.core(jasmineRequire)

  /**
   * Obtain the public Jasmine API.
   */
  const jasmineInterface = jasmineRequire.interface(jasmine, jasmine.getEnv())

  /**
   * Setting up timing functions to be able to be overridden.
   * Certain browsers (Safari, IE 8, PhantomJS) require this hack.
   */
  global.setTimeout = global.setTimeout
  global.setInterval = global.setInterval
  global.clearTimeout = global.clearTimeout
  global.clearInterval = global.clearInterval

  /**
   * Add all of the Jasmine global/public interface to the proper
   * global, so a project can use the public interface directly.
   * Fore example, calling `describe` in specs instead of
   * `jasmine.getEnv().describe`
   */
  for (let property in jasmineInterface) {
    if (jasmineInterface.hasOwnProperty(property)) {
      global[property] = jasmineInterface[property]
    }
  }
})(typeof window !== 'undefined' ? window : global)