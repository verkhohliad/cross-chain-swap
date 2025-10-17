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
	cd $(ESCROW_DIR) && cargo contract upload --url $(NODE_URL) --suri "$(SURI)" --execute --skip-confirm | tee upload.out
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
