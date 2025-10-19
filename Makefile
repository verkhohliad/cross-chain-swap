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
