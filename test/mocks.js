const Emitter = function() {
  let listeners = {}

  this.on = (event, fn) => {
    if (!listeners[event]) {
      listeners[event] = []
    }

    listeners[event].push(fn)
  }

  this.emit = (event) => {
    const eventListeners = listeners[event]

    if (!eventListeners) return

    let i = 0
    while (i < eventListeners.length) {
      eventListeners[i].apply(null, Array.prototype.slice.call(arguments, 1))
      i++
    }
  }
}

// eslint-disable-next-line
const MockSocket = Emitter