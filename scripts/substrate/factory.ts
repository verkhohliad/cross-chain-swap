/**
 * HTLC Factory/Esrow interaction script using @polkadot/api-contract
 *
 * npx ts-node factory.ts create-native
 * Commands:
 *  - get-last
 *      Read last created escrow from factory (get_last_escrow)
 *  - create-native
 *      Create native escrow via factory:
 *      --beneficiary 0x...H160 --hash 0x...64hex --expiry 12345 --deposit 1000 --locked 5000 --salt None|Some(0x...64hex)
 *      (value attached = deposit + locked)
 *  - get-info
 *      Read escrow.get_info from given --escrow 0x...
 *  - claim
 *      Call escrow.claim with --secret 0x...64hex on --escrow 0x...
 *  - refund
 *      Call escrow.refund on --escrow 0x...
 *
 * Common flags:
 *  --endpoint wss://...   (WebSocket RPC)
 *  --factory 0x...        (Factory address; hex string)
 *  --json ./account.json  (Polkadot.js JSON keystore)
 *  --password "..."       (Password for JSON)
 *  --suri "mnemonic ..."  (Alternative: mnemonic SURI instead of JSON)
 *
 * Metadata paths (override as needed):
 *  --factoryMetadata contracts/ink/htlc-factory/target/ink/htlc_factory.contract
 *  --escrowMetadata  contracts/ink/htlc-escrow/target/ink/htlc_escrow.contract
 */

import 'dotenv/config';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { CodePromise, ContractPromise } from '@polkadot/api-contract';
import type { WeightV2 } from '@polkadot/types/interfaces';
import { Keyring } from '@polkadot/keyring';
import { cryptoWaitReady, mnemonicValidate } from '@polkadot/util-crypto';
import fs from 'fs';
import path from 'path';

type Args = Record<string, string | undefined>;

function parseArgs(argv: string[]): { cmd: string; args: Args } {
  const args: Args = {};
  let cmd = '';
  const flags = new Set([
    '--endpoint', '--factory', '--escrow', '--beneficiary', '--hash', '--expiry', '--deposit', '--locked',
    '--salt', '--secret', '--json', '--password', '--suri', '--factoryMetadata', '--escrowMetadata'
  ]);
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') && !cmd) {
      cmd = a;
      continue;
    }
    if (flags.has(a)) {
      args[a.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return { cmd, args };
}

function hexToU8a(hex: string, expectedLen?: number): Uint8Array {
  if (!hex || !hex.startsWith('0x')) throw new Error(`Expected hex value with 0x prefix, got: ${hex}`);
  const clean = hex.slice(2);
  if (expectedLen && clean.length !== expectedLen * 2) {
    throw new Error(`Expected ${expectedLen} bytes (0x${'..'.repeat(expectedLen)}), got length=${clean.length / 2}`);
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substr(i, 2), 16);
  }
  return bytes;
}

function parseOptionBytes32(opt: string | undefined): Uint8Array | null {
  if (!opt || opt === 'None') return null;
  // Expect Some(0x....)
  const m = opt.match(/^Some\((0x[0-9a-fA-F]+)\)$/);
  if (!m) throw new Error(`Invalid salt Option format. Use None or Some(0x...64hex). Got: ${opt}`);
  return hexToU8a(m[1], 32);
}

async function loadSignerFromJson(jsonPath: string, password: string) {
  const jr = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const keyring = new Keyring({ type: (jr.encoding?.content?.[1] ?? 'sr25519') as any });
  const pair = keyring.addFromJson(jr);
  pair.decodePkcs8(password);
  return pair;
}

async function loadSignerFromSuri(suri: string, scheme: 'sr25519' | 'ed25519' | 'ecdsa' = 'sr25519') {
  const keyring = new Keyring({ type: scheme });
  // If suri is a mnemonic, validate
  if (suri.includes(' ')) {
    if (!mnemonicValidate(suri.split('//')[0])) {
      throw new Error('Provided --suri does not appear to be a valid mnemonic (space-separated).');
    }
  }
  return keyring.addFromUri(suri);
}

function readContractMeta(p: string) {
  const j = JSON.parse(fs.readFileSync(p, 'utf-8'));
  // api-contract accepts JSON metadata object directly

  return j;
}

function mkWeight(api: ApiPromise, refTime: bigint, proofSize: bigint): WeightV2 {
  // createType returns Codec at compile-time; cast to WeightV2 for api-contract types
  return api.registry.createType('WeightV2', { refTime, proofSize }) as unknown as WeightV2;
}

