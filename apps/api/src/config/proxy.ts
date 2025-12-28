// Setup HTTP proxy for sandbox environments
// This MUST be imported BEFORE any other modules that use fetch

import { ProxyAgent, setGlobalDispatcher } from 'undici';

const proxyUrl = process.env.https_proxy || process.env.HTTPS_PROXY;

if (proxyUrl) {
  const proxyAgent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(proxyAgent);
  console.log('🔌 Proxy configured for all HTTP/HTTPS requests');
}

export {};
