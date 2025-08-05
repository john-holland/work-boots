/**
 * Browserify Example for work-boots
 * Demonstrates full cross-platform compatibility
 */

// Browserify will bundle this for browser use
const { WorkBoots } = require('../dist/work-boots.browser.js');

// Example 1: Basic Usage
async function basicExample() {
  console.log('=== Basic Browserify Example ===');
  
  const workBoots = new WorkBoots({
    socksFile: './worker-universal.js'
  });

  workBoots.onMessage(({ data }) => {
    console.log('Main thread received:', data);
  });

  await workBoots.ready();
  workBoots.postMessage({ message: 'Hello from Browserify!' });
}

// Example 2: Error Handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  const workBoots = new WorkBoots({
    socksFile: './nonexistent-worker.js'
  });

  try {
    await workBoots.ready();
    workBoots.postMessage({ test: 'data' });
    console.log('Fallback to local execution worked');
  } catch (error) {
    console.log('Error handled gracefully:', error.message);
  }
}

// Example 3: Performance Testing
async function performanceExample() {
  console.log('\n=== Performance Example ===');
  
  const workBoots = new WorkBoots({
    socksFile: './worker-universal.js'
  });

  const startTime = Date.now();
  const messageCount = 100;
  let receivedCount = 0;

  workBoots.onMessage(({ data }) => {
    receivedCount++;
    if (receivedCount === messageCount) {
      const endTime = Date.now();
      console.log(`Processed ${messageCount} messages in ${endTime - startTime}ms`);
    }
  });

  await workBoots.ready();
  
  for (let i = 0; i < messageCount; i++) {
    workBoots.postMessage({ id: i, data: `Message ${i}` });
  }
}

// Example 4: Large Data Transfer
async function largeDataExample() {
  console.log('\n=== Large Data Example ===');
  
  const workBoots = new WorkBoots({
    socksFile: './worker-universal.js'
  });

  workBoots.onMessage(({ data }) => {
    console.log('Received large data:', {
      processed: data.processed,
      dataSize: JSON.stringify(data.original).length,
      timestamp: data.timestamp
    });
  });

  await workBoots.ready();
  
  const largeData = {
    array: new Array(10000).fill(0).map((_, i) => i),
    object: Object.fromEntries(
      new Array(1000).fill(0).map((_, i) => [`key${i}`, `value${i}`])
    ),
    timestamp: Date.now()
  };

  workBoots.postMessage(largeData);
}

// Example 5: Custom Worker Factory
async function customWorkerExample() {
  console.log('\n=== Custom Worker Factory Example ===');
  
  const customFactory = (socksFile) => {
    // Custom worker creation logic
    console.log('Creating custom worker for:', socksFile);
    return new Worker(socksFile);
  };

  const workBoots = new WorkBoots({
    socksFile: './worker-universal.js',
    instantiateWorker: customFactory
  });

  workBoots.onMessage(({ data }) => {
    console.log('Custom worker received:', data);
  });

  await workBoots.ready();
  workBoots.postMessage({ custom: 'worker test' });
}

// Example 6: Multiple Workers
async function multipleWorkersExample() {
  console.log('\n=== Multiple Workers Example ===');
  
  const workers = [];
  const workerCount = 3;

  for (let i = 0; i < workerCount; i++) {
    const workBoots = new WorkBoots({
      socksFile: './worker-universal.js'
    });

    workBoots.onMessage(({ data }) => {
      console.log(`Worker ${i} received:`, data);
    });

    await workBoots.ready();
    workers.push(workBoots);
  }

  // Send messages to all workers
  workers.forEach((worker, index) => {
    worker.postMessage({ workerId: index, message: `Hello worker ${index}!` });
  });

  // Clean up
  setTimeout(() => {
    workers.forEach(worker => worker.terminate());
    console.log('All workers terminated');
  }, 1000);
}

// Example 7: Environment Detection
function environmentDetectionExample() {
  console.log('\n=== Environment Detection Example ===');
  
  const workBoots = new WorkBoots({
    socksFile: './worker-universal.js'
  });

  console.log('Environment detection:');
  console.log('- isNode:', typeof process !== 'undefined' && process.versions && process.versions.node);
  console.log('- isBrowser:', typeof window !== 'undefined' && typeof document !== 'undefined');
  console.log('- Worker support:', workBoots.detectWorkerSupport());
  console.log('- Worker factory type:', typeof workBoots.createDefaultWorkerFactory());
}

// Example 8: Message Queuing
async function messageQueuingExample() {
  console.log('\n=== Message Queuing Example ===');
  
  const workBoots = new WorkBoots({
    socksFile: './worker-universal.js'
  });

  // Send messages before ready
  workBoots.postMessage({ queued: 1 });
  workBoots.postMessage({ queued: 2 });
  workBoots.postMessage({ queued: 3 });

  workBoots.onMessage(({ data }) => {
    console.log('Received queued message:', data);
  });

  // Messages will be processed after ready
  await workBoots.ready();
  workBoots.postMessage({ afterReady: 'test' });
}

// Run all examples
async function runAllExamples() {
  try {
    await basicExample();
    await errorHandlingExample();
    await performanceExample();
    await largeDataExample();
    await customWorkerExample();
    await multipleWorkersExample();
    environmentDetectionExample();
    await messageQueuingExample();
    
    console.log('\n=== All Examples Completed Successfully ===');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export for use in other modules
module.exports = {
  basicExample,
  errorHandlingExample,
  performanceExample,
  largeDataExample,
  customWorkerExample,
  multipleWorkersExample,
  environmentDetectionExample,
  messageQueuingExample,
  runAllExamples
};

// Run examples if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.runWorkBootsExamples = runAllExamples;
} else if (require.main === module) {
  // Node.js environment
  runAllExamples();
} 