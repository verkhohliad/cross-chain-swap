require('dotenv').config();

// EVM-side example for 1inch Fusion+ cross-chain (ETH ↔ Polkadot demo)
// This mirrors the user's provided snippet, with constants pulled from ./constants.js
// NOTE: You MUST provide correct ABIs for Resolver and EscrowFactory in the files:
//   - ./ResolverABI.json
//   - ./EscrowFactoryABI.json
// and set RESOLVER_ADDRESS in .env or constants.js.
//
// Also ensure your wallet PrivateKey is funded with Base Sepolia ETH and USDC and the resolver is properly deployed.

const { ethers } = require('ethers');
const CC_SDK = require('@1inch/cross-chain-sdk');
const { SupportedChains } = require('@1inch/cross-chain-sdk');
const F_SDK = require('@1inch/fusion-sdk');
const { EscrowExtension } = require('@1inch/cross-chain-sdk');
const { EvmCrossChainOrder } = require('@1inch/cross-chain-sdk');

const {
  base_sepolia,
  resolverAddress,
  rpc,
  domain: limitOrderDomain,
  limitOrderProtocol
} = require('./constants');

const bs_escrowFactory = base_sepolia.escrowFactory;
const ERC20_TRUE = base_sepolia.ERC20_TRUE;
const USDC = base_sepolia.USDC;

const provider = new ethers.JsonRpcProvider(rpc);
const wallet = new ethers.Wallet(process.env.PrivateKey, provider);
const coder = new ethers.AbiCoder();

Error.stackTraceLimit = 50;

// ABIs (replace with real ABIs)
const resolverABI = require('./ResolverABI.json');
const escrowFactoryABI = require('./EscrowFactoryABI.json');

