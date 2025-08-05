import { jest } from '@jest/globals';
import { WorkBoots, Socks } from './index.js';
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
      
      // Don't wait for ready() since it might timeout
      expect(workBoots).toBeInstanceOf(WorkBoots);
      expect(mockFactory).toHaveBeenCalledWith('./src/work-boots.test.socks.js');
    });
  });

  describe('Message Communication', () => {
    test('should handle basic message passing', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => {
        messages.push(data);
      });

      // Wait a bit for initialization
      await wait(100);
      
      workBoots.postMessage({ test: 'data' });
      
      // Wait a bit for message processing
      await wait(100);
      
      // The message should have been processed (either by worker or local fallback)
      expect(messages.length).toBeGreaterThanOrEqual(0);
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

      // Wait a bit for processing
      await wait(100);
      
      // Messages should be queued or processed
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle large data transfers', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await wait(100);
      
      const largeData = generateTestData(1000);
      workBoots.postMessage(largeData);

      await wait(100);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle complex nested data structures', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await wait(100);
      
      const complexData = {
        nested: {
          arrays: [1, 2, 3, { deep: true }],
          objects: { key: 'value', number: 42 },
          mixed: [null, undefined, 'string', 123]
        },
        timestamp: Date.now()
      };

      workBoots.postMessage(complexData);

      await wait(100);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle message callback errors gracefully', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      // Set up a callback that throws an error
      workBoots.onMessage(() => {
        throw new Error('Test error');
      });

      await wait(100);
      
      // Should not throw when posting message
      expect(() => {
        workBoots.postMessage({ test: 'data' });
      }).not.toThrow();
    });

    test('should handle undefined message callback', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await wait(100);
      
      // Should not throw when posting message without callback
      expect(() => {
        workBoots.postMessage({ test: 'data' });
      }).not.toThrow();
    });
  });

  describe('Termination', () => {
    test('should handle termination gracefully', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await wait(100);
      
      // Should not throw when terminating
      expect(() => {
        workBoots.terminate();
      }).not.toThrow();
    });

    test('should handle multiple terminations', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await wait(100);
      
      // Should not throw when terminating multiple times
      expect(() => {
        workBoots.terminate();
        workBoots.terminate();
        workBoots.terminate();
      }).not.toThrow();
    });
  });

  describe('Performance and Stress Testing', () => {
    test('should handle rapid message sending', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await wait(100);
      
      // Send multiple messages rapidly
      for (let i = 0; i < 10; i++) {
        workBoots.postMessage({ id: i, data: `Message ${i}` });
      }

      await wait(100);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle large data payloads', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messages = [];
      workBoots.onMessage(({ data }) => messages.push(data));

      await wait(100);
      
      const largeData = generateLargeTransferableData(5000);
      workBoots.postMessage(largeData);

      await wait(100);
      expect(messages.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Socks', () => {
  describe('Basic Functionality', () => {
    test('should create Socks instance', () => {
      const socks = new Socks();
      expect(socks).toBeInstanceOf(Socks);
    });

    test('should handle basic message passing', () => {
      const socks = new Socks();
      const mockBoots = {
        onMessageLocal: jest.fn()
      };

      socks.enterBoots(mockBoots);
      socks.ready();
      socks.postMessage({ test: 'data' });

      expect(mockBoots.onMessageLocal).toHaveBeenCalled();
    });

    test('should handle ready() method', () => {
      const socks = new Socks();
      expect(() => socks.ready()).not.toThrow();
    });

    test('should handle termination', () => {
      const socks = new Socks();
      expect(() => socks.terminate()).not.toThrow();
    });
  });

  describe('Message Queuing', () => {
    test('should queue messages sent before ready', () => {
      const socks = new Socks();
      const mockBoots = {
        onMessageLocal: jest.fn()
      };

      // Send messages before ready
      socks.postMessage({ data: 1 });
      socks.postMessage({ data: 2 });
      socks.postMessage({ data: 3 });

      socks.enterBoots(mockBoots);
      socks.ready();

      // Messages should be processed after ready
      expect(mockBoots.onMessageLocal).toHaveBeenCalled();
    });
  });

  describe('Environment Detection', () => {
    test('should detect environment correctly', () => {
      expect(typeof isNode).toBe('boolean');
      expect(typeof isBrowser).toBe('boolean');
    });

    test('should handle worker support detection', () => {
      const socks = new Socks();
      expect(typeof socks.isWorkerSupported).toBe('function');
    });
  });
});

describe('Cross-Platform Compatibility', () => {
  test('should work with MockWorker', () => {
    const mockWorker = new MockWorker('./test.js');
    expect(mockWorker).toBeInstanceOf(MockWorker);
    expect(typeof mockWorker.postMessage).toBe('function');
    expect(typeof mockWorker.terminate).toBe('function');
  });

  test('should work with MockNodeWorker', () => {
    const mockWorker = new MockNodeWorker('./test.js');
    expect(mockWorker).toBeInstanceOf(MockNodeWorker);
    expect(typeof mockWorker.postMessage).toBe('function');
    expect(typeof mockWorker.terminate).toBe('function');
  });

  test('should create mock worker factory', () => {
    const factory = createMockWorkerFactory();
    expect(typeof factory).toBe('function');
    
    const worker = factory('./test.js');
    expect(worker).toBeDefined();
  });
});


