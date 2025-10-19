import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
// import { Keyring } from "@polkadot/keyring";
import { ContractPromise } from "@polkadot/api-contract";

// User-provided details (replace with actual values)
const CONTRACT_ADDRESS = "0x4c063b4d405342c7bab244ef384213bec1e1d877"; // escrow contract
const ESCROW_FACTORY_ADDRESS = "0x75e742d4c46cd85f3dc1866335394b53eada6867";

const USER_SURI = "//Alice"; // Or your secret seed phrase

const abi_factory = {
  source: {
    hash: "0x488cf7b9bca3572f5be45e9bf01345084952a913810bcdb5c6d01ac75d610475",
    language: "ink! 6.0.0-alpha.4",
    compiler: "rustc 1.92.0-nightly",
    build_info: {
      build_mode: "Debug",
      cargo_contract_version: "6.0.0-alpha.4",
      rust_toolchain: "nightly-aarch64-apple-darwin",
    },
  },
  contract: {
    name: "htlc_factory",
    version: "0.1.0",
    authors: ["Cross-Chain Swap Team"],
    description:
      "ink! HTLC factory that instantiates htlc_escrow and optionally pulls PSP22 tokens via transfer_from",
    repository: "https://github.com/verkhohliad/cross-chain-swap",
    license: "Apache-2.0",
  },
  image: null,
  spec: {
    constructors: [
      {
        args: [
          {
            label: "escrow_code_hash",
            type: {
              displayName: ["CodeHash"],
              type: 0,
            },
          },
        ],
        default: false,
        docs: [
          "Provide the code hash of the HtlcEscrow contract on deployment.",
        ],
        label: "new",
        payable: false,
        returnType: {
          displayName: ["ink_primitives", "ConstructorResult"],
          type: 6,
        },
        selector: "0x9bae9d5e",
      },
    ],
    docs: [],
    environment: {
      accountId: {
        displayName: ["AccountId"],
        type: 16,
      },
      balance: {
        displayName: ["Balance"],
        type: 17,
      },
      blockNumber: {
        displayName: ["BlockNumber"],
        type: 19,
      },
      hash: {
        displayName: ["Hash"],
        type: 18,
      },
      nativeToEthRatio: 100000000,
      staticBufferSize: 16384,
      timestamp: {
        displayName: ["Timestamp"],
        type: 9,
      },
    },
    events: [
      {
        args: [
          {
            docs: [],
            indexed: false,
            label: "account",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "amount",
            type: {
              displayName: ["U256"],
              type: 10,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "asset_kind",
            type: {
              displayName: ["u8"],
              type: 2,
            },
          },
        ],
        docs: [],
        label: "Claimed",
        module_path: "htlc_escrow::htlc_escrow",
        signature_topic: null,
      },
      {
        args: [
          {
            docs: [],
            indexed: false,
            label: "account",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "amount",
            type: {
              displayName: ["U256"],
              type: 10,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "asset_kind",
            type: {
              displayName: ["u8"],
              type: 2,
            },
          },
        ],
        docs: [],
        label: "Refunded",
        module_path: "htlc_escrow::htlc_escrow",
        signature_topic: null,
      },
      {
        args: [
          {
            docs: [],
            indexed: false,
            label: "secret",
            type: {
              displayName: [],
              type: 1,
            },
          },
        ],
        docs: [],
        label: "SecretRevealed",
        module_path: "htlc_escrow::htlc_escrow",
        signature_topic: null,
      },
      {
        args: [
          {
            docs: [],
            indexed: false,
            label: "escrow",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "beneficiary",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "expiry",
            type: {
              displayName: ["u64"],
              type: 9,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "locked_amount",
            type: {
              displayName: ["U256"],
              type: 10,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "resolver_deposit",
            type: {
              displayName: ["U256"],
              type: 10,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "hashed_secret",
            type: {
              displayName: [],
              type: 1,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "is_psp22",
            type: {
              displayName: ["bool"],
              type: 15,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "psp22_token",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
        ],
        docs: [],
        label: "EscrowCreated",
        module_path: "htlc_factory::htlc_factory",
        signature_topic: null,
      },
    ],
    lang_error: {
      displayName: ["ink", "LangError"],
      type: 8,
    },
    messages: [
      {
        args: [
          {
            label: "beneficiary",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
          {
            label: "hashed_secret",
            type: {
              displayName: [],
              type: 1,
            },
          },
          {
            label: "expiry",
            type: {
              displayName: ["u64"],
              type: 9,
            },
          },
          {
            label: "resolver_deposit",
            type: {
              displayName: ["U256"],
              type: 10,
            },
          },
          {
            label: "salt",
            type: {
              displayName: ["Option"],
              type: 12,
            },
          },
        ],
        default: false,
        docs: [
          " Create a native-balance escrow.",
          " Attach value = locked_amount + resolver_deposit.",
        ],
        label: "create_native_escrow",
        mutates: true,
        payable: true,
        returnType: {
          displayName: ["ink", "MessageResult"],
          type: 13,
        },
        selector: "0x08556458",
      },
      {
        args: [
          {
            label: "token",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
          {
            label: "amount",
            type: {
              displayName: ["U256"],
              type: 10,
            },
          },
          {
            label: "beneficiary",
            type: {
              displayName: ["Address"],
              type: 3,
            },
          },
          {
            label: "hashed_secret",
            type: {
              displayName: [],
              type: 1,
            },
          },
          {
            label: "expiry",
            type: {
              displayName: ["u64"],
              type: 9,
            },
          },
          {
            label: "resolver_deposit",
            type: {
              displayName: ["U256"],
              type: 10,
            },
          },
          {
            label: "salt",
            type: {
              displayName: ["Option"],
              type: 12,
            },
          },
        ],
        default: false,
        docs: [
          " Create a PSP22 escrow by:",
          " 1) Instantiating escrow with endowment = resolver_deposit (attach value == resolver_deposit).",
          " 2) Pulling tokens from the caller into the new escrow via transfer_from (caller must approve this contract beforehand).",
        ],
        label: "create_psp22_escrow",
        mutates: true,
        payable: true,
        returnType: {
          displayName: ["ink", "MessageResult"],
          type: 13,
        },
        selector: "0x65a2abc7",
      },
      {
        args: [],
        default: false,
        docs: [" Returns the last created escrow address."],
        label: "get_last_escrow",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["ink", "MessageResult"],
          type: 13,
        },
        selector: "0x7eadcfe9",
      },
      {
        args: [],
        default: false,
        docs: [" Returns the configured escrow code hash."],
        label: "get_escrow_code_hash",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["ink", "MessageResult"],
          type: 14,
        },
        selector: "0xc4a5f3c5",
      },
    ],
  },
  storage: {
    root: {
      layout: {
        struct: {
          fields: [
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 0,
                },
              },
              name: "escrow_code_hash",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 3,
                },
              },
              name: "last_escrow",
            },
          ],
          name: "HtlcFactory",
        },
      },
      root_key: "0x00000000",
      ty: 5,
    },
  },
  types: [
    {
      id: 0,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 1,
                typeName: "[u8; 32]",
              },
            ],
          },
        },
        path: ["primitive_types", "H256"],
      },
    },
    {
      id: 1,
      type: {
        def: {
          array: {
            len: 32,
            type: 2,
          },
        },
      },
    },
    {
      id: 2,
      type: {
        def: {
          primitive: "u8",
        },
      },
    },
    {
      id: 3,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 4,
                typeName: "[u8; 20]",
              },
            ],
          },
        },
        path: ["primitive_types", "H160"],
      },
    },
    {
      id: 4,
      type: {
        def: {
          array: {
            len: 20,
            type: 2,
          },
        },
      },
    },
    {
      id: 5,
      type: {
        def: {
          composite: {
            fields: [
              {
                name: "escrow_code_hash",
                type: 0,
                typeName:
                  "<CodeHash as::ink::storage::traits::AutoStorableHint<::ink::\nstorage::traits::ManualKey<909067099u32, ()>,>>::Type",
              },
              {
                name: "last_escrow",
                type: 3,
                typeName:
                  "<Address as::ink::storage::traits::AutoStorableHint<::ink::\nstorage::traits::ManualKey<1560738042u32, ()>,>>::Type",
              },
            ],
          },
        },
        path: ["htlc_factory", "htlc_factory", "HtlcFactory"],
      },
    },
    {
      id: 6,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 7,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 8,
                  },
                ],
                index: 1,
                name: "Err",
              },
            ],
          },
        },
        params: [
          {
            name: "T",
            type: 7,
          },
          {
            name: "E",
            type: 8,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 7,
      type: {
        def: {
          tuple: [],
        },
      },
    },
    {
      id: 8,
      type: {
        def: {
          variant: {
            variants: [
              {
                index: 1,
                name: "CouldNotReadInput",
              },
            ],
          },
        },
        path: ["ink_primitives", "LangError"],
      },
    },
    {
      id: 9,
      type: {
        def: {
          primitive: "u64",
        },
      },
    },
    {
      id: 10,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 11,
                typeName: "[u64; 4]",
              },
            ],
          },
        },
        path: ["primitive_types", "U256"],
      },
    },
    {
      id: 11,
      type: {
        def: {
          array: {
            len: 4,
            type: 9,
          },
        },
      },
    },
    {
      id: 12,
      type: {
        def: {
          variant: {
            variants: [
              {
                index: 0,
                name: "None",
              },
              {
                fields: [
                  {
                    type: 1,
                  },
                ],
                index: 1,
                name: "Some",
              },
            ],
          },
        },
        params: [
          {
            name: "T",
            type: 1,
          },
        ],
        path: ["Option"],
      },
    },
    {
      id: 13,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 3,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 8,
                  },
                ],
                index: 1,
                name: "Err",
              },
            ],
          },
        },
        params: [
          {
            name: "T",
            type: 3,
          },
          {
            name: "E",
            type: 8,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 14,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 0,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 8,
                  },
                ],
                index: 1,
                name: "Err",
              },
            ],
          },
        },
        params: [
          {
            name: "T",
            type: 0,
          },
          {
            name: "E",
            type: 8,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 15,
      type: {
        def: {
          primitive: "bool",
        },
      },
    },
    {
      id: 16,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 1,
                typeName: "[u8; 32]",
              },
            ],
          },
        },
        path: ["ink_primitives", "types", "AccountId"],
      },
    },
    {
      id: 17,
      type: {
        def: {
          primitive: "u128",
        },
      },
    },
    {
      id: 18,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 1,
                typeName: "[u8; 32]",
              },
            ],
          },
        },
        path: ["ink_primitives", "types", "Hash"],
      },
    },
    {
      id: 19,
      type: {
        def: {
          primitive: "u32",
        },
      },
    },
  ],
  version: 6,
};

