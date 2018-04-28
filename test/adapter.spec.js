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

  })
})