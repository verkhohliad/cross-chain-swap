# Implementation Plan: 1inch Fusion+ Cross-Chain Swap Extension (Ethereum ↔ Polkadot via ink!)

Summary
- Goal: Enable atomic, bidirectional swaps between Ethereum mainnet and a Polkadot-compatible contracts environment using 1inch Fusion+ (Settlement + LOP v4) on EVM and ink! HTLC on Substrate.
- Scope: Contracts (ink! HTLC + Factory with native and PSP22 modes), Resolver (TS: ethers + polkadot.js), Maker CLI (EIP-712 orders to 1inch), local Substrate infra, ERC-20 ↔ PSP22 mapping, demo scripts, and Memory Bank + Neo4j logging.

Architecture

EVM (Mainnet)
- 1inch Contracts (mainnet):
  - LOP v4 / Router V6 (IOrderMixin): 0x111111125421cA6dC452d289314280A0f8842A65
  - Settlement: 0xA88800CD213dA5Ae406ce248380802BD53b47647
  - Whitelist / Resolver Registry: 0xF55684BC536487394B423e70567413faB8e45E26
  - EscrowFactory: 0xA7bCb4EaC8964306f9E3764F67db6A7Af6dDf99a
  - 1INCH token: 0x111111111117dC0aa78b770fA6A738034120C302
- Maker signs EIP-712 order embedding secret hash H = keccak256(S), posts to official 1inch endpoints.
- Resolver fills via Settlement/LOP v4 (fillOrderArgs) to deploy/fill Fusion+ escrow leg. Withdraw with S later.

Substrate (Local contracts node now; parachain-ready later)
- ink! HTLC contracts with keccak256 hashlock and block-number based timelock:
  - HtlcEscrow:
    - Modes: native balance lock OR PSP22 lock.
    - claim(secret): verify keccak256(secret) == hashed_secret and before expiry; pay beneficiary; pay resolverDeposit (native) to msg.sender; emit SecretRevealed(secret).
    - refund(): after expiry and not claimed; refund initiator; pay resolverDeposit to msg.sender.
    - Events: SecretRevealed, Claimed, Refunded, plus getters for UI/debug.
  - HtlcFactory:
    - create_native_escrow(beneficiary, H, expiry, resolverDeposit, salt): payable (amount + deposit).
    - create_psp22_escrow(token, amount, beneficiary, H, expiry, resolverDeposit, salt): requires prior approval; factory pulls PSP22; deposit is native.
    - Emits EscrowCreated with escrow address, H, expiry, amounts, resolver deposit.
- PSP22 Test Tokens: Deploy WETHx, USDCx, 1INCHx, GNOx (matching decimals) for mapping.

Flows

ETH → Substrate (ERC-20 → PSP22/native)
1) Resolver generates secret S and H.
2) Maker signs order on mainnet with H; posts to 1inch orderbook.
3) Resolver fills order via Settlement/LOP v4 (fillOrderArgs) → EVM escrow leg holds maker asset per Fusion+ semantics.
4) Resolver creates Substrate escrow via factory (PSP22 or native) with same H and T2 < T1 (EVM).
5) Resolver calls claim(S) on Substrate → user receives PSP22/native; SecretRevealed(S).
6) Resolver withdraws on EVM escrow with S.

Substrate → ETH (PSP22/native → ERC-20)
1) User (maker) on Substrate creates escrow first with H and long T1; locks PSP22/native + deposit.
2) Resolver fills EVM dest leg on mainnet via fillOrderArgs with T2 < T1.
3) Resolver withdraws on EVM to pay the user (reveals S).
4) Resolver claims on Substrate with S to redeem PSP22/native.

Timings & deposits
- Defaults (configurable):
  - ETH → Substrate: T1(EVM)=30m, T2(Substrate)=20m
  - Substrate → ETH: T1(Substrate)=30m, T2(EVM)=20m
  - Deposits: EVM 0.005 ETH; Substrate 0.1 native unit
- Substrate expiry is in blocks; convert minutes to blocks based on node block time.

Repository Structure

- apps/
  - resolver/ (TypeScript)
    - src/index.ts (orchestrator)
    - src/config.ts (env, addresses, timeouts, deposits)
    - src/evm.ts (ethers setup, Settlement, LOP v4, EscrowFactory, withdraw)
    - src/substrate.ts (polkadot.js, create escrows, claim/refund, events)
    - src/mapping.ts (ERC-20 ↔ PSP22 registry)
    - src/secret.ts (secret generation; keccak256)
    - src/flows/eth-to-substrate.ts
    - src/flows/substrate-to-eth.ts
    - package.json, tsconfig.json, .env.sample
  - maker-cli/
    - src/buildOrder.ts (EIP-712 maker order)
    - src/postOrder.ts (1inch endpoints)
    - src/main.ts (CLI entry)
    - package.json, tsconfig.json, .env.sample