// * Sends a transaction and waits for its finalization on the chain.
// * @param {import('@polkadot/api/types').SubmittableExtrinsic} tx The extrinsic to sign and send.
// * @param {import('@polkadot/keyring/types').KeyringPair} account The account used to sign the transaction.
// * @returns {Promise<string>} The transaction hash (Hex string) upon finalization.
// */
async function waitForFinalization(tx, account) {
  const wsProvider = new WsProvider("wss://testnet-passet-hub.polkadot.io");
  const api = await ApiPromise.create({ provider: wsProvider });
  return new Promise(async (resolve, reject) => {
    let transactionHash = "";
    const unsub = await tx
      .signAndSend(account, (result) => {
        // Log the transaction hash as soon as it's available
        if (result.txHash) {
          transactionHash = result.txHash.toHex();
        }

        console.log(`Current status is ${result.status.type}`);

        if (result.status.isInBlock) {
          console.log(
            `Transaction included at blockHash ${result.status.asInBlock.toHex()}`
          );
          console.log(`Transaction hash: ${transactionHash}`);
        }

        if (result.status.isFinalized) {
          console.log(`\n✅ Transaction Finalized!`);
          console.log(`Final BlockHash: ${result.status.asFinalized.toHex()}`);
          console.log(`Final Transaction Hash: ${transactionHash}`);

          // Unsubscribe from the status updates
          unsub();

          if (result.dispatchError) {
            console.error(
              "Transaction failed with dispatch error:",
              result.dispatchError.toString()
            );
            // Extract error information if possible
            let errorInfo = "Unknown error";
            if (result.dispatchError.isModule) {
              const mod = result.dispatchError.asModule;
              // FIX: Use the passed API's registry to ensure it exists
              const { section, method } = api.registry.findMetaError(mod);
              errorInfo = `${section}.${method}`;
            }
            reject(new Error(`Transaction failed: ${errorInfo}`));
          } else {
            // Transaction finalized and no dispatch error means success
            resolve(transactionHash);
          }
        }
      })
      .catch((error) => {
        // Handle immediate submission errors (e.g., failed signing, network issue)
        console.error("Transaction submission failed:", error.message);
        unsub();
        reject(error);
      });
  });
}

