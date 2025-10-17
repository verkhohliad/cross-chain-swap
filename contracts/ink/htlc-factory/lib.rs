#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod htlc_factory {
    use htlc_escrow::htlc_escrow::HtlcEscrowRef;
    use ink::env::call::{build_call, ExecutionInput, Selector};
    use ink::env::DefaultEnvironment;
    use ink::env::types::Address;
    use ink::prelude::vec::Vec;
    use ink::primitives::Hash as CodeHash;
    use ink::ToAccountId;

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

    #[ink(event)]
    pub struct EscrowCreated {
        #[ink(topic)]
        pub escrow: Address,
        #[ink(topic)]
        pub beneficiary: Address,
        pub expiry: u64,
        pub locked_amount: Balance,
        pub resolver_deposit: Balance,
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
            resolver_deposit: Balance,
            salt: Option<[u8; 32]>,
            endowment: Balance,
        ) -> AccountId {
            // total value is endowment: locked_amount + resolver_deposit
            let escrow = HtlcEscrowRef::new_native(beneficiary, hashed_secret, expiry, resolver_deposit)
                .endowment(endowment)
                .code_hash(self.escrow_code_hash)
                .salt_bytes(salt.unwrap_or_default())
                .instantiate();
            escrow.to_account_id()
        }

        fn instantiate_psp22(
            &self,
            token: Address,
            amount: Balance,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: Balance,
            salt: Option<[u8; 32]>,
        ) -> AccountId {
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
            .salt_bytes(salt.unwrap_or_default())
            .instantiate();
            escrow.to_account_id()
        }

        /// Create a native-balance escrow.
        /// Attach value = locked_amount + resolver_deposit.
        #[ink(message, payable)]
        pub fn create_native_escrow(
            &mut self,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: Balance,
            salt: Option<[u8; 32]>,
        ) -> AccountId {
            let total = self.env().transferred_value();
            assert!(resolver_deposit > 0, "resolver_deposit required");
            assert!(total > resolver_deposit, "insufficient value for lock");
            let locked_amount = total
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
            amount: Balance,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: Balance,
            salt: Option<[u8; 32]>,
        ) -> AccountId {
            let value = self.env().transferred_value();
            assert!(resolver_deposit > 0, "resolver_deposit required");
            assert!(value == resolver_deposit, "attach native deposit only");
            assert!(amount > 0, "zero amount");

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
