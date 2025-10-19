const ethers = require("ethers");
const CC_SDK = require("@1inch/cross-chain-sdk");
const { SupportedChains } = require("@1inch/cross-chain-sdk");
const F_SDK = require("@1inch/fusion-sdk");
const { EscrowExtension } = require("@1inch/cross-chain-sdk");
const { EvmCrossChainOrder } = require("@1inch/cross-chain-sdk");
const { resolverAddress } = require("./constants");
const { getBytes, keccak256 } = require('ethers');
const bs_escrowFactory = require("./constants").base_sepolia.escrowFactory;
const resolver_address = require("./constants").resolverAddress;
const ERC20_TRUE = require("./constants").base_sepolia.ERC20_TRUE;
const limitOrderDomain = require("./constants").domain;
const limitOrderProtocol = require("./constants").limitOrderProtocol;
const USDC = require("./constants").base_sepolia.USDC;

const rpc =
  "https://base-sepolia.g.alchemy.com/v2/-nS9M81JxS_vHfz1wlWLIuSo0O6W_HMC";
const provider = new ethers.JsonRpcProvider(rpc);
const pkdProvider = new ethers.JsonRpcApiProvider();
const PrivateKey =
  "0x0fb46239b62883a77c88bdf62f69f29288347049016112ea7192ccb0e2bfb67b";
const wallet = new ethers.Wallet(PrivateKey, provider);
const coder = new ethers.AbiCoder();

Error.stackTraceLimit = 50;

function keccak256Hex(hexOrBytes) {
  const bytes = typeof hexOrBytes === 'string' ? getBytes(hexOrBytes) : hexOrBytes;
  return keccak256(bytes);
}

// for the sake of example, lets assume everyone is using stablecoins, so roughly 1:1 swaps

// for the sake of example, our wallet will be the maker and the resolver

// we've manually funded the resolver address with USDC so it passes the access token check

// random 32 byte value
const makerSecretBytes = Buffer.from(ethers.randomBytes(32));
const hashSecret = keccak256Hex(makerSecretBytes);
const makerSecret = "0x" + makerSecretBytes.toString("hex");
console.log("Maker secret:", makerSecret);
console.log('Hash of secret:', hashSecret);
function newEvmOrder(escrowFactory, orderInfo, escrowParams, details, extra) {
  const SupportedEVMChains = SupportedChains.filter(
    (chainId) => chainId !== 501
  );
  const postInteractionData = CC_SDK.SettlementPostInteractionData.new({
    whitelist: details.whitelist.map((i) => ({
      address: i.address.inner,
      allowFrom: i.allowFrom,
    })),
    resolvingStartTime:
      details.resolvingStartTime ?? BigInt(Date.now()) / 1000n,
  });
  if (
    !SupportedEVMChains.includes(escrowParams.dstChainId) &&
    !orderInfo.receiver
  ) {
    throw new Error("Receiver is required for non EVM chain");
  }
  const [complement, receiver] = orderInfo.receiver?.splitToParts() || [
    "0x00",
    CC_SDK.EvmAddress.ZERO,
  ];
  const ext = new EscrowExtension(
    escrowFactory,
    details.auction,
    postInteractionData,
    extra?.permit
      ? new Interaction(orderInfo.makerAsset.inner, extra.permit)
      : undefined,
    escrowParams.hashLock,
    escrowParams.dstChainId,
    orderInfo.takerAsset,
    escrowParams.srcSafetyDeposit,
    escrowParams.dstSafetyDeposit,
    escrowParams.timelocks,
    complement
  );

  return new EvmCrossChainOrder(
    ext,
    {
      ...orderInfo,
      receiver,
      takerAsset: CC_SDK.EvmAddress.fromString(ERC20_TRUE),
    },
    extra
  );
}
let now = BigInt(Date.now()) / 1000n;
console.log("order fillable in :" + (now + 1n));

