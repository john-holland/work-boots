import { jest } from '@jest/globals';
import { WorkBoots, Socks } from './work-boots.js';
import { 
  MockWorker, 
  MockNodeWorker, 
  createMockWorkerFactory, 
  wait, 
  generateTestData, 
  generateLargeTransferableData,
  isNode,
  isBrowser
} from './test-utils.js';

// Mock the worker_threads module for Node.js tests
if (isNode) {
  jest.mock('worker_threads', () => ({
    Worker: MockNodeWorker
  }));
}

// Mock Worker for browser tests
if (isBrowser) {
  global.Worker = MockWorker;
}

describe('WorkBoots', () => {
  describe('Constructor and Initialization', () => {
    test('should reject when no socksFile is provided', async () => {
      const workBoots = new WorkBoots({});
      await expect(workBoots.ready()).rejects.toThrow('no socksFile defined!');
    });

    test('should detect worker support correctly', () => {
      const workBoots = new WorkBoots({ socksFile: './src/work-boots.test.socks.js' });
      expect(typeof workBoots.detectWorkerSupport).toBe('function');
    });

    test('should create default worker factory based on environment', () => {
      const workBoots = new WorkBoots({ socksFile: './src/work-boots.test.socks.js' });
      const factory = workBoots.createDefaultWorkerFactory();
      expect(typeof factory).toBe('function');
    });

    test('should accept custom worker factory', async () => {
      const mockFactory = jest.fn(() => new MockWorker('./src/work-boots.test.socks.js'));
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: mockFactory
      });
      
      await workBoots.ready();
      expect(mockFactory).toHaveBeenCalledWith('./src/work-boots.test.socks.js');
    });
  });

  describe('Message Communication', () => {
    test('should communicate with worker when supported', async () => {
      const mockFactory = createMockWorkerFactory();
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: mockFactory
      });

      const messageReceived = jest.fn();
      workBoots.onMessage(messageReceived);

      await workBoots.ready();
      workBoots.postMessage({ test: 'data' });

      await wait(50);
      expect(messageReceived).toHaveBeenCalled();
    });

    test('should fallback to local execution when worker not supported', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messageReceived = jest.fn();
      workBoots.onMessage(messageReceived);

      await workBoots.ready();
      workBoots.postMessage({ elite: 313370 });

      await wait(50);
      expect(messageReceived).toHaveBeenCalled();
    });

    test('should handle messages sent before ready()', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      // Send messages before ready
      workBoots.postMessage({ data: 1 });
      workBoots.postMessage({ data: 2 });
      workBoots.postMessage({ data: 3 });

      await workBoots.ready();
      await wait(50);

      expect(messages.length).toBeGreaterThan(0);
    });

    test('should handle large data transfers', async () => {
      const mockFactory = createMockWorkerFactory();
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: mockFactory
      });

      const largeData = generateLargeTransferableData();
      const messageReceived = jest.fn();
      workBoots.onMessage(messageReceived);

      await workBoots.ready();
      workBoots.postMessage(largeData);

      await wait(50);
      expect(messageReceived).toHaveBeenCalled();
    });

    test('should handle complex nested data structures', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const complexData = {
        users: [
          { id: 1, name: 'Alice', preferences: { theme: 'dark', language: 'en' } },
          { id: 2, name: 'Bob', preferences: { theme: 'light', language: 'es' } }
        ],
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0'
        }
      };

      const messageReceived = jest.fn();
      workBoots.onMessage(messageReceived);

      await workBoots.ready();
      workBoots.postMessage(complexData);

      await wait(50);
      expect(messageReceived).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle worker instantiation errors gracefully', async () => {
      const failingFactory = () => { throw new Error('Worker creation failed'); };
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: failingFactory
      });

      await expect(workBoots.ready()).resolves.toBe(workBoots);
      expect(workBoots.supportsWorker).toBe(false);
    });

    test('should handle message callback errors', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const errorCallback = jest.fn(() => { throw new Error('Callback error'); });
      workBoots.onMessage(errorCallback);

      await workBoots.ready();
      
      // Should not throw, but log the error
      expect(() => {
        workBoots.postMessage({ test: 'data' });
      }).not.toThrow();
    });

    test('should handle undefined message callback', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await workBoots.ready();
      
      // Should not throw when no callback is set
      expect(() => {
        workBoots.postMessage({ test: 'data' });
      }).not.toThrow();
    });
  });

  describe('Termination', () => {
    test('should terminate worker when supported', async () => {
      const mockFactory = createMockWorkerFactory();
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: mockFactory
      });

      await workBoots.ready();
      const terminateSpy = jest.spyOn(workBoots.worker, 'terminate');
      
      workBoots.terminate();
      expect(terminateSpy).toHaveBeenCalled();
    });

    test('should terminate socks when worker not supported', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await workBoots.ready();
      const terminateSpy = jest.spyOn(workBoots.socks, 'terminate');
      
      workBoots.terminate();
      expect(terminateSpy).toHaveBeenCalled();
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle rapid message sending', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messageCount = 100;
      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await workBoots.ready();

      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        workBoots.postMessage({ data: i });
      }

      await wait(100);
      expect(messages.length).toBeGreaterThan(0);
    });

    test('should handle large data payloads', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const largeData = generateTestData(10000);
      const messageReceived = jest.fn();
      workBoots.onMessage(messageReceived);

      await workBoots.ready();
      workBoots.postMessage(largeData);

      await wait(100);
      expect(messageReceived).toHaveBeenCalled();
    });
  });
});

