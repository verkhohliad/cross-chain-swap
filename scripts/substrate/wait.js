// Simple readiness probe for a local Substrate Contracts node
// Usage: NODE_URL=ws://127.0.0.1:9944 node wait.js
const { ApiPromise, WsProvider } = require("@polkadot/api");

(async () => {
  try {
    const NODE_URL = process.env.NODE_URL || "ws://127.0.0.1:9944";
    console.log(`[wait] Connecting to ${NODE_URL} ...`);
    const provider = new WsProvider(NODE_URL, 3_000); // 3s handshake timeout
    const api = await ApiPromise.create({ provider });

    const [chain, nodeName, nodeVersion, props] = await Promise.all([
      api.rpc.system.chain(),
      api.rpc.system.name(),
      api.rpc.system.version(),
      api.rpc.system.properties(),
    ]);

    console.log(`[wait] Connected to chain: ${chain.toString()}`);
    console.log(`[wait] Node: ${nodeName.toString()} v${nodeVersion.toString()}`);
    console.log(`[wait] Properties: ${props.toString()}`);

    // quick health check
    const health = await api.rpc.system.health();
    console.log(`[wait] Health: peers=${health.peers}, isSyncing=${health.isSyncing}, shouldHavePeers=${health.shouldHavePeers}`);

    await api.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`[wait] Failed to connect: ${err.message || err}`);
    process.exit(1);
  }
})();