async function main() {
  let api;
  try {
    // Connect to the Substrate node
    const wsProvider = new WsProvider("wss://testnet-passet-hub.polkadot.io");
    api = await ApiPromise.create({ provider: wsProvider });
    console.log(`Connected to chain: ${api.runtimeVersion.specName}`);

    const factory_contract = new ContractPromise(
      api,
      abi_factory,
      ESCROW_FACTORY_ADDRESS
    );

    // Create a keyring instance
    const keyring = new Keyring({ type: "sr25519" });

    // Add Alice to the keyring for testing (using the seed provided in the original code)
    const alice = keyring.addFromUri(
      "flight dust express talent mirror anchor style iron need labor spray kit"
    );

    // Random data for create_native_escrow call
    const escrowData = {
      // Beneficiary address (20-byte H160 type expected by ink! Address/AccountId)
      // This is a common test address in Polkadot-like EVM chains.
      beneficiary: "0x6bd3cd4c04b9899c0fee3db05b4971256e153b70",

      // Hashed secret (32 bytes)
      hashedSecret:
        "0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4",

      // Expiry timestamp (Unix timestamp in milliseconds converted to seconds)
      expiry: 1000, // 24 hours from now

      // Resolver deposit (as string with 12 decimals - assuming pAsset Hub native tokens have 12 decimals)
      resolverDeposit: "1000000000000",

      // Salt for deterministic address (optional, 32 bytes)
      salt: "",

      // Total value to transfer (locked_amount + resolver_deposit)
      // 5 tokens total (4 locked + 1 deposit)
      transferValue: "6000000000000",
    };

    console.log("--- 1. Querying for Gas Estimation (Dry Run) ---");

    // Use a large, safe gas limit for the query itself
    const queryGasLimit = api.registry.createType("WeightV2", {
      refTime: 3000000000000,
      proofSize: 131072,
    });

    const { gasRequired, storageDeposit, result, output } =
      await factory_contract.query.createNativeEscrow(
        alice.address, // Caller address
        {
          gasLimit: queryGasLimit,
          storageDepositLimit: null,
          value: escrowData.transferValue,
        },
        escrowData.beneficiary,
        escrowData.hashedSecret,
        escrowData.expiry,
        escrowData.resolverDeposit,
        escrowData.salt
      );

    console.log("Gas Required:", gasRequired.toHuman());
    console.log("Storage Deposit:", storageDeposit.toHuman());

    if (result.isOk) {
      const escrowAddress = output.toHuman().Ok;
      console.log(`Simulated Escrow Creation successful.`);
      console.log(`New Escrow Address (Simulation): ${escrowAddress}`);

      // --- 2. Sending Actual Transaction and Waiting ---

      // Construct the Extrinsic
      const tx = factory_contract.tx.createNativeEscrow(
        {
          gasLimit: gasRequired, // Use the required gas from the query
          storageDepositLimit: null,
          value: escrowData.transferValue,
        },
        escrowData.beneficiary,
        escrowData.hashedSecret,
        escrowData.expiry,
        escrowData.resolverDeposit,
        escrowData.salt
      );

      console.log("\n--- 2. Sending Transaction and Awaiting Finalization ---");

      // Await the promise to ensure the script does not exit until finalized
      const txHash = await waitForFinalization(tx, alice);

      // Log the Block Explorer link using the final hash
      console.log(
        `\n🔗 Block Explorer Link: https://blockscout-passet-hub.parity-testnet.parity.io/extrinsic/${txHash}`
      );
    } else {
      console.error("Query failed. Cannot proceed with transaction.");
      console.error("Query Error Result:", result.toHuman());
    }
  } catch (error) {
    console.error("\nAn error occurred during execution:", error.message);
  } finally {
    // Ensure disconnect happens only after all awaits are complete
    if (api) {
      console.log("\nDisconnecting API...");
      await api.disconnect();
    }
  }
}
// TODO: Fix fail with error
// Connected to chain: passet-hub
// --- 1. Querying for Gas Estimation (Dry Run) ---
// Gas Required: { refTime: '3,681,804,807', proofSize: '85,355' }
// Storage Deposit: { Charge: '3,828,000,000' }
// Simulated Escrow Creation successful.
// New Escrow Address (Simulation): 0x55b74878e685450d68560545f39ce6c2f7b4090c

