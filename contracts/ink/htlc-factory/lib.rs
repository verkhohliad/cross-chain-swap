#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract(env = ink::env::DefaultEnvironment)]
pub mod htlc_factory {
    use htlc_escrow::htlc_escrow::HtlcEscrowRef;
    use ink::env::call::{build_call, ExecutionInput, Selector};
    use ink::env::DefaultEnvironment;
    use ink::prelude::vec::Vec;
    use ink::primitives::H256 as CodeHash;
    use ink::primitives::U256;
    use ink::ToAddr;

    // Optional interface marker for clarity (we use explicit selectors for calls)
    #[ink::trait_definition]
    pub trait PSP22 {
        #[ink(message)]
        fn transfer(&mut self, to: Address, value: Balance, data: Vec<u8>) -> Result<(), ()>;

        #[ink(message)]
        fn transfer_from(
            &mut self,
            from: Address,
            to: Address,
            value: Balance,
            data: Vec<u8>,
        ) -> Result<(), ()>;
    }

    /// Factory that instantiates HtlcEscrow contracts (native or PSP22).
    /// Stores the code hash of the escrow to use for instantiation.
    #[ink(storage)]
    pub struct HtlcFactory {
        escrow_code_hash: CodeHash,
    }

    #[ink(event, anonymous)]
    pub struct EscrowCreated {
        pub escrow: Address,
        pub beneficiary: Address,
        pub expiry: u64,
        pub locked_amount: U256,
        pub resolver_deposit: U256,
        pub hashed_secret: [u8; 32],
        pub is_psp22: bool,
        pub psp22_token: Address,
    }

    impl HtlcFactory {
        /// Provide the code hash of the HtlcEscrow contract on deployment.
        #[ink(constructor)]
        pub fn new(escrow_code_hash: CodeHash) -> Self {
            Self { escrow_code_hash }
        }

        fn instantiate_native(
            &self,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: U256,
            salt: Option<[u8; 32]>,
            endowment: U256,
        ) -> Address {
            // total value is endowment: locked_amount + resolver_deposit
            let escrow = HtlcEscrowRef::new_native(beneficiary, hashed_secret, expiry, resolver_deposit)
                .endowment(endowment)
                .code_hash(self.escrow_code_hash)
                .salt_bytes(salt)
                .instantiate();
            let escrow_addr: Address = escrow.to_addr();
            escrow_addr
        }

        fn instantiate_psp22(
            &self,
            token: Address,
            amount: U256,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: U256,
            salt: Option<[u8; 32]>,
        ) -> Address {
            // endowment is resolver_deposit; PSP22 will be transferred via transfer_from below.
            let escrow = HtlcEscrowRef::new_psp22(
                token,
                amount,
                beneficiary,
                hashed_secret,
                expiry,
                resolver_deposit,
            )
            .endowment(resolver_deposit)
            .code_hash(self.escrow_code_hash)
            .salt_bytes(salt)
            .instantiate();
            let escrow_addr: Address = escrow.to_addr();
            escrow_addr
        }

        /// Create a native-balance escrow.
        /// Attach value = locked_amount + resolver_deposit.
        #[ink(message, payable)]
        pub fn create_native_escrow(
            &mut self,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: U256,
            salt: Option<[u8; 32]>,
        ) -> Address {
            let total: U256 = self.env().transferred_value();
            assert!(resolver_deposit > U256::from(0), "resolver_deposit required");
            assert!(total > resolver_deposit, "insufficient value for lock");
            let locked_amount: U256 = total
                .checked_sub(resolver_deposit)
                .expect("underflow on locked_amount");

            let escrow_addr = self.instantiate_native(
                beneficiary,
                hashed_secret,
                expiry,
                resolver_deposit,
                salt,
                total,
            );

            self.env().emit_event(EscrowCreated {
                escrow: escrow_addr,
                beneficiary,
                expiry,
                locked_amount,
                resolver_deposit,
                hashed_secret,
                is_psp22: false,
                psp22_token: Address::default(),
            });

            escrow_addr
        }

        /// Create a PSP22 escrow by:
        /// 1) Instantiating escrow with endowment = resolver_deposit (attach value == resolver_deposit).
        /// 2) Pulling tokens from the caller into the new escrow via transfer_from (caller must approve this contract beforehand).
        #[ink(message, payable)]
        pub fn create_psp22_escrow(
            &mut self,
            token: Address,
            amount: U256,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: U256,
            salt: Option<[u8; 32]>,
        ) -> Address {
            let value: U256 = self.env().transferred_value();
            assert!(resolver_deposit > U256::from(0), "resolver_deposit required");
            assert!(value == resolver_deposit, "attach native deposit only");
            assert!(amount > U256::from(0), "zero amount");

            let escrow_addr = self.instantiate_psp22(
                token,
                amount,
                beneficiary,
                hashed_secret,
                expiry,
                resolver_deposit,
                salt,
            );

            // Move PSP22 from caller to escrow using explicit selector for transfer_from
            // Selector matches our PSP22 test token #[ink(message, selector = 0x54B3C76F)]
            let caller = self.env().caller();
            match build_call::<DefaultEnvironment>()
                .call(token)
                .exec_input(
                    ExecutionInput::new(Selector::new([0x54, 0xB3, 0xC7, 0x6F]))
                        .push_arg(caller)
                        .push_arg(escrow_addr)
                        .push_arg(amount)
                        .push_arg(Vec::<u8>::new()),
                )
                .returns::<Result<(), ()>>()
                .invoke()
            {
                Ok(()) => {}
                _ => panic!("psp22 transfer_from failed (check approval and balance)"),
            }

            self.env().emit_event(EscrowCreated {
                escrow: escrow_addr,
                beneficiary,
                expiry,
                locked_amount: amount,
                resolver_deposit,
                hashed_secret,
                is_psp22: true,
                psp22_token: token,
            });

            escrow_addr
        }

        /// Returns the configured escrow code hash.
        #[ink(message)]
        pub fn get_escrow_code_hash(&self) -> CodeHash {
            self.escrow_code_hash
        }
    }
}