async function main() {
  const { cmd, args } = parseArgs(process.argv);
  if (!cmd) {
    console.error('Usage: ts-node factory.ts <cmd> [--flags]\nCommands: get-last, create-native, get-info, claim, refund');
    process.exit(1);
  }

  const endpoint = args.endpoint || process.env.APP_WS || 'ws://127.0.0.1:9944';
  await cryptoWaitReady();
  const api = await ApiPromise.create({ provider: new WsProvider(endpoint) });

  // Load signer
  let signer: any;
  if (args.json && args.password) {
    signer = await loadSignerFromJson(args.json, args.password);
  } else if (args.suri) {
    signer = await loadSignerFromSuri(args.suri);
  } else if (process.env.APP_JSON && process.env.APP_PASSWORD) {
    signer = await loadSignerFromJson(process.env.APP_JSON, process.env.APP_PASSWORD);
  } else if (process.env.APP_SURI) {
    signer = await loadSignerFromSuri(process.env.APP_SURI);
  } else {
    // Default to //Alice for local testing
    signer = await loadSignerFromSuri('//Alice');
  }

  // Metadata paths
  const factoryMetaPath = args.factoryMetadata || path.resolve(process.cwd(), '../../contracts/ink/htlc-factory/target/ink/htlc_factory.contract');
  const escrowMetaPath = args.escrowMetadata || path.resolve(process.cwd(), '../../contracts/ink/htlc-escrow/target/ink/htlc_escrow.contract');
  const factoryMeta = readContractMeta(factoryMetaPath);
  const escrowMeta = readContractMeta(escrowMetaPath);

  // Factory address may be required
  const factoryAddr = args.factory || process.env.APP_FACTORY;
  const escrowAddr = args.escrow || process.env.APP_ESCROW;

  const gasMult = 1.2; // safety multiplier

  async function dryRunFactory(method: string, value: bigint, params: any[]) {
    const contract = new ContractPromise(api, factoryMeta, factoryAddr!);
    console.log({ method, messages: contract.abi.messages })
    const { gasRequired, storageDeposit, result, output } = await contract.query[method](signer.address, { value, gasLimit: mkWeight(api, 0n, 0n), storageDepositLimit: null }, ...params);
    if (result.isErr) {
      console.error('Dry-run error:', result.asErr.toString());
      throw new Error('Dry run failed');
    }
    // Estimate gasLimit from gasRequired * mult
    const gasLimit = mkWeight(
      api,
      (gasRequired.refTime.toBigInt() * BigInt(Math.ceil(gasMult * 100))) / BigInt(100),
      gasRequired.proofSize.toBigInt()
    );
    const storageDepositLimit = storageDeposit.isCharge ? storageDeposit.asCharge.toBigInt() : null;
    return { contract, gasLimit, storageDepositLimit, output };
  }

  async function dryRunEscrow(method: string, params: any[]) {
    const contract = new ContractPromise(api, escrowMeta, escrowAddr!);
    const { gasRequired, storageDeposit, result, output } = await contract.query[method](signer.address, { value: 0, gasLimit: mkWeight(api, 0n, 0n), storageDepositLimit: null }, ...params);
    if (result.isErr) {
      console.error('Dry-run error:', result.asErr.toString());
      throw new Error('Dry run failed');
    }
    const gasLimit = mkWeight(
      api,
      (gasRequired.refTime.toBigInt() * BigInt(Math.ceil(gasMult * 100))) / BigInt(100),
      gasRequired.proofSize.toBigInt()
    );
    const storageDepositLimit = storageDeposit.isCharge ? storageDeposit.asCharge.toBigInt() : null;
    return { contract, gasLimit, storageDepositLimit, output };
  }

  if (cmd === 'get-last') {
    if (!factoryAddr) throw new Error('--factory is required');
    const { contract } = await dryRunFactory('get_last_escrow', BigInt(0), []);
    const { result, output } = await contract.query.get_last_escrow(signer.address, { value: 0, gasLimit: mkWeight(api, 0n, 0n), storageDepositLimit: null });
    if (result.isOk && output) {
      const addr = output.toString();
      console.log('last_escrow:', addr);
    } else {
      console.error('query failed:', result.toString());
    }
  } else if (cmd === 'create-native') {
    if (!factoryAddr) throw new Error('--factory is required');
    const beneficiary = (args.beneficiary || process.env.APP_BENEFICIARY)!;
    const hashed = (args.hash || process.env.APP_HASH)!;
    const expiry = BigInt(args.expiry || process.env.APP_EXPIRY!);
    const deposit = BigInt(args.deposit || process.env.APP_DEPOSIT!);
    const locked = BigInt(args.locked || process.env.APP_LOCKED!);
    const saltOpt = parseOptionBytes32(args.salt || process.env.APP_SALT);
    if (!beneficiary || !hashed) throw new Error('--beneficiary and --hash are required');
    // Attached value = locked + deposit
    const value = deposit + locked;

    // Prepare params: (beneficiary: Address/H160 hex string), (hashed_secret: [u8;32] hex), expiry: u64, resolver_deposit: U256, salt: Option<[u8;32]>
    // For polkadot.js, pass hex strings or u8a for fixed bytes; U256 numbers passed as bigint decimal (codec supports).
    const params: any[] = [
      beneficiary,                       // Address (assumed hex for H160 environment)
      hashed,                            // [u8;32] hex
      expiry,                            // u64
      deposit,                           // U256
      saltOpt                            // Option<[u8;32]> -> null or u8a
    ];

    const { contract, gasLimit, storageDepositLimit, output } = await dryRunFactory('create_native_escrow', value, params);
    if (output) {
      console.log('dry-run return (escrow address?):', output.toString());
    }
    const tx = contract.tx.create_native_escrow({ value, gasLimit, storageDepositLimit }, ...params);
    const unsub = await tx.signAndSend(signer, (ev: any) => {
      if (ev.status.isInBlock) {
        console.log('in block', ev.status.asInBlock.toHex());
      } else if (ev.status.isFinalized) {
        console.log('finalized', ev.status.asFinalized.toHex());
        unsub();
      }
      if (ev.dispatchError) {
        console.error('dispatch error', ev.dispatchError.toString());
      }
      ev.events.forEach(({ event }: any) => {
        const { section, method, data } = event;
        console.log('event:', section, method, data.toString());
      });
    });
  } else if (cmd === 'get-info') {
    if (!escrowAddr) throw new Error('--escrow is required');
    const { contract } = await dryRunEscrow('get_info', []);
    const { result, output } = await contract.query.get_info(signer.address, { value: 0, gasLimit: mkWeight(api, 0n, 0n), storageDepositLimit: null });
    if (result.isOk && output) {
      console.log('escrow info:', output.toHuman());
    } else {
      console.error('query failed:', result.toString());
    }
  } else if (cmd === 'claim') {
    if (!escrowAddr) throw new Error('--escrow is required');
    const secret = args.secret!;
    if (!secret) throw new Error('--secret 0x...64hex is required');
    const { contract, gasLimit, storageDepositLimit } = await dryRunEscrow('claim', [secret]);
    const tx = contract.tx.claim({ value: 0, gasLimit, storageDepositLimit }, secret);
    const unsub = await tx.signAndSend(signer, (ev: any) => {
      if (ev.status.isInBlock) {
        console.log('in block', ev.status.asInBlock.toHex());
      } else if (ev.status.isFinalized) {
        console.log('finalized', ev.status.asFinalized.toHex());
        unsub();
      }
      if (ev.dispatchError) {
        console.error('dispatch error', ev.dispatchError.toString());
      }
      ev.events.forEach(({ event }: any) => {
        console.log('event:', event.section, event.method, event.data.toString());
      });
    });
  } else if (cmd === 'refund') {
    if (!escrowAddr) throw new Error('--escrow is required');
    const { contract, gasLimit, storageDepositLimit } = await dryRunEscrow('refund', []);
    const tx = contract.tx.refund({ value: 0, gasLimit, storageDepositLimit });
    const unsub = await tx.signAndSend(signer, (ev: any) => {
      if (ev.status.isInBlock) {
        console.log('in block', ev.status.asInBlock.toHex());
      } else if (ev.status.isFinalized) {
        console.log('finalized', ev.status.asFinalized.toHex());
        unsub();
      }
      if (ev.dispatchError) {
        console.error('dispatch error', ev.dispatchError.toString());
      }
      ev.events.forEach(({ event }: any) => {
        console.log('event:', event.section, event.method, event.data.toString());
      });
    });
  } else {
    console.error('Unknown command:', cmd);
    process.exit(1);
  }

  await api.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