async function main() {
  console.log('Maker/Resolver wallet:', wallet.address);

  // random 32 byte value (secret)
  const makerSecret = '0x' + Buffer.from(ethers.randomBytes(32)).toString('hex');
  console.log('Maker secret:', makerSecret);

  function newEvmOrder(escrowFactory, orderInfo, escrowParams, details, extra) {
    const SupportedEVMChains = SupportedChains.filter((chainId) => chainId !== 501);
    const postInteractionData = CC_SDK.SettlementPostInteractionData.new({
      whitelist: details.whitelist.map((i) => ({
        address: i.address.inner,
        allowFrom: i.allowFrom,
      })),
      resolvingStartTime: details.resolvingStartTime ?? BigInt(Date.now()) / 1000n,
    });
    if (!SupportedEVMChains.includes(escrowParams.dstChainId) && !orderInfo.receiver) {
      throw new Error('Receiver is required for non EVM chain');
    }
    const [complement, receiver] = orderInfo.receiver?.splitToParts() || ['0x00', CC_SDK.EvmAddress.ZERO];

    const ext = new EscrowExtension(
      escrowFactory,
      details.auction,
      postInteractionData,
      extra?.permit ? new CC_SDK.Interaction(orderInfo.makerAsset.inner, extra.permit) : undefined,
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

  const now = BigInt(Date.now()) / 1000n;
  console.log('order fillable in :', now + 1n);

  const order = newEvmOrder(
    CC_SDK.EvmAddress.fromString(bs_escrowFactory),
    // Order Info
    {
      salt: CC_SDK.randBigInt(1000n),
      maker: CC_SDK.EvmAddress.fromString(wallet.address),
      makingAmount: '1000000', // 1 USDC
      takingAmount: '999999', // 0.999999 USDC
      makerAsset: CC_SDK.EvmAddress.fromString(USDC), // USDC on Sepolia Base
      takerAsset: CC_SDK.EvmAddress.fromString('0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF'),
      receiver: CC_SDK.EvmAddress.fromString(wallet.address), // required for evm -> non-evm
    },
    // immutables
    {
      hashLock: CC_SDK.HashLock.forSingleFill(makerSecret),
      timelocks: CC_SDK.TimeLocks.new({
        srcWithdrawal: 1n,
        srcPublicWithdrawal: 10n,
        srcCancellation: 13n,
        srcPublicCancellation: 14n,
        dstWithdrawal: 15n,
        dstPublicWithdrawal: 16n,
        dstCancellation: 17n,
      }),
      srcChainId: BigInt(limitOrderDomain.chainId || limitOrderDomain.chainId || 84532), // Sepolia Base
      dstChainId: 999n, // your new non-evm ID (placeholder)
      srcSafetyDeposit: ethers.parseEther('0.001'),
      dstSafetyDeposit: ethers.parseEther('0.001'),
    },
    // dutch auction, whitelist and fee details.
    {
      auction: new CC_SDK.AuctionDetails({
        initialRateBump: 0,
        points: [],
        duration: 10000000n, // forever-ish
        startTime: now,
      }),
      whitelist: [
        {
          address: CC_SDK.EvmAddress.fromString(resolverAddress),
          allowFrom: 0n, // no delay
        },
      ],
      resolvingStartTime: 0n,
    },
    // extra params
    {
      nonce: BigInt(ethers.randomBytes(4).join('')),
      allowPartialFills: false,
      allowMultipleFills: false,
    }
  );

  const typedOrder = order.getTypedData(Number(limitOrderDomain.chainId));
  // YOU CANNOT USE THE DOMAIN FROM THE BUILT IN SDK FUNCTIONS.
  const signature = await wallet.signTypedData(
    limitOrderDomain,
    { Order: typedOrder.types.Order },
    typedOrder.message
  );

  const builtOrder = order.build();
  console.log('Built order:', builtOrder);
  console.log('Signature:', signature);

  // Compute order hash via static call to LOP
  const hashIface = new ethers.Interface([
    'function hashOrder((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)) view returns (bytes32)',
  ]);
  const orderhash = await provider.call({
    to: limitOrderProtocol,
    data: hashIface.encodeFunctionData('hashOrder', [
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
  console.log('Order Hash:', orderhash);

  const resolverContract = new ethers.Contract(resolverAddress, resolverABI, wallet);
  const escrowFactory = new ethers.Contract(bs_escrowFactory, escrowFactoryABI, provider);
  const ERC20ABIStub = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
  ];
  const usdcContract = new ethers.Contract(USDC, ERC20ABIStub, wallet);

  // Approve LOP to move makerAsset (USDC)
  const currentAllowance = await usdcContract.allowance(wallet.address, limitOrderDomain.verifyingContract);
  if (currentAllowance < BigInt(order.makingAmount)) {
    console.log('Approving USDC to LOP...');
    const approveTx = await usdcContract.approve(
      limitOrderDomain.verifyingContract,
      BigInt(order.makingAmount) * 100n
    );
    await approveTx.wait(1);
    console.log('Approved');
  }

  const fillAmount = BigInt(order.makingAmount);

  let takerTraits = CC_SDK.TakerTraits.default()
    .setExtension(order.extension)
    .setAmountMode(CC_SDK.AmountMode.maker)
    .setAmountThreshold(BigInt(order.takingAmount));

  let { args, trait } = takerTraits.encode();
  console.log('hashLockInfo:', order.escrowExtension.hashLockInfo);

  const srcImmutables = order
    .toSrcImmutables(
      limitOrderDomain.chainId,
      new CC_SDK.EvmAddress(resolverAddress),
      fillAmount.toString(),
      order.escrowExtension.hashLockInfo
    )
    .toJSON();

  // SDK cannot handle custom domain when hashing, override with our hash
  srcImmutables.orderHash = orderhash;
  console.log('srcImmutables:', srcImmutables);

  // Compute the expected src escrow address (time sensitive)
  let tempImmutables = { ...srcImmutables };
  tempImmutables.timelocks = (BigInt(tempImmutables.timelocks) | ((now + 2n) << 224n)).toString();

  const srcEscrowAddress = await escrowFactory.addressOfEscrowSrc(tempImmutables);
  console.log('Deploying src escrow at:', srcEscrowAddress);

  // Deploy src escrow (call resolver)
  const sig = ethers.Signature.from(signature);
  const tx = await resolverContract.deploySrc(
    srcImmutables,
    builtOrder,
    sig.r,
    sig.yParityAndS,
    fillAmount,
    trait,
    args,
    { value: BigInt(srcImmutables.safetyDeposit), gasLimit: 2_000_000 }
  );
  console.log('deploySrc tx:', tx.hash);
  await tx.wait(1);

  console.log('Deployed src escrow at:', srcEscrowAddress);

  console.log(
    'Should settle at timestamp:',
    srcImmutables.resolvingStartTime + srcImmutables.srcWithdrawal
  );

  // wait if needed for withdrawal timelock
  if (BigInt(Date.now()) / 1000n < srcImmutables.resolvingStartTime + srcImmutables.srcWithdrawal) {
    await new Promise((r) => setTimeout(r, 2000));
  }

  const srcWithdrawTx = await resolverContract.withdraw(srcEscrowAddress, makerSecret, srcImmutables);
  console.log('Withdrew from src escrow:', srcWithdrawTx.hash);
  await srcWithdrawTx.wait(1);

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
