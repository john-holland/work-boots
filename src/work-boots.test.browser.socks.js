import { Socks } from './work-boots.js';

// In browser web workers, we have access to self
const socks = new Socks(typeof self !== 'undefined' ? self : undefined);

socks.onMessage(({ data }) => {
  console.log(`Browser worker received: ${JSON.stringify(data)}`);
  
  // Echo back the data with some processing
  const response = {
    processed: true,
    original: data,
    timestamp: Date.now(),
    worker: 'browser'
  };
  
  socks.postMessage(response);
});

socks.ready();
export { socks }; 