import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
// import { Keyring } from "@polkadot/keyring";
import { ContractPromise } from "@polkadot/api-contract";

// User-provided details (replace with actual values)
const CONTRACT_ADDRESS = "0x4c063b4d405342c7bab244ef384213bec1e1d877";

const USER_SURI = "//Alice"; // Or your secret seed phrase

// The ABI of the contract, which you should have from the contract compilation.
// This is a placeholder and should be replaced with the actual ABI.
const abi = {
  source: {
    hash: "0x68eaef05404a5f25920068eaaaf771b608056c66f060a01a0a84c87103af039d",
    language: "ink! 6.0.0-alpha.4",
    compiler: "rustc 1.92.0-nightly",
    build_info: {
      build_mode: "Debug",
      cargo_contract_version: "6.0.0-alpha.4",
      rust_toolchain: "nightly-aarch64-apple-darwin",
    },
  },
  contract: {
    name: "htlc_escrow",
    version: "0.1.0",
    authors: ["Cross-Chain Swap Team"],
    description: "ink! HTLC escrow for native/PSP22 on Substrate parachains",
    repository: "https://github.com/verkhohliad/cross-chain-swap",
    license: "Apache-2.0",
  },
  image: null,
  spec: {
    constructors: [
      {
        args: [
          {
            label: "beneficiary",
            type: {
              displayName: ["Address"],
              type: 0,
            },
          },
          {
            label: "hashed_secret",
            type: {
              displayName: [],
              type: 8,
            },
          },
          {
            label: "expiry",
            type: {
              displayName: ["u64"],
              type: 3,
            },
          },
          {
            label: "resolver_deposit",
            type: {
              displayName: ["U256"],
              type: 4,
            },
          },
        ],
        default: false,
        docs: [
          "Constructor for a native-balance escrow.",
          "Must attach value = locked_amount + resolver_deposit.",
        ],
        label: "new_native",
        payable: true,
        returnType: {
          displayName: ["ink_primitives", "ConstructorResult"],
          type: 10,
        },
        selector: "0x4e7f4565",
      },
      {
        args: [
          {
            label: "token",
            type: {
              displayName: ["Address"],
              type: 0,
            },
          },
          {
            label: "amount",
            type: {
              displayName: ["U256"],
              type: 4,
            },
          },
          {
            label: "beneficiary",
            type: {
              displayName: ["Address"],
              type: 0,
            },
          },
          {
            label: "hashed_secret",
            type: {
              displayName: [],
              type: 8,
            },
          },
          {
            label: "expiry",
            type: {
              displayName: ["u64"],
              type: 3,
            },
          },
          {
            label: "resolver_deposit",
            type: {
              displayName: ["U256"],
              type: 4,
            },
          },
        ],
        default: false,
        docs: [
          "Constructor for a PSP22 escrow.",
          "Must attach value = resolver_deposit (PSP22 are transferred by factory).",
        ],
        label: "new_psp22",
        payable: true,
        returnType: {
          displayName: ["ink_primitives", "ConstructorResult"],
          type: 10,
        },
        selector: "0x254c0d34",
      },
    ],
    docs: [],
    environment: {
      accountId: {
        displayName: ["AccountId"],
        type: 21,
      },
      balance: {
        displayName: ["Balance"],
        type: 22,
      },
      blockNumber: {
        displayName: ["BlockNumber"],
        type: 24,
      },
      hash: {
        displayName: ["Hash"],
        type: 23,
      },
      nativeToEthRatio: 100000000,
      staticBufferSize: 16384,
      timestamp: {
        displayName: ["Timestamp"],
        type: 3,
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
              type: 0,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "amount",
            type: {
              displayName: ["U256"],
              type: 4,
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
              type: 0,
            },
          },
          {
            docs: [],
            indexed: false,
            label: "amount",
            type: {
              displayName: ["U256"],
              type: 4,
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
              type: 8,
            },
          },
        ],
        docs: [],
        label: "SecretRevealed",
        module_path: "htlc_escrow::htlc_escrow",
        signature_topic: null,
      },
    ],
    lang_error: {
      displayName: ["ink", "LangError"],
      type: 12,
    },
    messages: [
      {
        args: [],
        default: false,
        docs: [" Returns a snapshot of escrow info."],
        label: "get_info",
        mutates: false,
        payable: false,
        returnType: {
          displayName: ["ink", "MessageResult"],
          type: 13,
        },
        selector: "0x67889d2b",
      },
      {
        args: [
          {
            label: "secret",
            type: {
              displayName: [],
              type: 8,
            },
          },
        ],
        default: false,
        docs: [" Claim the escrow with the correct secret before expiry."],
        label: "claim",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["ink", "MessageResult"],
          type: 15,
        },
        selector: "0xb388803f",
      },
      {
        args: [],
        default: false,
        docs: [" Refund to initiator after expiry if not claimed."],
        label: "refund",
        mutates: true,
        payable: false,
        returnType: {
          displayName: ["ink", "MessageResult"],
          type: 18,
        },
        selector: "0xa5a47441",
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
              name: "initiator",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 0,
                },
              },
              name: "beneficiary",
            },
            {
              layout: {
                array: {
                  layout: {
                    leaf: {
                      key: "0x00000000",
                      ty: 2,
                    },
                  },
                  len: 32,
                  offset: "0x00000000",
                },
              },
              name: "hashed_secret",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 3,
                },
              },
              name: "expiry",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 4,
                },
              },
              name: "locked_amount",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 4,
                },
              },
              name: "resolver_deposit",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 6,
                },
              },
              name: "claimed",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 6,
                },
              },
              name: "refunded",
            },
            {
              layout: {
                enum: {
                  dispatchKey: "0x00000000",
                  name: "AssetKind",
                  variants: {
                    0: {
                      fields: [],
                      name: "Native",
                    },
                    1: {
                      fields: [],
                      name: "PSP22",
                    },
                  },
                },
              },
              name: "asset_kind",
            },
            {
              layout: {
                leaf: {
                  key: "0x00000000",
                  ty: 0,
                },
              },
              name: "psp22_token",
            },
          ],
          name: "HtlcEscrow",
        },
      },
      root_key: "0x00000000",
      ty: 7,
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
                typeName: "[u8; 20]",
              },
            ],
          },
        },
        path: ["primitive_types", "H160"],
      },
    },
    {
      id: 1,
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
          primitive: "u64",
        },
      },
    },
    {
      id: 4,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 5,
                typeName: "[u64; 4]",
              },
            ],
          },
        },
        path: ["primitive_types", "U256"],
      },
    },
    {
      id: 5,
      type: {
        def: {
          array: {
            len: 4,
            type: 3,
          },
        },
      },
    },
    {
      id: 6,
      type: {
        def: {
          primitive: "bool",
        },
      },
    },
    {
      id: 7,
      type: {
        def: {
          composite: {
            fields: [
              {
                name: "initiator",
                type: 0,
                typeName:
                  "<Address as::ink::storage::traits::AutoStorableHint<::ink::\nstorage::traits::ManualKey<984646895u32, ()>,>>::Type",
              },
              {
                name: "beneficiary",
                type: 0,
                typeName:
                  "<Address as::ink::storage::traits::AutoStorableHint<::ink::\nstorage::traits::ManualKey<1633759986u32, ()>,>>::Type",
              },
              {
                name: "hashed_secret",
                type: 8,
                typeName:
                  "<[u8; 32] as::ink::storage::traits::AutoStorableHint<::ink::\nstorage::traits::ManualKey<4223147187u32, ()>,>>::Type",
              },
              {
                name: "expiry",
                type: 3,
                typeName:
                  "<u64 as::ink::storage::traits::AutoStorableHint<::ink::storage\n::traits::ManualKey<2502394902u32, ()>,>>::Type",
              },
              {
                name: "locked_amount",
                type: 4,
                typeName:
                  "<U256 as::ink::storage::traits::AutoStorableHint<::ink::storage\n::traits::ManualKey<3637826642u32, ()>,>>::Type",
              },
              {
                name: "resolver_deposit",
                type: 4,
                typeName:
                  "<U256 as::ink::storage::traits::AutoStorableHint<::ink::storage\n::traits::ManualKey<2191773917u32, ()>,>>::Type",
              },
              {
                name: "claimed",
                type: 6,
                typeName:
                  "<bool as::ink::storage::traits::AutoStorableHint<::ink::storage\n::traits::ManualKey<3224369312u32, ()>,>>::Type",
              },
              {
                name: "refunded",
                type: 6,
                typeName:
                  "<bool as::ink::storage::traits::AutoStorableHint<::ink::storage\n::traits::ManualKey<742760621u32, ()>,>>::Type",
              },
              {
                name: "asset_kind",
                type: 9,
                typeName:
                  "<AssetKind as::ink::storage::traits::AutoStorableHint<::ink::\nstorage::traits::ManualKey<3094287999u32, ()>,>>::Type",
              },
              {
                name: "psp22_token",
                type: 0,
                typeName:
                  "<Address as::ink::storage::traits::AutoStorableHint<::ink::\nstorage::traits::ManualKey<3499754801u32, ()>,>>::Type",
              },
            ],
          },
        },
        path: ["htlc_escrow", "htlc_escrow", "HtlcEscrow"],
      },
    },
    {
      id: 8,
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
      id: 9,
      type: {
        def: {
          variant: {
            variants: [
              {
                index: 0,
                name: "Native",
              },
              {
                index: 1,
                name: "PSP22",
              },
            ],
          },
        },
        path: ["htlc_escrow", "htlc_escrow", "AssetKind"],
      },
    },
    {
      id: 10,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 11,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 12,
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
            type: 11,
          },
          {
            name: "E",
            type: 12,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 11,
      type: {
        def: {
          tuple: [],
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
      id: 13,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 14,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 12,
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
            type: 14,
          },
          {
            name: "E",
            type: 12,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 14,
      type: {
        def: {
          composite: {
            fields: [
              {
                name: "initiator",
                type: 0,
                typeName: "Address",
              },
              {
                name: "beneficiary",
                type: 0,
                typeName: "Address",
              },
              {
                name: "hashed_secret",
                type: 8,
                typeName: "[u8; 32]",
              },
              {
                name: "expiry",
                type: 3,
                typeName: "u64",
              },
              {
                name: "locked_amount",
                type: 4,
                typeName: "U256",
              },
              {
                name: "resolver_deposit",
                type: 4,
                typeName: "U256",
              },
              {
                name: "claimed",
                type: 6,
                typeName: "bool",
              },
              {
                name: "refunded",
                type: 6,
                typeName: "bool",
              },
              {
                name: "now",
                type: 3,
                typeName: "u64",
              },
              {
                name: "asset_kind",
                type: 2,
                typeName: "u8",
              },
              {
                name: "psp22_token",
                type: 0,
                typeName: "Address",
              },
            ],
          },
        },
        path: ["htlc_escrow", "htlc_escrow", "EscrowInfo"],
      },
    },
    {
      id: 15,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 16,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 12,
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
            type: 16,
          },
          {
            name: "E",
            type: 12,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 16,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 11,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 17,
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
            type: 11,
          },
          {
            name: "E",
            type: 17,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 17,
      type: {
        def: {
          variant: {
            variants: [
              {
                index: 0,
                name: "AlreadyFinalized",
              },
              {
                index: 1,
                name: "Expired",
              },
              {
                index: 2,
                name: "BadSecret",
              },
              {
                index: 3,
                name: "NativeTransferFailed",
              },
              {
                index: 4,
                name: "PSP22TransferFailed",
              },
            ],
          },
        },
        path: ["htlc_escrow", "htlc_escrow", "ClaimError"],
      },
    },
    {
      id: 18,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 19,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 12,
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
            type: 19,
          },
          {
            name: "E",
            type: 12,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 19,
      type: {
        def: {
          variant: {
            variants: [
              {
                fields: [
                  {
                    type: 11,
                  },
                ],
                index: 0,
                name: "Ok",
              },
              {
                fields: [
                  {
                    type: 20,
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
            type: 11,
          },
          {
            name: "E",
            type: 20,
          },
        ],
        path: ["Result"],
      },
    },
    {
      id: 20,
      type: {
        def: {
          variant: {
            variants: [
              {
                index: 0,
                name: "AlreadyFinalized",
              },
              {
                index: 1,
                name: "NotExpired",
              },
              {
                index: 2,
                name: "NativeTransferFailed",
              },
              {
                index: 3,
                name: "PSP22TransferFailed",
              },
            ],
          },
        },
        path: ["htlc_escrow", "htlc_escrow", "RefundError"],
      },
    },
    {
      id: 21,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 8,
                typeName: "[u8; 32]",
              },
            ],
          },
        },
        path: ["ink_primitives", "types", "AccountId"],
      },
    },
    {
      id: 22,
      type: {
        def: {
          primitive: "u128",
        },
      },
    },
    {
      id: 23,
      type: {
        def: {
          composite: {
            fields: [
              {
                type: 8,
                typeName: "[u8; 32]",
              },
            ],
          },
        },
        path: ["ink_primitives", "types", "Hash"],
      },
    },
    {
      id: 24,
      type: {
        def: {
          primitive: "u32",
        },
      },
    },
  ],
  version: 6,
};

