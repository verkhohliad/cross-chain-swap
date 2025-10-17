require('dotenv').config();

module.exports = {
  rpc: process.env.RPC || 'https://sepolia.base.org',
  limitOrderProtocol: process.env.LIMIT_ORDER_PROTOCOL || '0xE53136D9De56672e8D2665C98653AC7b8A60Dc44',
  domain: {
    name: '1inch Limit Order Protocol',
    version: '4',
    chainId: process.env.CHAIN_ID || '84532',
    verifyingContract: process.env.VERIFYING_CONTRACT || '0xE53136D9De56672e8D2665C98653AC7b8A60Dc44',
  },
  base_sepolia: {
    escrowFactory: process.env.ESCROW_FACTORY || '0x2893441ba71e3f2f854fe56f2a2b91a45820b0f5',
    FeeBank: process.env.FEE_BANK || '0xA8277e8758058780e3C014ec02f3D555c16ed425',
    escrowSrcImpl: process.env.ESCROW_SRC_IMPL || '0xc84aA0f22eAcdAE4Aa343E20feAaD5bc742F22e9',
    escrowDstImpl: process.env.ESCROW_DST_IMPL || '0x45a3Bc4e8E6AeB4b50C31b6A6E0898bff33164ae',
    ERC20_TRUE: process.env.ERC20_TRUE || '0x384229e3d543ccbd869987303246b1b602323d33',
    USDC: process.env.USDC || '0x036cbd53842c5426634e7929541ec2318f3dcf7e',
  },
  resolverAddress: process.env.RESOLVER_ADDRESS || '0xYOUR_RESOLVER_ADDRESS_HERE'
};
