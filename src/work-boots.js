
/**
    we should be able to include files with or without support of webworkers
    and use the same interface, although support for svg+d3 sort of makes this a
    pointless exercise...

    but just for kicks... lol

    One downside of this is it will require explicit output from webpack to make
    the local and web worker support work.
 */
/**
  Reliable work boots, a background worker proxy object, that will defer evaluation to the local main thread
  if background workers are not supported by the browser.

  @param socksFile [string] the fully qualified path to the socks background worker file
  @param instantiateWorker [function(string)] a function to generate Workers, mostly should be left unaltered
    otherwise used for tests.
 */

class WorkBoots {
  constructor({ socksFile, instantiateWorker = (socksFile) => new Worker(socksFile) }) {
    if (socksFile === undefined) {
      this.readyPromise = Promise.reject(new Error('no socksFile defined!'));
    }

    this.supportsWorker = (typeof Worker !== 'undefined');
    this.receivedBeforeReady = [];

    // we should add an override to onMessage so the user can't
    //   accidentally override velcroAndLaces
    this.isReady = false;
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
      if (!this.supportsWorker) {
        this.supportsWorker = false;
        import(socksFile).then(({ socks }) => {
          this.socks = socks;
          this.socks.enterBoots(this);
          this.isReady = true;
          resolve(this);
        });
      }
    });
  }

  ready() {
    return this.readyPromise;
  }

  postMessage(data, origin = document?.location?.origin, transfer = []) {
    if (!this.isReady) {
      this.onMessageCallback(data, origin, transfer);
      return;
    }

    const message = 'data' in data ? data : { data };
    console.log(`supports worker: ${this.supportsWorker}`);
    if (this.supportsWorker) {
      this.worker.postMessage(...[data, transfer.length > 0 ? transfer : undefined].filter(arg => !!arg));
    } else {
      this.socks.onMessageLocal(message, transfer);
    }
  }

  onMessage(callback) {
    this.onMessageCallback = callback;
    if (this.worker) {
      this.worker.onmessage = callback;
    }

    if (this.receivedBeforeReady.length) {
      console.log('messages received before socks loaded now replaying (not necessarily a problem, but loading out of order):');
      this.receivedBeforeReady.forEach(m => this.onMessageCallback && this.onMessageCallback(...m));
    }
  }

  /**
   *
   * @param data
   * @param origin
   * @param transfer
   * @note: This may need a map of origin to work-boot, in case the import function
   *   uses a browser cache for socks files
   */
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
    if (this.supportsWorker) {
      this.worker.terminate();
    } else {
      this.socks.terminate();
    }
  }
}

// strictly the client side of the worker
/**
E.X.:

const socks = new Socks(self);

socks.onMessage(...)

const someCoolFunction = () => {
  ...
  socks.postMessage(coolData);
};

export {
  socks
};
 */
/**
  A background worker interface proxy wrapper object, that should be exported
  from the background worker module.

  @param self [object]: the implicitly declared "self" object as a part of the
    EMCA background worker spec. If undefined, socks will still be exported, and
    the background worker will defer to the main thread.
 */
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

  /**
   posts a message to the background worker, and optinally an array of objects to`
   transfer thread context ownership of.

   @param data [object] a message to send
   @param transfer [array], an array of references to objects that you would like to transfer
     into another thread context, NOTE: these will no longer be accessible in the current thread!
   */
  postMessage(data, origin /* = window?.document?.location?.origin*/, transfer = []) {
    if (!this.isReady) {
      this.postsBeforeReady.push([data, origin, transfer]);
      return;
    }

    const message = (typeof data === 'object' && 'data' in data) ? data : { data };
    if (this.isWorkerSupported()) {
      this.self.postMessage(...[data, origin, transfer.length > 0 ? transfer : undefined].filter(arg => !!arg));
    } else {
      this.boots.onMessageLocal(message, origin, transfer);
    }
  }

  onMessage(callback) {
    console.log('support ' + this.isWorkerSupported());

    if (this.isWorkerSupported()) {
      this.self.onmessage = callback;
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
    return typeof Worker !== 'undefined' && !!this.self;
  }
}

export {
  WorkBoots,
  Socks
};