async function main() {
  // Connect to the local Substrate node
  const wsProvider = new WsProvider("wss://testnet-passet-hub.polkadot.io");
  const api = await ApiPromise.create({ provider: wsProvider });

  // // Retrieve the account balance & nonce via the system module
  // const { nonce, data: balance } = await api.query.system.account(
  //   CONTRACT_ADDRESS
  // );
  // const now = await api.query.timestamp.now();

  // console.log(`${now}: balance of ${balance.free} and a nonce of ${nonce}`);

  const contract = new ContractPromise(api, abi, CONTRACT_ADDRESS);

  // maximum gas to be consumed for the call. if limit is too small the call will fail.
  const gasLimit = api.registry.createType("WeightV2", {
    refTime: 1000000000,
    proofSize: 50000,
  }); // A more realistic initial gas limit  // a limit to how much Balance to be used to pay for the storage created by the contract call
  // if null is passed, unlimited balance can be used
  const storageDepositLimit = null;
  // balance to transfer to the contract account. use only with payable messages, will fail otherwise.
  // formerly know as "endowment"
  const value = api.registry.createType("Balance", 1000);

  // Create a keyring instance
  const keyring = new Keyring({ type: "sr25519" });

  // Add Alice to the keyring for testing
  const alice = keyring.addFromUri("//Alice");

  // Query the get_info method to read contract state including now() value
  const { gasRequired, storageDeposit, result, output } =
    await contract.query.getInfo(alice.address, {
      gasLimit,
      storageDepositLimit,
    });

  // The actual result from RPC as `ContractExecResult`
  console.log("Query result:", result.toHuman());

  // the gas consumed for contract execution
  console.log("Gas required:", gasRequired.toHuman());

  // check if the call was successful
  if (result.isOk) {
    // output the return value which includes the now() function result
    const escrowInfo = output.toHuman();
    console.log("Contract info:", escrowInfo);
    console.log("Current block number (now):", escrowInfo.now);
  } else {
    console.error("Error calling getInfo:", result.asErr);
  }

  // Disconnect from the node
  await api.disconnect();
}

main().catch(console.error);
