#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[ink::contract]
mod psp22_token {
    use ink::storage::Mapping;
    use ink::primitives::H160;

    #[ink(storage)]
    pub struct Psp22Token {
        total_supply: Balance,
        balances: Mapping<H160, Balance>,
        allowances: Mapping<(H160, H160), Balance>,
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        from: Option<H160>,
        #[ink(topic)]
        to: Option<H160>,
        value: Balance,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        owner: H160,
        #[ink(topic)]
        spender: H160,
        value: Balance,
    }

    #[derive(Debug, PartialEq, Eq)]
    #[ink::scale_derive(Encode, Decode, TypeInfo)]
    pub enum Error {
        InsufficientBalance,
        InsufficientAllowance,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    impl Psp22Token {
        #[ink(constructor)]
        pub fn new(total_supply: Balance) -> Self {
            let mut balances = Mapping::default();
            let caller = Self::env().caller();
            balances.insert(caller, &total_supply);

            Self::env().emit_event(Transfer {
                from: None,
                to: Some(caller),
                value: total_supply,
            });

            Self {
                total_supply,
                balances,
                allowances: Mapping::default(),
            }
        }

        #[ink(message)]
        pub fn total_supply(&self) -> Balance {
            self.total_supply
        }

        #[ink(message)]
        pub fn balance_of(&self, owner: H160) -> Balance {
            self.balances.get(&owner).unwrap_or(0)
        }

        #[ink(message)]
        pub fn allowance(&self, owner: H160, spender: H160) -> Balance {
            self.allowances.get((owner, spender)).unwrap_or(0)
        }

        #[ink(message)]
        pub fn transfer(&mut self, to: H160, value: Balance) -> Result<()> {
            let from = self.env().caller();
            self.transfer_from_to(&from, &to, value)?;
            Ok(())
        }

        #[ink(message)]
        pub fn approve(&mut self, spender: H160, value: Balance) -> Result<()> {
            let owner = self.env().caller();
            self.allowances.insert((owner, spender), &value);

            self.env().emit_event(Approval {
                owner,
                spender,
                value,
            });

            Ok(())
        }

        #[ink(message)]
        pub fn transfer_from(
            &mut self,
            from: H160,
            to: H160,
            value: Balance,
        ) -> Result<()> {
            let caller = self.env().caller();
            let allowance = self.allowance(from, caller);

            if allowance < value {
                return Err(Error::InsufficientAllowance);
            }

            self.transfer_from_to(&from, &to, value)?;
            self.allowances.insert((from, caller), &(allowance - value));

            Ok(())
        }

        fn transfer_from_to(
            &mut self,
            from: &H160,
            to: &H160,
            value: Balance,
        ) -> Result<()> {
            let from_balance = self.balance_of(*from);

            if from_balance < value {
                return Err(Error::InsufficientBalance);
            }

            self.balances.insert(from, &(from_balance - value));
            let to_balance = self.balance_of(*to);
            self.balances.insert(to, &(to_balance + value));

            self.env().emit_event(Transfer {
                from: Some(*from),
                to: Some(*to),
                value,
            });

            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let token = Psp22Token::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            assert_eq!(token.total_supply(), 1000);
            assert_eq!(token.balance_of(accounts.alice), 1000);
        }

        #[ink::test]
        fn transfer_works() {
            let mut token = Psp22Token::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            assert_eq!(token.transfer(accounts.bob, 100), Ok(()));
            assert_eq!(token.balance_of(accounts.alice), 900);
            assert_eq!(token.balance_of(accounts.bob), 100);
        }

        #[ink::test]
        fn transfer_fails_insufficient_balance() {
            let mut token = Psp22Token::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            assert_eq!(
                token.transfer(accounts.bob, 2000),
                Err(Error::InsufficientBalance)
            );
        }

        #[ink::test]
        fn approve_works() {
            let mut token = Psp22Token::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            assert_eq!(token.approve(accounts.bob, 200), Ok(()));
            assert_eq!(token.allowance(accounts.alice, accounts.bob), 200);
        }

        #[ink::test]
        fn transfer_from_works() {
            let mut token = Psp22Token::new(1000);
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

            assert_eq!(token.approve(accounts.bob, 200), Ok(()));

            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(accounts.bob);
            assert_eq!(
                token.transfer_from(accounts.alice, accounts.charlie, 100),
                Ok(())
            );

            assert_eq!(token.balance_of(accounts.alice), 900);
            assert_eq!(token.balance_of(accounts.charlie), 100);
            assert_eq!(token.allowance(accounts.alice, accounts.bob), 100);
        }
    }
}