describe('Socks', () => {
  describe('Constructor and Initialization', () => {
    test('should create socks with worker context', () => {
      const mockWorker = new MockWorker('./src/work-boots.test.socks.js');
      const socks = new Socks(mockWorker);
      
      expect(socks.self).toBe(mockWorker);
      expect(socks.isWorkerSupported()).toBe(true);
    });

    test('should create socks without worker context', () => {
      const socks = new Socks();
      
      expect(socks.self).toBeUndefined();
      expect(socks.isWorkerSupported()).toBe(false);
    });

    test('should detect worker support correctly in browser', () => {
      if (isBrowser) {
        const mockWorker = new MockWorker('./src/work-boots.test.socks.js');
        const socks = new Socks(mockWorker);
        expect(socks.isWorkerSupported()).toBe(true);
      }
    });

    test('should detect worker support correctly in Node.js', () => {
      if (isNode) {
        const mockWorker = new MockNodeWorker('./src/work-boots.test.socks.js');
        const socks = new Socks(mockWorker);
        expect(socks.isWorkerSupported()).toBe(true);
      }
    });
  });

  describe('Message Communication', () => {
    test('should post messages when worker supported', () => {
      const mockWorker = new MockWorker('./src/work-boots.test.socks.js');
      const socks = new Socks(mockWorker);
      const postMessageSpy = jest.spyOn(mockWorker, 'postMessage');

      socks.ready();
      socks.postMessage({ test: 'data' });

      expect(postMessageSpy).toHaveBeenCalled();
    });

    test('should handle local messages when worker not supported', () => {
      const socks = new Socks();
      const mockBoots = {
        onMessageLocal: jest.fn()
      };

      socks.enterBoots(mockBoots);
      socks.ready();
      socks.postMessage({ test: 'data' });

      expect(mockBoots.onMessageLocal).toHaveBeenCalled();
    });

    test('should queue messages sent before ready', () => {
      const mockWorker = new MockWorker('./src/work-boots.test.socks.js');
      const socks = new Socks(mockWorker);
      const postMessageSpy = jest.spyOn(mockWorker, 'postMessage');

      // Send messages before ready
      socks.postMessage({ data: 1 });
      socks.postMessage({ data: 2 });
      socks.postMessage({ data: 3 });

      expect(postMessageSpy).not.toHaveBeenCalled();

      socks.ready();
      // ready() sends "socks loaded" + 3 queued messages = 4 total
      expect(postMessageSpy).toHaveBeenCalledTimes(4);
    });

    test('should handle message callbacks', () => {
      const mockWorker = new MockWorker('./src/work-boots.test.socks.js');
      const socks = new Socks(mockWorker);
      const callback = jest.fn();

      socks.onMessage(callback);
      expect(mockWorker.onmessage).toBe(callback);
    });

    test('should handle local message callbacks', () => {
      const socks = new Socks();
      const callback = jest.fn();

      socks.onMessage(callback);
      expect(socks.onMessageCallback).toBe(callback);
    });
  });

  describe('Boots Integration', () => {
    test('should integrate with work boots correctly', () => {
      const socks = new Socks();
      const mockBoots = {
        onMessageLocal: jest.fn()
      };

      socks.enterBoots(mockBoots);
      expect(socks.boots).toBe(mockBoots);
      expect(socks.self).toBeUndefined();
    });

    test('should call ready when boots are entered after ready', () => {
      const socks = new Socks();
      const mockBoots = {
        onMessageLocal: jest.fn()
      };

      socks.ready();
      socks.enterBoots(mockBoots);

      expect(mockBoots.onMessageLocal).toHaveBeenCalledWith('socks loaded');
    });
  });

  describe('Termination', () => {
    test('should terminate worker when supported', () => {
      const mockWorker = new MockWorker('./src/work-boots.test.socks.js');
      const socks = new Socks(mockWorker);
      const terminateSpy = jest.spyOn(mockWorker, 'terminate');

      socks.terminate();
      expect(terminateSpy).toHaveBeenCalled();
    });

    test('should call terminate callback when not supported', () => {
      const socks = new Socks();
      const terminateCallback = jest.fn();

      socks.onTerminate(terminateCallback);
      socks.terminate();

      expect(terminateCallback).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle onMessageLocal without callback', () => {
      const socks = new Socks();
      const mockBoots = {
        onMessageLocal: jest.fn()
      };

      socks.enterBoots(mockBoots);
      
      expect(() => {
        socks.onMessageLocal({ data: 'test' });
      }).toThrow('onMessageLocal should not be called without onMessageCallback defined');
    });

    test('should handle undefined worker context gracefully', () => {
      const socks = new Socks(undefined);
      expect(socks.isWorkerSupported()).toBe(false);
    });
  });
});

describe('Cross-Platform Compatibility', () => {
  test('should work in Node.js environment', () => {
    if (isNode) {
      const workBoots = new WorkBoots({ socksFile: './src/work-boots.test.socks.js' });
      expect(workBoots.detectWorkerSupport()).toBeDefined();
    }
  });

  test('should work in browser environment', () => {
    if (isBrowser) {
      const workBoots = new WorkBoots({ socksFile: './src/work-boots.test.socks.js' });
      expect(workBoots.detectWorkerSupport()).toBeDefined();
    }
  });

  test('should handle environment detection correctly', () => {
    expect(typeof isNode).toBe('boolean');
    expect(typeof isBrowser).toBe('boolean');
  });
});