// --- 2. Sending Transaction and Awaiting Finalization ---
// 2025-10-19 02:03:49        REGISTRY: Unknown signed extensions EthSetOrigin, StorageWeightReclaim found, treating them as no-effect
// 2025-10-19 02:03:49        API/INIT: RPC methods not decorated: chainHead_v1_body, chainHead_v1_call, chainHead_v1_continue, chainHead_v1_follow, chainHead_v1_header, chainHead_v1_stopOperation, chainHead_v1_storage, chainHead_v1_unfollow, chainHead_v1_unpin, chainSpec_v1_chainName, chainSpec_v1_genesisHash, chainSpec_v1_properties, transactionWatch_v1_submitAndWatch, transactionWatch_v1_unwatch, transaction_v1_broadcast, transaction_v1_stop
// Current status is Ready
// Current status is Broadcast
// Current status is InBlock
// Transaction included at blockHash 0xd8775837f6a486b6081e15a3417abf8e23f6cf2ee7665a32fb6b80540a4007d7
// Transaction hash: 0xa3df78fa60302f13fccbae096a37686ea4474522b050ca07eaa112c0fc64911e
// 2025-10-19 02:04:31          API-WS: disconnected from wss://testnet-passet-hub.polkadot.io: 1006:: Abnormal Closure
// Current status is Finalized

// ✅ Transaction Finalized!
// Final BlockHash: 0xd8775837f6a486b6081e15a3417abf8e23f6cf2ee7665a32fb6b80540a4007d7
// Final Transaction Hash: 0xa3df78fa60302f13fccbae096a37686ea4474522b050ca07eaa112c0fc64911e
// Transaction failed with dispatch error: {"module":{"index":60,"error":"0x1a000000"}}

// An error occurred during execution: Transaction failed: revive.ContractReverted
main().catch(console.error);
