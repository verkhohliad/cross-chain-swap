#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
pub mod htlc_escrow {
    use ink::env::call::{build_call, ExecutionInput, Selector};
    use ink::env::hash::Keccak256;
    use ink::env::DefaultEnvironment;
    use ink::prelude::vec::Vec;

    // Minimal cross-contract PSP22 interface via trait definition (selectors used for build_call)
    #[ink::trait_definition]
    pub trait PSP22 {
        #[ink(message)]
        fn transfer(&mut self, to: AccountId, value: Balance, data: Vec<u8>) -> Result<(), ()>;

        #[ink(message)]
        fn transfer_from(
            &mut self,
            from: AccountId,
            to: AccountId,
            value: Balance,
            data: Vec<u8>,
        ) -> Result<(), ()>;
    }

    #[derive(
        scale::Encode, scale::Decode, scale_info::TypeInfo, Clone, Copy, PartialEq, Eq,
    )]
    #[cfg_attr(feature = "std", derive(Debug))]
    pub struct EscrowInfo {
        pub initiator: [u8; 32],
        pub beneficiary: [u8; 32],
        pub hashed_secret: [u8; 32],
        pub expiry: u64,
        pub locked_amount: Balance,
        pub resolver_deposit: Balance,
        pub claimed: bool,
        pub refunded: bool,
        pub now: u64,
        pub asset_kind: u8, // 0 = Native, 1 = PSP22
        pub psp22_token: [u8; 32],
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
        initiator: AccountId,
        beneficiary: AccountId,
        hashed_secret: [u8; 32],
        expiry: u64, // block number
        locked_amount: Balance,
        resolver_deposit: Balance,
        claimed: bool,
        refunded: bool,
        asset_kind: AssetKind,
        psp22_token: AccountId, // zero if native
    }

    #[ink(event)]
    pub struct SecretRevealed {
        #[ink(topic)]
        pub secret: [u8; 32],
    }

    #[ink(event)]
    pub struct Claimed {
        #[ink(topic)]
        pub to: AccountId,
        pub amount: Balance,
        pub asset_kind: u8,
    }

    #[ink(event)]
    pub struct Refunded {
        #[ink(topic)]
        pub to: AccountId,
        pub amount: Balance,
        pub asset_kind: u8,
    }

    impl HtlcEscrow {
        /// Constructor for a native-balance escrow.
        /// Must attach value = locked_amount + resolver_deposit.
        #[ink(constructor, payable)]
        pub fn new(
            beneficiary: AccountId,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: Balance,
        ) -> Self {
            let initiator = Self::env().caller();
            let total = Self::env().transferred_value();
            assert!(resolver_deposit > 0, "resolver_deposit required");
            assert!(total > resolver_deposit, "insufficient value for lock");
            let locked_amount = total
                .checked_sub(resolver_deposit)
                .expect("underflow on locked_amount");
            assert!(locked_amount > 0, "zero lock");

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
                psp22_token: AccountId::from([0u8; 32]),
            }
        }

        /// Constructor for a PSP22 escrow.
        /// Must attach value = resolver_deposit (PSP22 are transferred by factory).
        #[ink(constructor, payable)]
        pub fn new_psp22(
            token: AccountId,
            amount: Balance,
            beneficiary: AccountId,
            hashed_secret: [u8; 32],
            expiry: u64,
            resolver_deposit: Balance,
        ) -> Self {
            let initiator = Self::env().caller();
            let native = Self::env().transferred_value();
            assert!(resolver_deposit > 0, "resolver_deposit required");
            assert!(native == resolver_deposit, "attach native deposit only");
            assert!(amount > 0, "zero amount");

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

        fn pay_native(&mut self, to: AccountId, amount: Balance) -> Result<(), ()> {
            self.env().transfer(to, amount).map_err(|_| ())
        }

        fn pay_psp22(&mut self, token: AccountId, to: AccountId, amount: Balance) -> Result<(), ()> {
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

        // Helper: convert AccountId -> [u8; 32] for metadata-friendly structs
        fn id32(id: &AccountId) -> [u8; 32] {
            let mut out = [0u8; 32];
            out.copy_from_slice(id.as_ref());
            out
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
                initiator: Self::id32(&self.initiator),
                beneficiary: Self::id32(&self.beneficiary),
                hashed_secret: self.hashed_secret,
                expiry: self.expiry,
                locked_amount: self.locked_amount,
                resolver_deposit: self.resolver_deposit,
                claimed: self.claimed,
                refunded: self.refunded,
                now: self.now(),
                asset_kind: match self.asset_kind {
                    AssetKind::Native => 0,
                    AssetKind::PSP22 => 1,
                },
                psp22_token: Self::id32(&self.psp22_token),
            }
        }

        /// Claim the escrow with the correct secret before expiry.
        #[ink(message)]
        pub fn claim(&mut self, secret: [u8; 32]) -> Result<(), ClaimError> {
            if self.claimed || self.refunded {
                return Err(ClaimError::AlreadyFinalized);
            }
            if self.now() >= self.expiry {
                return Err(ClaimError::Expired);
            }
            if !self.verify_secret(secret) {
                return Err(ClaimError::BadSecret);
            }

            match self.asset_kind {
                AssetKind::Native => {
                    self.pay_native(self.beneficiary, self.locked_amount)
                        .map_err(|_| ClaimError::NativeTransferFailed)?
                }
                AssetKind::PSP22 => {
                    self.pay_psp22(self.psp22_token, self.beneficiary, self.locked_amount)
                        .map_err(|_| ClaimError::PSP22TransferFailed)?
                }
            }

            let finisher = self.env().caller();
            if self.resolver_deposit > 0 {
                self.pay_native(finisher, self.resolver_deposit)
                    .map_err(|_| ClaimError::NativeTransferFailed)?;
            }

            self.claimed = true;

            self.env().emit_event(SecretRevealed { secret });
            self.env().emit_event(Claimed {
                to: self.beneficiary,
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
            if self.claimed || self.refunded {
                return Err(RefundError::AlreadyFinalized);
            }
            if self.now() < self.expiry {
                return Err(RefundError::NotExpired);
            }

            match self.asset_kind {
                AssetKind::Native => {
                    self.pay_native(self.initiator, self.locked_amount)
                        .map_err(|_| RefundError::NativeTransferFailed)?
                }
                AssetKind::PSP22 => {
                    self.pay_psp22(self.psp22_token, self.initiator, self.locked_amount)
                        .map_err(|_| RefundError::PSP22TransferFailed)?
                }
            }

            let finisher = self.env().caller();
            if self.resolver_deposit > 0 {
                self.pay_native(finisher, self.resolver_deposit)
                    .map_err(|_| RefundError::NativeTransferFailed)?;
            }

            self.refunded = true;

            self.env().emit_event(Refunded {
                to: self.initiator,
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
