/**
 Tests for adapter/jasmine.js
 These tests are executed in browser.
 */
/* global getJasmineRequireObj, jasmineRequire, MockSocket, KarmaReporter */
/* global formatFailedStep, , createStartFn, getGrepOption, KarmaSpecFilter, createSpecFilter */
/* global getRelevantStackFrom: true, isExternalStackEntry: true */

'use strict'

describe('jasmine adapter', () => {
  let Karma
  beforeAll(() => {
    Karma = window.__karma__.constructor
  })

  describe('KarmaReporter', () => {
    let reporter, karma, env, parentSuite, suite, spec

    beforeEach(() => {
      const jasmine = getJasmineRequireObj().core(jasmineRequire)
      env = jasmine.getEnv()

      karma = new Karma(new MockSocket(), null, null, null, {search: ''})
      reporter = new KarmaReporter(karma, env)

      spyOn(karma, 'result')

      parentSuite = new jasmine.Suite({
        env: env,
        id: 'suite0',
        description: 'Parent Suite'
      })

      suite = new jasmine.Suite({
        env: env,
        id: 'suite1',
        parentSuite: parentSuite,
        description: 'Child Suite'
      })

      spec = new jasmine.Spec({
        id: 'spec0',
        description: 'contains spec with an expectation',
        queueableFn: {
          fn() {
          }
        },
        getSpecName() {
          return 'A suite contains spec with an expectation'
        }
      })
    })

    it('should report all spec names', () => {
      spyOn(karma, 'info').and.callFake((info) => {
        expect(info.total).toBe(2)
        expect(info.specs).toEqual({
          one: {
            nested: {
              _: ['should do something']
            },
            _: []
          },
          two: {
            _: ['should not do anything']
          }
        })
      })

      env.describe('one', () => {
        env.describe('nested', () => {
          env.it('should do something', () => {
          })
        })
      })

      env.describe('two', () => {
        env.it('should not do anything', () => {
        })
      })

      reporter.jasmineStarted({totalSpecsDefined: 2})
    })

    it('should report success result', () => {
      karma.result.and.callFake((result) => {
        expect(result.id).toBe(spec.id)
        expect(result.description).toBe('contains spec with an expectation')
        expect(result.fullName).toBe('A suite contains spec with an expectation')
        expect(result.suite).toEqual(['Parent Suite', 'Child Suite'])
        expect(result.success).toBe(true)
        expect(result.skipped).toBe(false)
      })

      reporter.suiteStarted(parentSuite.result)
      reporter.suiteStarted(suite.result)
      reporter.specDone(spec.result)
      expect(karma.result).toHaveBeenCalled()
    })

    it('should report disabled status', () => {
      spec.result.status = 'disabled'

      karma.result.and.callFake((result) => {
        expect(result.skipped).toBe(true)
        expect(result.disabled).toBe(true)
      })

      reporter.specDone(spec.result)
      expect(karma.result).toHaveBeenCalled()
    })

    it('should report excluded status', () => {
      spec.result.status = 'excluded'

      karma.result.and.callFake((result) => {
        expect(result.skipped).toBe(true)
        expect(result.disabled).toBe(true)
      })

      reporter.specDone(spec.result)
      expect(karma.result).toHaveBeenCalled()
    })

    it('should report pending status', () => {
      spec.result.status = 'pending'

      karma.result.and.callFake((result) => {
        expect(result.skipped).toBe(true)
        expect(result.pending).toBe(true)
      })

      reporter.specDone(spec.result)
      expect(karma.result).toHaveBeenCalled()
    })

    it('should report executedExpectCount 0 if no expectations', () => {
      karma.result.and.callFake((result) => {
        expect(result.executedExpectationsCount).toBe(0)
      })

      reporter.specDone(spec.result)

      expect(karma.result).toHaveBeenCalled()
    })

    it('should report fail result', () => {
      karma.result.and.callFake((result) => {
        expect(result.success).toBe(false)
        expect(result.log.length).toBe(1)
        expect(result.executedExpectationsCount).toBe(1)
      })

      spec.result.failedExpectations.push({})
      reporter.specDone(spec.result)

      expect(karma.result).toHaveBeenCalled()
    })

    it('should report errors in afterAll blocks', () => {
      spyOn(karma, 'complete')
      spyOn(karma, 'error')

      const result = {
        failedExpectations: [],
      }

      reporter.jasmineDone(result)
      expect(karma.error).not.toHaveBeenCalled()

      result.failedExpectations.push({})

      reporter.jasmineDone(result)
      expect(karma.error).toHaveBeenCalled()
    })

    it('should report executedExpectCount as sum of passed and failed expectations', () => {
      karma.result.and.callFake((result) => {
        expect(result.executedExpectationsCount).toBe(2)
      })

      spec.result.passedExpectations.push({})
      spec.result.failedExpectations.push({})

      reporter.specDone(spec.result)

      expect(karma.result).toHaveBeenCalled()
    })

    it('should remove jasmine-specific frames from the exception stack traces if the trace contains non-jasmine specific frames', () => {
      let step = {}

      step.message = 'Expected true to be false.'
      step.stack = 'Error: Expected true to be false.\n' +
        '    at stack (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1441:17)\n' +
        '    at buildExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1411:14)\n' +
        '    at Spec.Env.expectationResultFactory (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:533:18)\n' +
        '    at Spec.addExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:293:34)\n' +
        '    at Expectation.addExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:477:21)\n' +
        '    at Expectation.toBe (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1365:12)\n' +
        '    at /foo/bar/baz.spec.js:23:29\n' +
        '    at /foo/bar/baz.js:18:20\n'

      karma.result.and.callFake((result) => {
        expect(result.log).toEqual([
          'Expected true to be false.\n' +
          '    at /foo/bar/baz.spec.js:23:29\n' +
          '    at /foo/bar/baz.js:18:20'
        ])
      })

      spec.result.failedExpectations.push(step)
      reporter.specDone(spec.result)

      expect(karma.result).toHaveBeenCalled()
    })

    it('should not remove jasmine-specific frames from the exception stack traces if the trace contains no non-jasmine specific frames', () => {
      let step = {}

      step.message = 'Expected true to be false.'
      step.stack = 'Error: Expected true to be false.\n' +
        '    at stack (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1441:17)\n' +
        '    at buildExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1411:14)\n' +
        '    at Spec.Env.expectationResultFactory (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:533:18)\n' +
        '    at Spec.addExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:293:34)\n' +
        '    at Expectation.addExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:477:21)\n' +
        '    at Expectation.toBe (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1365:12)\n'

      karma.result.and.callFake((result) => {
        expect(result.log).toEqual([
          'Expected true to be false.\n' +
          '    at stack (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1441:17)\n' +
          '    at buildExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1411:14)\n' +
          '    at Spec.Env.expectationResultFactory (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:533:18)\n' +
          '    at Spec.addExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:293:34)\n' +
          '    at Expectation.addExpectationResult (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:477:21)\n' +
          '    at Expectation.toBe (/foo/bar/node_modules/jasmine-core/lib/jasmine-core/jasmine.js:1365:12)'
        ])
      })

      spec.result.failedExpectations.push(step)
      reporter.specDone(spec.result)

      expect(karma.result).toHaveBeenCalled()
    })

    it('should report time for every spec', () => {
      let counter = 3

      spyOn(Date.prototype, 'getTime').and.callFake(() => {
        counter += 1
        return counter
      })

      karma.result.and.callFake((result) => {
        expect(result.time).toBe(1) // 4 - 3
      })

      reporter.specStarted(Object.assign({}, spec.result))
      reporter.specDone(Object.assign({}, spec.result))

      expect(karma.result).toHaveBeenCalled()
    })

    it('should report order on complete', () => {
      const result = {
        order: {
          random: true,
          seed: '4321'
        }
      }

      spyOn(karma, 'complete')

      reporter.jasmineDone(result)

      expect(karma.complete).toHaveBeenCalledWith({
        order: result.order,
        coverage: undefined
      })
    })

    it('should not fail if result is undefined', () => {
      spyOn(karma, 'complete')

      reporter.jasmineDone()

      expect(karma.complete).toHaveBeenCalledWith({
        order: undefined,
        coverage: undefined
      })
    })

    describe('time', () => {
      afterEach(() => {
        jasmine.clock().uninstall()
      })

      it('should report correct time if user mock Date object', () => {
        karma.result.and.callFake((result) => {
          expect(result.time >= 0).toBe(true)
        })

        reporter.specStarted(spec.result)

        jasmine.clock().mockDate(new Date(0))
        reporter.specDone(spec.result)
      })
    })
  })

  describe('formatFailedStep', () => {
    it('should prepend the stack with message if browser does not', () => {
      // FF does not have the message in the stack trace

      const step = {
        passed: false,
        message: 'Jasmine fail message',
        stack: '@file.js:123\n'
      }

      expect(formatFailedStep(step)).toMatch(/^Jasmine fail message/)
    })

    it('should report message if no stack trace', () => {
      // Safari does not have trace

      const step = {
        passed: false,
        message: 'MESSAGE',
      }

      expect(formatFailedStep(step)).toBe('MESSAGE')
    })

    it('should properly format message containing new-line characters', () => {
      // FF does not have the message in the stack trace

      const step = {
        passed: false,
        message: 'Jasmine fail\nmessage',
        stack: 'Error: Jasmine fail\nmessage\n@file.js:123',
      }

      expect(formatFailedStep(step)).toMatch('Jasmine fail\nmessage\n@file.js:123')
    })
  })

  describe('startFn', () => {
    let tc
    let jasmineEnv
    let jasmineConfig

    beforeEach(() => {
      jasmineConfig = {}

      tc = new Karma(new MockSocket(), {}, null, null, {search: ''})
      tc.config = {jasmine: jasmineConfig}

      spyOn(tc, 'info')
      spyOn(tc, 'complete')
      spyOn(tc, 'result')

      jasmineEnv = new jasmine.Env()
    })

    it('should set random order', () => {
      jasmineConfig.random = true
      spyOn(jasmineEnv, 'randomizeTests')

      createStartFn(tc, jasmineEnv)()

      expect(jasmineEnv.randomizeTests).toHaveBeenCalledWith(true)
    })

    it('should set order seed', () => {
      const seed = '4321'

      jasmineConfig.seed = seed
      spyOn(jasmineEnv, 'seed')

      createStartFn(tc, jasmineEnv)()

      expect(jasmineEnv.seed).toHaveBeenCalledWith(seed)
    })

    it('should set stopOnFailure', () => {
      jasmineConfig.stopOnFailure = true
      spyOn(jasmineEnv, 'throwOnExpectationFailure')

      createStartFn(tc, jasmineEnv)()

      expect(jasmineEnv.throwOnExpectationFailure).toHaveBeenCalledWith(true)
    })

    it('should set failFast', () => {
      jasmineConfig.failFast = true
      spyOn(jasmineEnv, 'stopOnSpecFailure')

      createStartFn(tc, jasmineEnv)()

      expect(jasmineEnv.stopOnSpecFailure).toHaveBeenCalledWith(true)
    })

    it('should not set random order if client does not pass it', () => {
      spyOn(jasmineEnv, 'randomizeTests')

      createStartFn(tc, jasmineEnv)()

      expect(jasmineEnv.randomizeTests).not.toHaveBeenCalled()
    })

    it('should not fail with failFast if the jasmineEnv does not support it', () => {
      jasmineConfig.failFast = true
      jasmineEnv.stopOnSpecFailure = null

      expect(() => {
        createStartFn(tc, jasmineEnv)()
      }).not.toThrowError()
    })

    it('should not fail if client does not set config', () => {
      tc.config = null

      expect(() => {
        createStartFn(tc, jasmineEnv)()
      }).not.toThrowError()
    })
  })

  describe('isExternalStackEntry', () => {
    it('should be a function', () => {
      expect(typeof isExternalStackEntry).toBe('function')
    })

    it('should return false for empty strings', () => {
      expect(isExternalStackEntry('')).toBe(false)
    })

    it('should return false for strings with "jasmine-core"', () => {
      expect(isExternalStackEntry('/foo/jasmine-core/bar.js')).toBe(false)
    })

    it('should return false for strings with "karma-jasmine"', () => {
      expect(isExternalStackEntry('/foo/karma-jasmine/bar.js')).toBe(false)
    })

    it('should return false for strings with "karma.js"', () => {
      expect(isExternalStackEntry('/foo/karma.js:183')).toBe(false)
    })
  })
})