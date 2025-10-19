const ethers = require("ethers");
//const EscrowSrcABI = require("./EscrowSrcABI.json");
//const ERC20ABI = require("./ERC20ABI.json");

const PrivateKey = ""; // Paste

const erc20ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const escrowSrcABI = [
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "secret",
        type: "bytes32",
      },
      {
        components: [
          {
            internalType: "bytes32",
            name: "orderHash",
            type: "bytes32",
          },
          {
            internalType: "bytes32",
            name: "hashlock",
            type: "bytes32",
          },
          {
            internalType: "uint256",
            name: "maker",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "taker",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "token",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "safetyDeposit",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "timelocks",
            type: "uint256",
          },
          {
            internalType: "bytes",
            name: "parameters",
            type: "bytes",
          },
        ],
        internalType: "struct Immutables",
        name: "immutables",
        type: "tuple",
      },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

async function main() {
  // create instance
  const rpc = "https://1rpc.io/sepolia";
  const USDCContractAddress = "0x036cbd53842c5426634e7929541ec2318f3dcf7e";
  const escrowSrcContract = "0x8eFF9EedBF76DA48906d88117Ab768D45d81a2C1"; // Paste

  const provider = new ethers.JsonRpcProvider(rpc);
  const secret = "0x31a055195c3c63d27815b603e3f282e820cd3fb5b4f2f1851eb184c8591067dc"; // Paste
  const takerAddress = "0x82784dbb47f4b604ab997d039701d6e34df5c3c7"; // Paste

  const wallet = new ethers.Wallet(PrivateKey, provider);

  // call escrowSrc.withdraw
  const escrowSrcConract = new ethers.Contract(
    escrowSrcContract,
    escrowSrcABI,
    wallet
  );

  const USDCContract = new ethers.Contract(
    USDCContractAddress,
    erc20ABI,
    wallet
  );
  const initialBalance = await USDCContract.balanceOf(takerAddress);
  console.log("Taker Initial Balance ", initialBalance);
  // from temporary hash

  //   struct Immutables {
  //     bytes32 orderHash;
  //     bytes32 hashlock;  // Hash of the secret.
  //     Address maker;
  //     Address taker;
  //     Address token;
  //     uint256 amount;
  //     uint256 safetyDeposit;
  //     Timelocks timelocks;
  //     bytes parameters;  // For now only EscrowDst.withdraw() uses it.
  // }

  // Paste the information from tempImmutables
  // TODO: update value
  const immutable =  {
    orderHash: '0x69a32590926814ea4a529f35be9ac4e8429d4709cf0048459036bc9bb5daf975',
    hashlock: '0xbd6167f85034e8f1db12c124c95f30e36dda8cd85b50a85984a6126ec23efa6f',
    maker: '0x5f9e06fd34a67637315e7dce6866a4d3783e014e',
    taker: '0x82784dbb47f4b604ab997d039701d6e34df5c3c7',
    token: '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
    amount: '1000000',
    safetyDeposit: '1000000000000000',
    timelocks: '47472088109032891527024366705953217860096283130198018245330094576979046039553',
    parameters: ''
  }

  // check balance
  const withdrawTx = await escrowSrcConract.withdraw(secret, immutable);

  const afterBalance = await USDCContract.balanceOf(takerAddress);
  console.log("Taker after Balance ", afterBalance);
}

main()