async function main() {
  const order = newEvmOrder(
    CC_SDK.EvmAddress.fromString(bs_escrowFactory),
    // Order Info
    {
      salt: CC_SDK.randBigInt(1000n),
      maker: CC_SDK.EvmAddress.fromString(wallet.address),
      makingAmount: "1000000", // 1 USDC
      takingAmount: "999999", // 0.99999 USDC
      makerAsset: CC_SDK.EvmAddress.fromString(USDC), // USDC on Sepolia Base
      takerAsset: CC_SDK.EvmAddress.fromString(
        "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF"
      ), // may be as big as bytes32, evm fill shrinks takerAsset to a uint160
      receiver: CC_SDK.EvmAddress.fromString(wallet.address), // required for evm -> non-evm, may be as big as a bytes32
    },
    // immutables
    {
      hashLock: CC_SDK.HashLock.forSingleFill(makerSecret),
      //   * Intervals layout
      //   * | finality lock | private withdrawal | public withdrawal | private cancellation | public cancellation |
      //   * ^deployedAt
      timelocks: CC_SDK.TimeLocks.new({
        srcWithdrawal: 1n, // In theory must be bigger than block finality time
        srcPublicWithdrawal: 10n,
        srcCancellation: 13n,
        srcPublicCancellation: 14n,
        dstWithdrawal: 15n, // In theory must be bigger than block finality time
        dstPublicWithdrawal: 16n,
        dstCancellation: 17n,
        // anything after is public cancellation
      }),
      srcChainId: limitOrderDomain.srcChainId, // Sepolia Base
      dstChainId: 999, // your new non-evm ID.
      srcSafetyDeposit: ethers.parseEther("0.001"),
      dstSafetyDeposit: ethers.parseEther("0.001"),
    },
    // dutch auction, whitelist and fee details.
    {
      auction: new CC_SDK.AuctionDetails({
        initialRateBump: 0,
        points: [],
        duration: 10000000n, // legit forever
        startTime: now,
      }),
      // Your resolver address may be in the whitelist OR hold the access token to fill the order.
      whitelist: [
        {
          address: CC_SDK.EvmAddress.fromString(resolverAddress),
          allowFrom: 0n, // no delay from the start of the auction
        },
      ],
      resolvingStartTime: 0n,
    },
    // extra params
    {
      nonce: BigInt(ethers.randomBytes(4).join("")),
      allowPartialFills: false,
      allowMultipleFills: false,
    }
  );
  console.log("Full order data", order);

  const typedOrder = order.getTypedData(Number(limitOrderDomain.chainId));
  // YOU CANNOT USE THE DOMAIN FROM THE BUILT IN SDK FUNCTIONS.

  console.log("typedOrder ", typedOrder);
  const signature = await wallet.signTypedData(
    limitOrderDomain,
    { Order: typedOrder.types.Order },
    typedOrder.message
  );

  console.log("signature ", signature);

  const builtOrder = order.build();

  console.log("builtOrder ", builtOrder);
  const orderhash = await provider.call({
    to: limitOrderProtocol,
    data: new ethers.Interface([
      "function hashOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)) view returns (bytes32)",
    ]).encodeFunctionData("hashOrder", [
      [
        builtOrder.salt,
        builtOrder.maker,
        builtOrder.receiver,
        builtOrder.makerAsset,
        builtOrder.takerAsset,
        builtOrder.makingAmount,
        builtOrder.takingAmount,
        builtOrder.makerTraits,
      ],
    ]),
  });

  console.log("Order Hash:", orderhash);
  // gotten from `forge build` the example resolver: https://github.com/1inch/cross-chain-resolver-example/blob/master/contracts/src/Resolver.sol
  const resolverABI = require("./ResolverABI.json");
  const escrowFactoryABI = require("./EscrowFactoryABI.json");
  const ERC20ABIStub = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
  ];
  const resolverContract = new ethers.Contract(
    resolver_address,
    resolverABI,
    wallet
  );
  const escrowFactory = new ethers.Contract(
    bs_escrowFactory,
    escrowFactoryABI,
    provider
  ); // we only need view calls

  const usdcContract = new ethers.Contract(USDC, ERC20ABIStub, wallet);

  // maker of the order needs to approve to the limit order contract, the resolver also needs to hold usdc.
  // use https://faucet.circle.com/ to get base sepolia USDC. Base Sepolia USDC is also the access token for the escrow factory

  if (
    (await usdcContract.allowance(
      wallet.address,
      limitOrderDomain.verifyingContract
    )) < BigInt(order.makingAmount)
  ) {
    const approveTx = await usdcContract.approve(
      limitOrderDomain.verifyingContract,
      BigInt(order.makingAmount) * 100n
    );
    await approveTx.wait(1);
  }

  const fillAmount = BigInt(order.makingAmount);

  let takerTraits = CC_SDK.TakerTraits.default()
    .setExtension(order.extension)
    .setAmountMode(CC_SDK.AmountMode.maker)
    .setAmountThreshold(BigInt(order.takingAmount));

  console.log("Taker Traits ", takerTraits);

  let { args, trait } = takerTraits.encode();
  console.log(
    "order.escrowExtension.hashLockInfo",
    order.escrowExtension.hashLockInfo
  );
  const srcImmutables = order
    .toSrcImmutables(
      limitOrderDomain.chainId,
      new CC_SDK.EvmAddress(resolver_address),
      fillAmount.toString(),
      order.escrowExtension.hashLockInfo
    )
    .toJSON();

  console.log("srcImmutables ", srcImmutables);
  // unfortunately the SDK function to construct the srcImmutables cannot properly handle
  // the unique `domain` which means we must hash the order seperately.
  srcImmutables.orderHash = orderhash;
  console.log("srcImmutables", srcImmutables);

  let tempImmutables = { ...srcImmutables };
  // we need to apply the current time to the timelocks to compute the right escrow src (may vary by test run. You need to know the exact second the escrow will be deployed at
  // Note: add the escrow contract deploy timestamp (now) into the timelock variable.
  //  Here we use 2s as assumption of the time where the contract will be deployed from "now"
  tempImmutables.timelocks = (
    BigInt(tempImmutables.timelocks) |
    ((now + 2n) << 224n)
  ).toString();

  console.log("tempImmutables ", tempImmutables);
  const srcEscrowAddress = await escrowFactory.addressOfEscrowSrc(
    tempImmutables
  );

  console.log("Deploying src escrow at:", srcEscrowAddress);

  // start time is "now" so this should be immediately fillable
  // in prod you need to wait until the resolvingStartTime
  const tx = await resolverContract.deploySrc(
    srcImmutables,
    builtOrder,
    ethers.Signature.from(signature).r,
    ethers.Signature.from(signature).yParityAndS,
    fillAmount,
    trait,
    args,
    { value: BigInt(srcImmutables.safetyDeposit), gasLimit: 2000000 }
  );

  console.log("deploySrc ", tx);

  // process.exit(0);

  // The txn emits the event `0x0e534c62f0afd2fa0f0fa71198e8aa2d549f24daf2bb47de0d5486c7ce9288ca`
  // which is `SrcDeployed` containing the srcImmutables and ImmutablesComplement
  // https://github.com/1inch/cross-chain-swap/blob/d0a59ab2c4b6be5c9769d5775769681873fcf162/contracts/interfaces/IEscrowFactory.sol#L44

  // Example log https://sepolia.basescan.org/tx/0x4230b709f4439994f1c18a770aa5f079717bdb05f23eda6c33a3a991c5b78955#eventlog
  // the respective resolver contract: 0x82784dbb47f4b604ab997d039701d6e34df5c3c7
  console.log("Deployed src escrow at:", srcEscrowAddress);

  // *** This is what you do, now that you have all the source information
  // *** build out the destination escrow!

  const dstEscrowFactory = new ethers.Contract(
    bs_escrowFactory,
    escrowFactoryABI,
    provider
  );

  // you need to first deploy the dst escrow contract.
  // next you wait for finality on both chains. since this is an example, waiting for a second should be enough
  // just make sure the timelocks are dynamically changeable per-order

  // next, make sure the dstEscrow is valid by checking it's immutables against the srcEscrow immutables
  // Then you "share" the secret the user made with the resolver
  // then the resolver settles the dst escrow

  // now that the dstEscrow is settled, the resolver can settle the srcEscrow with the same secret!
  // *** ok, lets continue fufilling the source escrow only if the destination escrow is valid!

  // srcEscrow won't be withdrawable till resolvingStartTime + srcWithdrawal timelock
  // lets wait if we need to
  //   console.log(
  //     "Should settle at timestamp:",
  //     srcImmutables.resolvingStartTime + srcImmutables.srcWithdrawal
  //   );
  //   if (
  //     BigInt(Date.now()) / 1000n <
  //     srcImmutables.resolvingStartTime + srcImmutables.srcWithdrawal
  //   ) {
  //     await setTimeout(() => {}, 2000); // wait until the withdrawal timelock passes, here it is constant but in prod you need to dynamically wait
  //   }

  //   const srcWithdrawTx = await resolverContract.withdraw(
  //     srcEscrowAddress,
  //     makerSecret,
  //     srcImmutables
  //   );
  //   console.log("Withdrew from src escrow:", srcWithdrawTx);
}

main();
