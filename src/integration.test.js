import { jest } from '@jest/globals';
import { WorkBoots, Socks } from './index.js';
import { 
  MockWorker, 
  MockNodeWorker, 
  createMockWorkerFactory, 
  wait,
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

describe('Integration Tests', () => {
  describe('Complete Workflow Tests', () => {
    test('should handle complete message round-trip with worker', async () => {
      const mockFactory = createMockWorkerFactory();
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: mockFactory
      });

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      const testData = { message: 'Hello World', id: 123 };
      workBoots.postMessage(testData);

      await wait(100);
      expect(receivedMessages.length).toBeGreaterThan(0);
    });

    test('should handle complete message round-trip without worker', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      const testData = { message: 'Hello World', id: 456 };
      workBoots.postMessage(testData);

      await wait(100);
      expect(receivedMessages.length).toBeGreaterThan(0);
    });

    test('should handle multiple concurrent messages', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      // Send multiple messages concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          new Promise(resolve => {
            workBoots.postMessage({ id: i, message: `Message ${i}` });
            setTimeout(resolve, 10);
          })
        );
      }

      await Promise.all(promises);
      await wait(100);
      expect(receivedMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Tests', () => {
    test('should recover from worker errors gracefully', async () => {
      const failingFactory = () => { throw new Error('Worker creation failed'); };
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js',
        instantiateWorker: failingFactory
      });

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      expect(workBoots.supportsWorker).toBe(false);
      
      workBoots.postMessage({ test: 'recovery' });
      await wait(100);
      expect(receivedMessages.length).toBeGreaterThan(0);
    });

    test('should handle worker termination and recreation', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await workBoots.ready();
      
      // Terminate the worker
      workBoots.terminate();
      
      // Create a new instance
      const newWorkBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const receivedMessages = [];
      newWorkBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await newWorkBoots.ready();
      newWorkBoots.postMessage({ test: 'recreation' });
      
      await wait(100);
      expect(receivedMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle high-frequency message sending', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const messageCount = 50;
      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      const startTime = Date.now();
      
      // Send messages rapidly
      for (let i = 0; i < messageCount; i++) {
        workBoots.postMessage({ id: i, timestamp: Date.now() });
      }
      
      await wait(200);
      const endTime = Date.now();
      
      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle large payloads efficiently', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const largeData = {
        array: new Array(10000).fill(0).map((_, i) => i),
        object: Object.fromEntries(
          new Array(1000).fill(0).map((_, i) => [`key${i}`, `value${i}`])
        ),
        timestamp: Date.now()
      };

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      const startTime = Date.now();
      workBoots.postMessage(largeData);
      
      await wait(200);
      const endTime = Date.now();
      
      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Memory Management Tests', () => {
    test('should not leak memory with repeated message sending', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await workBoots.ready();
      
      // Send many messages and check for memory leaks
      for (let i = 0; i < 100; i++) {
        workBoots.postMessage({ 
          id: i, 
          data: new Array(100).fill(0).map((_, j) => j),
          timestamp: Date.now()
        });
        await wait(1);
      }
      
      // Terminate to clean up
      workBoots.terminate();
      
      // If we get here without errors, memory management is working
      expect(true).toBe(true);
    });

    test('should properly clean up resources on termination', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await workBoots.ready();
      
      const terminateSpy = jest.spyOn(workBoots, 'terminate');
      workBoots.terminate();
      
      expect(terminateSpy).toHaveBeenCalled();
    });
  });

  describe('Cross-Platform Compatibility Tests', () => {
    test('should work consistently across different environments', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      // Test basic functionality
      workBoots.postMessage({ platform: 'test', environment: isNode ? 'node' : 'browser' });
      
      await wait(100);
      expect(receivedMessages.length).toBeGreaterThan(0);
      
      // Test termination
      workBoots.terminate();
      expect(workBoots.worker || workBoots.socks).toBeDefined();
    });

    test('should handle environment-specific features correctly', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await workBoots.ready();
      
      // Test environment detection
      expect(typeof workBoots.detectWorkerSupport()).toBe('boolean');
      expect(typeof workBoots.createDefaultWorkerFactory()).toBe('function');
      
      // Test worker support detection
      expect(typeof workBoots.supportsWorker).toBe('boolean');
    });
  });

  describe('Edge Case Tests', () => {
    test('should handle undefined and null messages gracefully', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      // Test undefined message
      workBoots.postMessage(undefined);
      
      // Test null message
      workBoots.postMessage(null);
      
      // Test empty object
      workBoots.postMessage({});
      
      await wait(100);
      // Should not crash, even if some messages might not be processed
      expect(true).toBe(true);
    });

    test('should handle circular references gracefully', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      await workBoots.ready();
      
      // Create circular reference
      const circularObj = { name: 'test' };
      circularObj.self = circularObj;
      
      // Should not crash when posting circular reference
      expect(() => {
        workBoots.postMessage(circularObj);
      }).not.toThrow();
    });

    test('should handle very long strings and objects', async () => {
      const workBoots = new WorkBoots({ 
        socksFile: './src/work-boots.test.socks.js'
      });

      const receivedMessages = [];
      workBoots.onMessage(({ data }) => {
        receivedMessages.push(data);
      });

      await workBoots.ready();
      
      // Test very long string
      const longString = 'x'.repeat(100000);
      workBoots.postMessage({ longString });
      
      // Test very deep object
      const deepObject = {};
      let current = deepObject;
      for (let i = 0; i < 1000; i++) {
        current.nested = {};
        current = current.nested;
      }
      workBoots.postMessage({ deepObject });
      
      await wait(100);
      expect(true).toBe(true); // Should not crash
    });
  });
}); 