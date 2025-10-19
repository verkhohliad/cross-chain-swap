/**
 * HTLC helper tools (EVM-side utilities + Substrate claim) using ethers + @polkadot/api
 *
 * Commands:
 *  - hash --secret 0x<32B>
 *      Prints keccak256(secret). If --secret omitted, uses env SECRET.
 *
 *  - gen [--save]
 *      Generates random 32-byte secret. Prints SECRET and HASH.
 *      If --save, prints 'export SECRET=...' and 'export HASH=...' lines usable in your shell.
 *
 *  - verify --secret 0x<32B> --hash 0x<64hex>
 *      Checks keccak256(secret) == hash.
 *
 *  - claim-substrate
 *      Calls escrow.claim(secret) on a contracts-enabled Substrate parachain.
 *      Flags/env:
 *        --endpoint (SUB_ENDPOINT), --escrow (SUB_ESCROW), --secret (SECRET)
 *        Signer: --suri (SUB_SURI) OR --json --password (SUB_JSON, SUB_PASSWORD)
 *      Reads metadata from contracts/ink/htlc-escrow/target/ink/htlc_escrow.contract
 *
 * Examples:
 *  npx ts-node scripts/evm/htlc-tools.ts gen --save
 *  npx ts-node scripts/evm/htlc-tools.ts hash --secret 0x<32B>
 *  npx ts-node scripts/evm/htlc-tools.ts verify --secret 0x<32B> --hash 0x<64hex>
 *  npx ts-node scripts/evm/htlc-tools.ts claim-substrate --escrow 0x... --secret 0x<32B>
 */

//import 'dotenv/config';
//import fs from 'fs';
//import path from 'path';

// Ethers keccak256
const { keccak256, getBytes, randomBytes: ethersRandomBytes } = require('ethers');

function parseArgs(argv) {
  const args = {};
  let cmd = '';
  const flags = new Set([
    '--secret', '--hash', '--save',
    '--endpoint', '--escrow',
    '--suri', '--json', '--password',
    '--factoryMetadata', '--escrowMetadata'
  ]);
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--') && !cmd) {
      cmd = a;
      continue;
    }
    if (flags.has(a)) {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[a.slice(2)] = next;
        i++;
      } else {
        // boolean flag like --save
        args[a.slice(2)] = 'true';
      }
    }
  }
  return { cmd, args };
}

function isHex(value, expectedBytes) {
  if (!value || !value.startsWith('0x')) return false;
  const len = value.length - 2;
  if (expectedBytes != null) return len === expectedBytes * 2;
  return len % 2 === 0;
}

// -------------- Ethers helpers --------------
function keccak256Hex(hexOrBytes) {
  const bytes = typeof hexOrBytes === 'string' ? getBytes(hexOrBytes) : hexOrBytes;
  return keccak256(bytes);
}

function genSecret() {
  return '0x' + Buffer.from(ethersRandomBytes(32)).toString('hex');
}

// -------------- Commands --------------
async function cmdHash(args) {
  const secret = args.secret || process.env.SECRET;
  if (!secret || !isHex(secret, 32)) {
    throw new Error('Provide --secret 0x<64hex-32B> or set SECRET in .env');
  }
  const hash = keccak256Hex(secret);
  console.log('SECRET:', secret);
  console.log('HASH:  ', hash);
}

async function cmdGen(args) {
  const secret = genSecret();
  const hash = keccak256Hex(secret);
  console.log('SECRET:', secret);
  console.log('HASH:  ', hash);
  if (args.save === 'true') {
    console.log('\n# To export in your shell:');
    console.log(`export SECRET=${secret}`);
    console.log(`export HASH=${hash}`);
  }
}

async function cmdVerify(args) {
  const secret = args.secret || process.env.SECRET;
  const hash = args.hash || process.env.HASH;
  if (!secret || !isHex(secret, 32)) {
    throw new Error('Provide --secret 0x<64hex-32B> or set SECRET in .env');
  }
  if (!hash || !isHex(hash, 32)) {
    throw new Error('Provide --hash 0x<64hex-32B> or set HASH in .env');
  }
  const computed = keccak256Hex(secret);
  console.log('Computed:', computed);
  console.log('Provided:', hash);
  console.log('Match:', computed.toLowerCase() === hash.toLowerCase());
}


// -------------- Main --------------
async function main() {
  const { cmd, args } = parseArgs(process.argv);
  if (!cmd) {
    console.error('Usage: ts-node htlc-tools.ts <cmd> [--flags]\nCommands: hash, gen, verify, claim-substrate');
    process.exit(1);
  }
  switch (cmd) {
    case 'hash':
      await cmdHash(args);
      break;
    case 'gen':
      await cmdGen(args);
      break;
    case 'verify':
      await cmdVerify(args);
      break;
    default:
      console.error('Unknown command:', cmd);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
