//import 'jsdom-worker';
import { WorkBoots, Socks } from './work-boots.js';

describe('work boots', () => {
  test('should not use socks file if the worker is supported', () => {
    return new Promise((resolve) => {
      const workBoots = new WorkBoots({ socksFile: './work-boots.test.socks.js', instantiateWorker: () => {
          throw Error('unsupported');
        }
      });
      workBoots.ready().then(() => {
        expect(!!workBoots.socks).toBe(true);
        workBoots.onMessage(({ data }) => {
          expect(data.elite).toBe(313370);
          resolve();
        });
        workBoots.postMessage({ elite: 313370 }, 'localhost:8080');
      });
    });
  });
});

describe('socks', () => {
  // TODO: this is actually deferring to the local socks impl, as Worker isn't supported in the jest
  //  node runtime 'jsdom-worker' implements a polyfill, but requires absolute paths, but debugging
  //  is annoying, so i'll followup later
  //  maybe just implement a mock worker?
  test('should communicate to workboots when postMessage is called', () => {
    return new Promise((resolve) => {
      const workBoots = new WorkBoots({ socksFile: './work-boots.test.socks.js' });
      workBoots.ready().then(() => {
        workBoots.onMessage(({ data }) => {
          expect(data.elite).toBe(31337);
          resolve();
        });
        workBoots.postMessage({ elite: 31337 });
      });
    });
  });

  test('should playback messages when postMessage is called before ready()', () => {
    return new Promise((resolve) => {
      const workBoots = new WorkBoots({ socksFile: './work-boots.test.socks.js' });
      const send = [1,2,3,4,5];
      const receive = [1,2,3,4,5];
      send.forEach(i => {
        workBoots.postMessage({ data: i });
      });
      workBoots.ready().then(() => {
        workBoots.onMessage(({ data }) => {
          if (receive.length) {
            expect(data).toBe(receive.shift());
          }
          if (receive.length) {
            resolve();
          }
        });
      });
    });
  });

  function Worker() {
    // a mock worker class so the isWorkerSupported check will pass...
  }

  // we pass the webworker interface into socks, which is defined as "self" by the JS engine
  test('should recognize when the webworker is available', () => {
    global.Worker = jest.fn('Worker', () => {
      return function Worker() { };
    })
    const worker = new Worker();
    const socks = new Socks(worker);


    expect(socks.self instanceof Worker).toBe(true);
    expect(socks.isWorkerSupported()).toBe(true);
  });

  test('should switch to local methods when it isn\'t', () => {
    const socks = new Socks();

    expect(socks.self).toBe(undefined);
    expect(socks.isWorkerSupported()).toBe(false);
  });
});
