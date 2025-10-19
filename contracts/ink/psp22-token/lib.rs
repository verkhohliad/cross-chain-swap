#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract(env = ink::env::DefaultEnvironment)]
mod psp22_token {
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    use ink::U256;

    #[ink(storage)]
    pub struct Psp22Token {
        owner: Address,
        total_supply: U256,
        balances: Mapping<Address, U256>,
        allowances: Mapping<(Address, Address), U256>, // (owner, spender) -> amount
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Address,
        #[ink(topic)]
        to: Address,
        value: U256,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: Address,
        #[ink(topic)]
        spender: Address,
        value: U256,
    }

    impl Psp22Token {
        #[ink(constructor)]
        pub fn new(initial_supply: U256) -> Self {
            let mut this = Self {
                owner: Self::env().caller(),
                total_supply: U256::from(0u8),
                balances: Mapping::default(),
                allowances: Mapping::default(),
            };
            if initial_supply > U256::from(0u8) {
                this.mint_inner(Self::env().caller(), initial_supply);
            }
            this
        }

        #[ink(message)]
        pub fn total_supply(&self) -> U256 {
            self.total_supply
        }

        #[ink(message)]
        pub fn balance_of(&self, owner: Address) -> U256 {
            self.balances.get(owner).unwrap_or(U256::from(0u8))
        }

        #[ink(message)]
        pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
            self.allowances.get((owner, spender)).unwrap_or(U256::from(0u8))
        }

        #[ink(message)]
        pub fn approve(&mut self, spender: Address, value: U256) -> Result<(), ()> {
            let owner = self.env().caller();
            self.allowances.insert((owner, spender), &value);
            self.env().emit_event(Approval { owner, spender, value });
            Ok(())
        }

        #[ink(message, selector = 0xBAF396F5)]
        pub fn transfer(&mut self, to: Address, value: U256, _data: Vec<u8>) -> Result<(), ()> {
            let from = self.env().caller();
            self.transfer_inner(from, to, value)
        }

        // Important: keep selector to match existing factory integration if needed
        #[ink(message, selector = 0x54B3C76F)]
        pub fn transfer_from(
            &mut self,
            from: Address,
            to: Address,
            value: U256,
            _data: Vec<u8>,
        ) -> Result<(), ()> {
            let spender = self.env().caller();
            let current_allowance = self.allowances.get((from, spender)).unwrap_or(U256::from(0u8));
            if current_allowance < value {
                return Err(());
            }
            // Decrease allowance
            let remaining = current_allowance.checked_sub(value).ok_or(())?;
            self.allowances.insert((from, spender), &remaining);
            // Move tokens
            self.transfer_inner(from, to, value)
        }

        #[ink(message)]
        pub fn mint(&mut self, to: Address, value: U256) -> Result<(), ()> {
            let caller = self.env().caller();
            if caller != self.owner {
                return Err(());
            }
            self.mint_inner(to, value);
            Ok(())
        }

        fn transfer_inner(&mut self, from: Address, to: Address, value: U256) -> Result<(), ()> {
            if value == U256::from(0u8) {
                // no-op but emit event for consistency
                self.env().emit_event(Transfer { from, to, value });
                return Ok(());
            }
            let from_balance = self.balances.get(from).unwrap_or(U256::from(0u8));
            if from_balance < value {
                return Err(());
            }
            let to_balance = self.balances.get(to).unwrap_or(U256::from(0u8));
            let new_from = from_balance.checked_sub(value).ok_or(())?;
            let new_to = to_balance.checked_add(value).ok_or(())?;
            self.balances.insert(from, &new_from);
            self.balances.insert(to, &new_to);
            self.env().emit_event(Transfer { from, to, value });
            Ok(())
        }

        fn mint_inner(&mut self, to: Address, value: U256) {
            if value == U256::from(0u8) {
                return;
            }
            let to_balance = self.balances.get(to).unwrap_or(U256::from(0u8));
            let new_to = to_balance.checked_add(value).expect("overflow on mint");
            self.balances.insert(to, &new_to);
            self.total_supply = self.total_supply.checked_add(value).expect("overflow total_supply");
            self.env().emit_event(Transfer {
                from: Address::default(),
                to,
                value,
            });
        }
    }
}
