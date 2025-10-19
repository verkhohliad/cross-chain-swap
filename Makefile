# ===========================
# Cross-Chain Swap (Polkadot side) - Makefile
# Requirements:
#  - docker & docker-compose
#  - rust + cargo-contract
#  - node >= 18 (for scripts)
#  - jq (for some parsing)
# ===========================

# ---------- Config ----------
NODE_URL ?= ws://127.0.0.1:9944
SURI ?= //Alice
ESCROW_CODE_HASH_FILE := .escrow_code_hash

# Directories
SUBSTRATE_DOCKER := scripts/local-substrate/docker-compose.yml
PSP22_DIR := contracts/ink/psp22
ESCROW_DIR := contracts/ink/htlc-escrow
FACTORY_DIR := contracts/ink/htlc-factory

# Node script dirs
SUBSTRATE_SCRIPTS_DIR := scripts/substrate
EVM_SCRIPTS_DIR := scripts/evm

# ---------- Help ----------
.PHONY: help
help:
	@echo "Makefile targets:"
	@echo "  substrate-up         - Start local Substrate Contracts node (docker)"
	@echo "  substrate-logs       - Tail logs for local node"
	@echo "  substrate-down       - Stop local node"
	@echo "  substrate-wait       - Wait until node RPC is ready"
	@echo "  substrate-faucet     - Send native funds from dev faucet to a target SS58 address"
	@echo "  build-ink            - Build all ink! contracts (PSP22, HTLC Escrow, HTLC Factory)"
	@echo "  upload-escrow        - Upload HTLC Escrow code, write code hash to $(ESCROW_CODE_HASH_FILE)"
	@echo "  upload-factory       - Upload HTLC Factory code"
	@echo "  instantiate-factory  - Instantiate Factory (requires $(ESCROW_CODE_HASH_FILE))"
	@echo "  clean-artifacts      - Remove previous build artifacts"
	@echo ""
	@echo "Variables:"
	@echo "  NODE_URL=$(NODE_URL)"
	@echo "  SURI=$(SURI)"
	@echo ""
	@echo "Usage examples:"
	@echo "  make substrate-up"
	@echo "  make substrate-wait"
	@echo "  make build-ink"
	@echo "  make upload-escrow SURI=//Alice NODE_URL=$(NODE_URL)"
	@echo "  make instantiate-factory SURI=//Alice NODE_URL=$(NODE_URL)"

# ---------- Substrate Node (Docker) ----------
.PHONY: substrate-up
substrate-up:
	docker compose -f $(SUBSTRATE_DOCKER) up -d

.PHONY: substrate-logs
substrate-logs:
	docker compose -f $(SUBSTRATE_DOCKER) logs -f

.PHONY: substrate-down
substrate-down:
	docker compose -f $(SUBSTRATE_DOCKER) down

# Wait until the node RPC is responding
.PHONY: substrate-wait
substrate-wait:
	@echo "Waiting for $(NODE_URL) ..."
	@node -e "const Ws=require('ws');let ok=false;let t=setTimeout(()=>{console.error('Timeout waiting for $(NODE_URL)');process.exit(1)},15000);let ws=new Ws('$(NODE_URL)');ws.on('open',()=>{ok=true;clearTimeout(t);ws.terminate();console.log('RPC is up: $(NODE_URL)')});ws.on('error',()=>{});"

# ---------- Substrate Faucet (dev) ----------
# Requires Node deps in scripts/substrate (see 'install-substrate-scripts')
.PHONY: install-substrate-scripts
install-substrate-scripts:
	cd $(SUBSTRATE_SCRIPTS_DIR) && npm i

# make substrate-faucet ADDR=<ss58 address> AMOUNT=<plancks>
# Defaults: AMOUNT=1000000000000 (1 unit if decimals=12)
ADDR ?=
AMOUNT ?= 1000000000000
.PHONY: substrate-faucet
substrate-faucet: install-substrate-scripts
	@if [ -z "$(ADDR)" ]; then echo "ERR: provide ADDR=<ss58>"; exit 1; fi
	cd $(SUBSTRATE_SCRIPTS_DIR) && NODE_URL=$(NODE_URL) SURI=$(SURI) ADDR=$(ADDR) AMOUNT=$(AMOUNT) npx ts-node faucet.ts

# ---------- ink! Build ----------
.PHONY: build-ink
build-ink:
	cd $(PSP22_DIR) && cargo contract build
	cd $(ESCROW_DIR) && cargo contract build
	cd $(FACTORY_DIR) && cargo contract build

.PHONY: clean-artifacts
clean-artifacts:
	rm -rf $(PSP22_DIR)/target/ink $(ESCROW_DIR)/target/ink $(FACTORY_DIR)/target/ink || true
	rm -f $(ESCROW_CODE_HASH_FILE)

# ---------- Upload & Instantiate using cargo-contract ----------
# NOTE: cargo-contract v3+ is required.
# Upload HTLC Escrow code and capture the code hash.
.PHONY: upload-escrow
upload-escrow:
	@echo "Uploading HTLC Escrow code to $(NODE_URL) ..."
	cd $(ESCROW_DIR) && cargo contract instantiate --args 0x1111111111111111111111111111111111111111 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 1000 1000000000000 --constructor new_native --value 6000000000000 --suri //Alice -x --skip-confirm | tee upload.out
	@# Try to extract code hash from the output (fallback to grep first 0x...32 bytes)
	@cd $(ESCROW_DIR) && cat upload.out | grep -Eo '0x[0-9a-fA-F]{64}' | tail -n 1 > ../../$(ESCROW_CODE_HASH_FILE)
	@echo "Saved escrow code hash to $(ESCROW_CODE_HASH_FILE): $$(cat $(ESCROW_CODE_HASH_FILE))"