- contracts/
  - ink/
    - htlc/Cargo.toml
    - htlc/lib.rs (HtlcEscrow + HtlcFactory)
    - psp22/Cargo.toml
    - psp22/lib.rs (PSP22 TestToken(s) or a factory)
    - target/ (build outputs)
  - README.md
- config/
  - evm.addresses.mainnet.json (1inch contracts + ERC-20s: WETH, USDC, 1INCH, GNO)
  - substrate.local.json (factory address, PSP22 addresses)
  - tokens.json (mapping {erc20: {address, decimals}} and {psp22: {address, decimals}})
  - networks.json (RPC URLs, block time)
- scripts/
  - local-substrate/docker-compose.yml (substrate-contracts-node)
  - local-substrate/setup.sh (upload code, instantiate factory, deploy PSP22)
  - demo/eth-to-substrate.sh
  - demo/substrate-to-eth.sh
- docs/
  - implementation-plan.md
  - demo-runbook.md (commands, explorers)
  - architecture.md (diagrams, events)
  - timings-and-deposits.md
- cline_docs/
  - productContext.md
  - activeContext.md
  - systemPatterns.md
  - techContext.md
  - progress.md
- project_config.json

Local Substrate Environment

- Docker: substrate-contracts-node (pallet-contracts) with WS endpoint exposed.
- Tooling:
  - cargo-contract for building ink! (v6).
  - polkadot.js for deployment scripts and runtime interactions.
- Setup Script:
  - Upload code (factory, escrow, PSP22).
  - Instantiate HtlcFactory.
  - Deploy PSP22 WETHx (18 decimals) and optionally USDCx (6), 1INCHx, GNOx.
  - Save addresses to config/substrate.local.json.

EVM Integration

- ethers.js provider (mainnet) using provided RPC.
- Contracts:
  - Settlement ABI: call fillOrderArgs / fillOrderInteraction as required by Fusion+ design.
  - LOP v4 interface (IOrderMixin) for hashing/signature validation if needed off-chain.
  - EscrowFactory: deterministic proxy deployments; event watching.
- Withdraw calls with revealed secret S.

Maker CLI

- EIP-712 domain and order struct aligned to 1inch LOP v4 / Fusion+ maker extensions.
- Embeds secret hash H and fusion metadata per cross-chain swap design.
- Posts to official 1inch orderbook endpoints.
- Provide example JSON of order and signing.

ERC-20 ↔ PSP22 Mapping

- tokens.json: map mainnet ERC-20 addresses (WETH, USDC, 1INCH, GNO) to local PSP22s (WETHx, USDCx, 1INCHx, GNOx).
- Decimals respected for amount conversions.
- Resolver config uses mapping to select PSP22/native path.

Events and Observability

- Substrate:
  - EscrowCreated(escrow, beneficiary, expiry, locked_amount, resolver_deposit, hashed_secret)
  - SecretRevealed(secret)
  - Claimed(to, amount)
  - Refunded(to, amount)
- EVM:
  - Settlement/Escrow events per 1inch contracts (monitor to coordinate).
- Logs and metrics:
  - Resolver logs each phase and confirmed tx hashes.
  - Demo scripts capture explorer links.

Edge Cases & Safety

- Wrong secret: claim reverts (BadSecret).
- Expired claim: Enforce NotExpired/Expired.
- Double finalize: prevent via claimed/refunded flags.
- Public finisher: deposit awarded to tx caller on claim/refund.
- Timelock validation: resolver ensures T1 > T2 or reverse per direction before acting.

Neo4j MCP Integration

- On each meaningful commit or deployment:
  - Create ChangeLog node with description, timestamp, files affected, and project = "cross-chain-swap-polkadot".
- Maintain nodes for Components (Contracts, Resolver, Maker CLI), Modules, Files as needed.

Phased Delivery

Phase 1: Foundation (current)
- Memory Bank setup.
- Implementation plan (this document).
- Local Substrate infra scripts.

Phase 2: Contracts
- ink! HtlcEscrow + HtlcFactory with native + PSP22 support.
- PSP22 test token(s).
- Build artifacts and deploy locally.

Phase 3: Resolver + Maker
- Resolver scaffold (ethers + polkadot.js).
- Maker CLI for EIP-712 + post to 1inch.
- ERC-20↔PSP22 mapping.

Phase 4: E2E Demos
- ETH → Substrate flow.
- Substrate → ETH flow.
- Demo runbook.

Phase 5: Hardening
- Timeouts/deposits tuning, retries, better logs.
- Neo4j updates automation.

Configuration Defaults (to override in .env/.json)
- ETH → Substrate: T1=30m, T2=20m; EVM deposit=0.005 ETH; Substrate deposit=0.1 native unit.
- Substrate block time assumption: 6–12s; convert minutes → blocks.
- First token pair: WETH (mainnet) ↔ PSP22 WETHx (local).

Open Items
- Final confirmation of timeouts/deposits.
- Mainnet RPC URL provisioning (env).
- Keys management: generate here and you fund, or you provide.
