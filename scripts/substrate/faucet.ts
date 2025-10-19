import { ApiPromise, WsProvider } from "@polkadot/api";
import { Keyring } from "@polkadot/keyring";

async function main() {
  const NODE_URL = process.env.NODE_URL || "ws://127.0.0.1:9944";
  const SURI = process.env.SURI || "//Alice";
  const ADDR = process.env.ADDR;
  const AMOUNT = process.env.AMOUNT ? BigInt(process.env.AMOUNT) : 1_000_000_000_000n; // default: 1 UNIT (12 dp)

  if (!ADDR) {
    throw new Error("Missing ADDR env. Usage: NODE_URL=... SURI=//Alice ADDR=<ss58> AMOUNT=<plancks> ts-node faucet.ts");
  }

  console.log(`[faucet] Connecting to ${NODE_URL}`);
  const ws = new WsProvider(NODE_URL);
  const api = await ApiPromise.create({ provider: ws });

  console.log(`[faucet] Creating keyring from SURI: ${SURI}`);
  const keyring = new Keyring({ type: "sr25519" });
  const sender = keyring.addFromUri(SURI);
  console.log(`[faucet] Sender: ${sender.address}`);

  console.log(`[faucet] Transferring ${AMOUNT} plancks to ${ADDR}`);
  const tx = api.tx.balances.transferKeepAlive(ADDR, AMOUNT);

  const unsub = await tx.signAndSend(sender, ({ status, dispatchError, txHash, events }) => {
    if (dispatchError) {
      if (dispatchError.isModule) {
        const metaError = api.registry.findMetaError(dispatchError.asModule);
        const { name, section } = metaError;
        console.error(`[faucet] Dispatch Error: ${section}.${name}`);
      } else {
        console.error(`[faucet] Dispatch Error: ${dispatchError.toString()}`);
      }
    }

    if (status.isInBlock) {
      console.log(`[faucet] Included in block ${status.asInBlock.toHex()}`);
      console.log(`[faucet] txHash: ${txHash.toHex()}`);
    } else if (status.isFinalized) {
      console.log(`[faucet] Finalized in block ${status.asFinalized.toHex()}`);
      for (const { event } of events) {
        if (api.events.system.ExtrinsicFailed.is(event)) {
          console.error("[faucet] ExtrinsicFailed");
        }
      }
      unsub();
      void api.disconnect();
    } else {
      // console.log(`[faucet] Current status: ${status.type}`);
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
