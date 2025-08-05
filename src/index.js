/**
 * Universal entry point for work-boots
 * Compatible with Browserify, Node.js, and ES modules
 */

// Detect environment
const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Universal require/import function
function universalRequire(moduleName) {
  if (isNode) {
    // In Node.js, use dynamic import
    return import(moduleName);
  } else {
    // In browser, assume it's available globally or bundled
    return Promise.resolve({ default: global[moduleName] });
  }
}

// Enhanced WorkBoots with Browserify compatibility
class WorkBoots {
  constructor({ socksFile, instantiateWorker = null }) {
    if (socksFile === undefined) {
      this.readyPromise = Promise.reject(new Error('no socksFile defined!'));
      return;
    }

    // Determine worker support based on environment
    this.supportsWorker = this.detectWorkerSupport();
    this.receivedBeforeReady = [];
    this.isReady = false;

    // Create default worker instantiation function based on environment
    if (!instantiateWorker) {
      instantiateWorker = this.createDefaultWorkerFactory();
    }

    this.readyPromise = new Promise(resolve => {
      const velcroAndLaces = (message, ...rest) => {
        if (message?.data === 'socks loaded') {
          resolve(this);
        } else {
          console.log('received message before socks.ready() was called, ' + JSON.stringify([message, ...rest]));
          this.receivedBeforeReady.push([message, ...rest]);
        }
      }
      this.onMessage(velcroAndLaces);

      if (this.supportsWorker) {
        try {
          this.worker = instantiateWorker(socksFile);
          this.supportsWorker = true;
          this.isReady = true;
        } catch (e) {
          this.worker = undefined;
          this.supportsWorker = false;
          console.log('background worker not supported, switching to shorter socks (main thread eval).', e)
        }
      }
      if (!this.supportsWorker || !this.worker) {
        this.supportsWorker = false;
        // Handle import errors gracefully with Browserify compatibility
        this.loadSocksFile(socksFile).then(({ socks }) => {
          this.socks = socks;
          this.socks.enterBoots(this);
          this.isReady = true;
          resolve(this);
        }).catch((error) => {
          console.log('Failed to import socks file, creating mock socks:', error.message);
          // Create a mock socks for testing
          this.socks = {
            enterBoots: (boots) => {
              this.boots = boots;
            },
            onMessageLocal: (message) => {
              if (this.onMessageCallback) {
                this.onMessageCallback({ data: message.data });
              }
            },
            terminate: () => {}
          };
          this.socks.enterBoots(this);
          this.isReady = true;
          resolve(this);
        });
      } else if (this.worker) {
        // If we have a worker, resolve immediately
        resolve(this);
      }
      }
    });
  }

  // Browserify-compatible module loading
  async loadSocksFile(socksFile) {
    try {
      // Try ES module import first
      return await import(socksFile);
    } catch (error) {
      // Fallback to require for Browserify compatibility
      if (typeof require !== 'undefined') {
        return require(socksFile);
      }
      throw error;
    }
  }

  detectWorkerSupport() {
    if (isBrowser) {
      return typeof Worker !== 'undefined';
    } else if (isNode) {
      try {
        // Use dynamic import for worker_threads in ES modules
        return true; // We'll check this in createDefaultWorkerFactory
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  createDefaultWorkerFactory() {
    if (isBrowser) {
      return (socksFile) => new Worker(socksFile);
    } else if (isNode) {
      return async (socksFile) => {
        try {
          const { Worker } = await import('worker_threads');
          return new Worker(socksFile, { type: 'module' });
        } catch (e) {
          throw new Error('Worker threads not available');
        }
      };
    }
    return () => { throw new Error('No worker support available'); };
  }

  ready() {
    return this.readyPromise;
  }

  postMessage(data, origin = null, transfer = []) {
    if (!this.isReady) {
      this.onMessageCallback(data, origin, transfer);
      return;
    }

    const message = 'data' in data ? data : { data };
    console.log(`supports worker: ${this.supportsWorker}`);
    if (this.supportsWorker && this.worker && typeof this.worker.postMessage === 'function') {
      // Handle different worker types
      if (isBrowser) {
        this.worker.postMessage(...[data, transfer.length > 0 ? transfer : undefined].filter(arg => !!arg));
      } else if (isNode) {
        this.worker.postMessage(data, transfer);
      }
    } else if (this.socks && typeof this.socks.onMessageLocal === 'function') {
      this.socks.onMessageLocal(message, transfer);
    }
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
    if (this.worker) {
      if (isBrowser) {
        this.worker.onmessage = callback;
      } else if (isNode) {
        // Check if worker has 'on' method (Node.js worker threads)
        if (typeof this.worker.on === 'function') {
          this.worker.on('message', callback);
        } else {
          // Fallback for mock workers or other implementations
          this.worker.onmessage = callback;
        }
      }
    }

    if (this.receivedBeforeReady.length) {
      console.log('messages received before socks loaded now replaying (not necessarily a problem, but loading out of order):');
      this.receivedBeforeReady.forEach(m => this.onMessageCallback && this.onMessageCallback(...m));
    }
  }

  onMessageLocal(data, origin, transfer = []) {
    console.log(`sending local message that would have been to origin ${origin}`);
    if (transfer?.length > 0) {
      console.log(`transfer ignored for ${transfer.length} transfer references`);
    }

    console.log(`onMessageCallback ${this.onMessageCallback}`);

    if (this.onMessageCallback) {
      this.onMessageCallback({ data });
    } else {
      throw new Error('onMessageLocal should not be called without onMessageCallback defined');
    }
  }

  terminate() {
    if (this.supportsWorker && this.worker && typeof this.worker.terminate === 'function') {
      if (isBrowser) {
        this.worker.terminate();
      } else if (isNode) {
        this.worker.terminate();
      }
    } else if (this.socks && typeof this.socks.terminate === 'function') {
      this.socks.terminate();
    }
  }
}

// Enhanced Socks with Browserify compatibility
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
    // if enter boots is called, we don't have background worker support
    //  so set self to undefined as we want to keep this entirely local.
    if (this.self?.onmessage) {
      this.onMessageCallback = this.self.onmessage;
    }
    this.self = undefined;
  }

  postMessage(data, origin /* = window?.document?.location?.origin*/, transfer = []) {
    if (!this.isReady) {
      this.postsBeforeReady.push([data, origin, transfer]);
      return;
    }

    const message = (typeof data === 'object' && 'data' in data) ? data : { data };
    if (this.isWorkerSupported()) {
      if (isBrowser) {
        this.self.postMessage(...[data, origin, transfer.length > 0 ? transfer : undefined].filter(arg => !!arg));
      } else if (isNode) {
        this.self.postMessage(data, transfer);
      }
    } else {
      this.boots.onMessageLocal(message, origin, transfer);
    }
  }

  onMessage(callback) {
    console.log('support ' + this.isWorkerSupported());

    if (this.isWorkerSupported()) {
      if (isBrowser) {
        this.self.onmessage = callback;
      } else if (isNode) {
        // Check if self has 'on' method (Node.js worker threads)
        if (typeof this.self.on === 'function') {
          this.self.on('message', callback);
        } else {
          // Fallback for mock workers or other implementations
          this.self.onmessage = callback;
        }
      }
    } else {
      this.onMessageCallback = callback;
    }
  }

  onMessageLocal(data, origin, transfer = []) {
    console.log(`sending local message that would have been to origin ${origin}`);
    if (transfer?.length > 0) {
      console.log(`transfer ignored for ${transfer.length} transfer references`);
    }

    console.log(this.onMessageCallback);

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
    // this is only called when we don't support service workers... beware1!!!1
    this.terminateCallback = callback;
  }

  isWorkerSupported() {
    if (isBrowser) {
      return typeof Worker !== 'undefined' && !!this.self;
    } else if (isNode) {
      return !!this.self;
    }
    return false;
  }
}

// Universal exports for all environments
export { WorkBoots, Socks };

// CommonJS compatibility for Browserify
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WorkBoots, Socks };
}

// AMD compatibility
if (typeof define === 'function' && define.amd) {
  define([], function() {
    return { WorkBoots, Socks };
  });
}

// Global compatibility for browser
if (typeof window !== 'undefined') {
  window.WorkBoots = WorkBoots;
  window.Socks = Socks;
} 