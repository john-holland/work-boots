/**
 * Universal worker file for work-boots
 * Compatible with Browserify bundling
 */

// Universal Socks implementation
class Socks {
  constructor(self = undefined) {
    this.self = self;
    this.postsBeforeReady = [];
    this.isReady = false;
    this.sentReadyMessage = false;
  }

  ready() {
    if (this.isWorkerSupported()) {
      this.postMessage("socks loaded");
      this.sentReadyMessage = true;
    } else {
      if (this.boots) {
        this.boots.onMessageLocal("socks loaded");
        this.sentReadyMessage = true;
      }
    }
    this.isReady = true;
    this.processReadyMessages();
  }

  processReadyMessages() {
    if (this.sentReadyMessage) {
      this.postsBeforeReady.forEach(args => this.postMessage(...args));
      this.postsBeforeReady = [];
    }
  }

  enterBoots(boots) {
    this.boots = boots;
    if (this.isReady && !this.sentReadyMessage) {
      this.ready();
    }
    if (this.self?.onmessage) {
      this.onMessageCallback = this.self.onmessage;
    }
    this.self = undefined;
  }

  postMessage(data, origin, transfer = []) {
    if (!this.isReady) {
      this.postsBeforeReady.push([data, origin, transfer]);
      return;
    }

    const message = (typeof data === 'object' && 'data' in data) ? data : { data };
    if (this.isWorkerSupported()) {
      if (typeof window !== 'undefined') {
        // Browser environment
        this.self.postMessage(...[data, origin, transfer.length > 0 ? transfer : undefined].filter(arg => !!arg));
      } else {
        // Node.js environment
        this.self.postMessage(data, transfer);
      }
    } else {
      this.boots.onMessageLocal(message, origin, transfer);
    }
  }

  onMessage(callback) {
    if (this.isWorkerSupported()) {
      if (typeof window !== 'undefined') {
        this.self.onmessage = callback;
      } else {
        if (typeof this.self.on === 'function') {
          this.self.on('message', callback);
        } else {
          this.self.onmessage = callback;
        }
      }
    } else {
      this.onMessageCallback = callback;
    }
  }

  onMessageLocal(data, origin, transfer = []) {
    if (this.onMessageCallback) {
      this.onMessageCallback(data);
    } else {
      throw new Error('onMessageLocal should not be called without onMessageCallback defined');
    }
  }

  terminate() {
    this.terminateCallback && this.terminateCallback();
    if (typeof this.self?.terminate === 'function') this.self?.terminate();
  }

  onTerminate(callback) {
    this.terminateCallback = callback;
  }

  isWorkerSupported() {
    if (typeof window !== 'undefined') {
      return typeof Worker !== 'undefined' && !!this.self;
    } else {
      return !!this.self;
    }
  }
}

// Create socks instance
const socks = new Socks(typeof self !== 'undefined' ? self : undefined);

// Handle incoming messages
socks.onMessage(({ data }) => {
  console.log('Worker received:', data);
  
  // Process the data
  const result = {
    processed: true,
    original: data,
    timestamp: Date.now(),
    worker: typeof window !== 'undefined' ? 'browser' : 'node'
  };
  
  // Send response back
  socks.postMessage(result);
});

// Signal that the worker is ready
socks.ready();

// Universal exports
export { socks };

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { socks };
}

// AMD compatibility
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return { socks };
  });
} 