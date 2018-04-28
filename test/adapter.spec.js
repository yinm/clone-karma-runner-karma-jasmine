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
    let repoter, karma, env, parentSuite, suite, spec

    beforeEach(() => {
      const jasmine = getJasmineRequireObj().core(jasmineRequire)
      env = jasmine.getEnv()

      karma = new Karma(new MockSocket(), null, null, null, {search: ''})
      repoter = new KarmaReporter(karma, env)

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
        queuebleFn: {
          fn: function() {
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

      repoter.jasmineStarted({totalSpecDefined: 2})
    })

  })
})