.PHONY: upload-factory
upload-factory:
	@echo "Uploading HTLC Factory code to $(NODE_URL) ..."
	cd $(FACTORY_DIR) && cargo contract upload --url $(NODE_URL) --suri "$(SURI)" --execute --skip-confirm

# Instantiate the Factory passing Escrow Code Hash as constructor arg
.PHONY: instantiate-factory
instantiate-factory:
	@if [ ! -f "$(ESCROW_CODE_HASH_FILE)" ]; then echo "ERR: $(ESCROW_CODE_HASH_FILE) not found. Run 'make upload-escrow' first."; exit 1; fi
	@ESC_HASH=$$(cat $(ESCROW_CODE_HASH_FILE)); \
	echo "Instantiating Factory with escrow code hash $$ESC_HASH"; \
	cd $(FACTORY_DIR) && cargo contract instantiate --url $(NODE_URL) --suri "$(SURI)" --constructor new --args $$ESC_HASH --execute --skip-confirm

# ---------- EVM Example ----------
.PHONY: install-evm-scripts
install-evm-scripts:
	cd $(EVM_SCRIPTS_DIR) && npm i

# Run the EVM example (requires env PrivateKey and correct constants.js)
.PHONY: evm-example
evm-example: install-evm-scripts
	cd $(EVM_SCRIPTS_DIR) && node evm_example.js

# ---------- Polkadot Helpers (cargo-contract) ----------
# Editable variables for testnet flow (override via CLI: make VAR=value target)
NODE_URL            ?= wss://testnet-passet-hub.polkadot.io
SURI                ?= dice devote amateur toss apart replace summer minor order humor derive turtle
FACTORY             ?= 0xc601d44ee64d20d9b9fbc67b5592219fea78faac
PSP22               ?= 0xdb3934c0342637c9dcf29911ec070a04310c9976
BENEFICIARY         ?= 0x1111111111111111111111111111111111111111
SECRET              ?= 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
HASH                ?= 0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4
AMOUNT              ?= 1000
RESOLVER_DEPOSIT    ?= 10000
EXPIRY_TTL          ?= 1000
SALT                ?= None
LAST_FILE           ?= .last_escrow

.PHONY: approve
approve:
	@echo "Approve factory $(FACTORY) to spend $(AMOUNT) on token $(PSP22)"
	cargo contract call --contract $(PSP22) --message approve --args $(FACTORY) $(AMOUNT) --suri "$(SURI)" --url $(NODE_URL) -x --skip-confirm

.PHONY: create-psp22-escrow
create-psp22-escrow:
	@echo "Create PSP22 escrow via factory $(FACTORY) with amount=$(AMOUNT), beneficiary=$(BENEFICIARY)"
	cargo contract call --contract $(FACTORY) --message create_psp22_escrow --args $(PSP22) $(AMOUNT) $(BENEFICIARY) $(HASH) $(EXPIRY_TTL) $(RESOLVER_DEPOSIT) $(SALT) --value $(RESOLVER_DEPOSIT) --skip-confirm -x --url $(NODE_URL) --suri "$(SURI)"

.PHONY: get-last
get-last:
	@echo "Querying last escrow from factory $(FACTORY) ..."
	@LAST_ESCROW=$$(cargo contract call --contract $(FACTORY) --message get_last_escrow --url $(NODE_URL) --suri "$(SURI)" | sed -n 's/.*Result Ok(\(0x[0-9a-fA-F]\+\)).*/\1/p'); \
	if [ -z "$$LAST_ESCROW" ]; then echo "Failed to parse last escrow"; exit 1; fi; \
	echo "$$LAST_ESCROW" > $(LAST_FILE); \
	echo "Saved last escrow to $(LAST_FILE): $$LAST_ESCROW"

.PHONY: show-last
show-last:
	@if [ ! -f "$(LAST_FILE)" ]; then echo "No $(LAST_FILE) found. Run 'make get-last' first."; exit 1; fi
	@echo "$$(cat $(LAST_FILE))"

.PHONY: claim-last
claim-last:
	@if [ ! -f "$(LAST_FILE)" ]; then echo "No $(LAST_FILE) found. Run 'make get-last' first."; exit 1; fi
	@ESC=$$(cat $(LAST_FILE)); \
	echo "Claiming escrow $$ESC with secret $(SECRET) ..."; \
	cargo contract call --contract $$ESC --message claim --args $(SECRET) --skip-confirm --url $(NODE_URL) --suri "$(SURI)" -x

.PHONY: balance-of
balance-of:
	@echo "PSP22 balance_of($(BENEFICIARY)) on token $(PSP22)"
	cargo contract call --contract $(PSP22) --message balance_of --args $(BENEFICIARY) --suri "$(SURI)" --url $(NODE_URL) --skip-confirm

.PHONY: info-last
info-last:
	@if [ ! -f "$(LAST_FILE)" ]; then echo "No $(LAST_FILE) found. Run 'make get-last' first."; exit 1; fi
	@ESC=$$(cat $(LAST_FILE)); \
	echo "Escrow info for $$ESC"; \
	cargo contract call --contract $$ESC --message get_info --url $(NODE_URL) --suri "$(SURI)" --skip-confirm
