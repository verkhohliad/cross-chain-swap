#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod htlc_escrow {
    use ink::env::call::{build_call, ExecutionInput, Selector};
    use ink::env::hash::Keccak256;
    use ink::env::DefaultEnvironment;
    use ink::primitives::U256;
    use ink::prelude::vec::Vec;

    // Minimal cross-contract PSP22 interface via trait definition (selectors used for build_call)
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

    #[derive(
        scale::Encode, scale::Decode, scale_info::TypeInfo, Clone, Copy, PartialEq, Eq,
    )]
    #[cfg_attr(feature = "std", derive(Debug))]
    pub struct EscrowInfo {
        pub initiator: Address,
        pub beneficiary: Address,
        pub hashed_secret: [u8; 32],
        pub expiry: u64,
        pub locked_amount: U256,
        pub resolver_deposit: U256,
        pub claimed: bool,
        pub refunded: bool,
        pub now: u64,
        pub asset_kind: u8, // 0 = Native, 1 = PSP22
        pub psp22_token: Address,
    }

    #[derive(scale::Encode, scale::Decode, scale_info::TypeInfo)]
    #[cfg_attr(feature = "std", derive(Debug))]
    pub enum ClaimError {
        AlreadyFinalized,
        Expired,
        BadSecret,
        NativeTransferFailed,
        PSP22TransferFailed,
    }

    #[derive(scale::Encode, scale::Decode, scale_info::TypeInfo)]
    #[cfg_attr(feature = "std", derive(Debug))]
    pub enum RefundError {
        AlreadyFinalized,
        NotExpired,
        NativeTransferFailed,
        PSP22TransferFailed,
    }

    #[derive(scale::Encode, scale::Decode, scale_info::TypeInfo, Clone, Copy, PartialEq, Eq)]
    #[cfg_attr(feature = "std", derive(Debug, ink::storage::traits::StorageLayout))]
    pub enum AssetKind {
        Native,
        PSP22,
    }

    impl Default for AssetKind {
        fn default() -> Self {
            AssetKind::Native
        }
    }

    /// Hashed Timelock Escrow supporting native or PSP22 locking.
    #[ink(storage)]
    pub struct HtlcEscrow {
        initiator: Address,
        beneficiary: Address,
        hashed_secret: [u8; 32],
        expiry: u64, // block number
        locked_amount: U256,
        resolver_deposit: U256,
        claimed: bool,
        refunded: bool,
        asset_kind: AssetKind,
        psp22_token: Address, // zero if native
    }

    #[ink(event, anonymous)]
    pub struct SecretRevealed {
        pub secret: [u8; 32],
    }

    #[ink(event, anonymous)]
    pub struct Claimed {
        pub account: Address,
        pub amount: U256,
        pub asset_kind: u8,
    }

    #[ink(event, anonymous)]
    pub struct Refunded {
        pub account: Address,
        pub amount: U256,
        pub asset_kind: u8,
    }

    impl HtlcEscrow {
        /// Constructor for a native-balance escrow.
        /// Must attach value = locked_amount + resolver_deposit.
        #[ink(constructor, payable)]
        pub fn new_native(
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: U256,
        ) -> Self {
            let initiator = Self::env().caller();
            let total = Self::env().transferred_value();
            assert!(resolver_deposit > U256::from(0), "resolver_deposit required");
            assert!(total >= resolver_deposit, "insufficient value for lock");
            let locked_amount = total
                .checked_sub(resolver_deposit)
                .expect("underflow on locked_amount");
            assert!(locked_amount > U256::from(0), "zero lock");

            let now_block: u64 = Self::env().block_number().into();
            let expiry = now_block.saturating_add(expiry);

            Self {
                initiator,
                beneficiary,
                hashed_secret,
                expiry,
                locked_amount,
                resolver_deposit,
                claimed: false,
                refunded: false,
                asset_kind: AssetKind::Native,
                psp22_token: Address::default(),
            }
        }

        /// Constructor for a PSP22 escrow.
        /// Must attach value = resolver_deposit (PSP22 are transferred by factory).
        #[ink(constructor, payable)]
        pub fn new_psp22(
            token: Address,
            amount: U256,
            beneficiary: Address,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: U256,
        ) -> Self {
            let initiator = Self::env().caller();
            let native = Self::env().transferred_value();
            assert!(resolver_deposit > U256::from(0), "resolver_deposit required");
            assert!(native >= resolver_deposit, "attach native deposit only");
            assert!(amount > U256::from(0), "zero amount");

            let now_block: u64 = Self::env().block_number().into();
            let expiry = now_block.saturating_add(expiry);

            Self {
                initiator,
                beneficiary,
                hashed_secret,
                expiry,
                locked_amount: amount,
                resolver_deposit,
                claimed: false,
                refunded: false,
                asset_kind: AssetKind::PSP22,
                psp22_token: token,
            }
        }

        fn now(&self) -> u64 {
            self.env().block_number().into()
        }

        fn pay_native(&mut self, to: Address, amount: U256) -> Result<(), ()> {
            self.env().transfer(to, amount).map_err(|_| ())
        }

        fn pay_psp22(&mut self, token: Address, to: Address, amount: U256) -> Result<(), ()> {
            // Selector matches PSP22::transfer in our PSP22 test token (0xBAF396F5)
            match build_call::<DefaultEnvironment>()
                .call(token)
                .exec_input(
                    ExecutionInput::new(Selector::new([0xBA, 0xF3, 0x96, 0xF5]))
                        .push_arg(to)
                        .push_arg(amount)
                        .push_arg(Vec::<u8>::new()),
                )
                .returns::<Result<(), ()>>()
                .invoke()
            {
                Ok(()) => Ok(()),
                _ => Err(()),
            }
        }


        /// Verify the secret against keccak256.
        fn verify_secret(&self, secret: [u8; 32]) -> bool {
            let mut out = [0u8; 32];
            ink::env::hash_bytes::<Keccak256>(&secret, &mut out);
            out == self.hashed_secret
        }

        /// Returns a snapshot of escrow info.
        #[ink(message)]
        pub fn get_info(&self) -> EscrowInfo {
            EscrowInfo {
                initiator: self.initiator,
                beneficiary: self.beneficiary,
                hashed_secret: self.hashed_secret,
                expiry: self.expiry,
                locked_amount: self.locked_amount,
                resolver_deposit: self.resolver_deposit,
                claimed: self.claimed,
                refunded: self.refunded,
                now: (self.env().block_number().into()),
                asset_kind: match self.asset_kind {
                    AssetKind::Native => 0,
                    AssetKind::PSP22 => 1,
                },
                psp22_token: self.psp22_token,
            }
        }

        /// Claim the escrow with the correct secret before expiry.
        #[ink(message)]
        pub fn claim(&mut self, secret: [u8; 32]) -> Result<(), ClaimError> {
            // Assert with string messages so dry-runs surface precise reasons
            assert!(!self.claimed && !self.refunded, "already finalized");
            let now_block: u64 = self.env().block_number().into();
            assert!(now_block <= self.expiry, "expired");
            assert!(self.verify_secret(secret), "bad secret");

            match self.asset_kind {
                AssetKind::Native => {
                    assert!(
                        self.pay_native(self.beneficiary, self.locked_amount).is_ok(),
                        "beneficiary transfer failed"
                    );
                }
                AssetKind::PSP22 => {
                    assert!(
                        self.pay_psp22(self.psp22_token, self.beneficiary, self.locked_amount).is_ok(),
                        "psp22 transfer failed"
                    );
                }
            }

            let finisher = self.env().caller();
            if self.resolver_deposit > U256::from(0) {
                assert!(
                    self.pay_native(finisher, self.resolver_deposit).is_ok(),
                    "deposit transfer failed"
                );
            }

            self.claimed = true;

            self.env().emit_event(SecretRevealed { secret });
            self.env().emit_event(Claimed {
                account: self.beneficiary,
                amount: self.locked_amount,
                asset_kind: match self.asset_kind {
                    AssetKind::Native => 0,
                    AssetKind::PSP22 => 1,
                },
            });

            Ok(())
        }

        /// Refund to initiator after expiry if not claimed.
        #[ink(message)]
        pub fn refund(&mut self) -> Result<(), RefundError> {
            // Assert with string messages so dry-runs surface precise reasons
            assert!(!self.claimed && !self.refunded, "already finalized");
            let now_block: u64 = self.env().block_number().into();
            assert!(now_block >= self.expiry, "not expired");

            match self.asset_kind {
                AssetKind::Native => {
                    assert!(
                        self.pay_native(self.initiator, self.locked_amount).is_ok(),
                        "initiator transfer failed"
                    );
                }
                AssetKind::PSP22 => {
                    assert!(
                        self.pay_psp22(self.psp22_token, self.initiator, self.locked_amount).is_ok(),
                        "psp22 transfer failed"
                    );
                }
            }

            let finisher = self.env().caller();
            if self.resolver_deposit > U256::from(0) {
                assert!(
                    self.pay_native(finisher, self.resolver_deposit).is_ok(),
                    "deposit transfer failed"
                );
            }

            self.refunded = true;

            self.env().emit_event(Refunded {
                account: self.initiator,
                amount: self.locked_amount,
                asset_kind: match self.asset_kind {
                    AssetKind::Native => 0,
                    AssetKind::PSP22 => 1,
                },
            });

            Ok(())
        }
    }
}
