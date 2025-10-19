### install cargo-contract

```bash
cargo install cargo-contract --locked --git https://github.com/paritytech/cargo-contract --branch master
```

### build escrow contract

```bash
cargo contract build
```

### instantiate htlc-escrow contract

```bash
cargo contract instantiate --args 0x1111111111111111111111111111111111111111 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 1000 1000000000000 --constructor new_native --value 6000000000000 --suri //Alice -x
```

### call get_info to retrieve code hash

```bash
cargo contract call --contract 0x124954f324ab6253b8efc74c3073a7e88338cda5 --message get_info --suri //Alice
```

### code hash output

```bash
jq -r '.source.hash' ./target/ink/htlc_escrow.contract
```

### instantiate factory contract with code hash

```bash
cargo contract instantiate --args 0xd6f6ca7eab3cf6b564ed44b1c6ff245d9158f3cfbff7cdd352cf4f515ff0f6c3 --suri //Alice -x
```

### some things more

```bash
cargo contract call --contract 0xfbc1901fbd623893b206d01900e267f75f09ad44 --message get_escrow_code_hash --suri //Alice
cargo contract call --contract 0xfbc1901fbd623893b206d01900e267f75f09ad44 --message get_last_escrow --suri //Alice

// secret - 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
cargo contract call --contract 0xfbc1901fbd623893b206d01900e267f75f09ad44 --message create_native_escrow --args 0x1111111111111111111111111111111111111111 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef 1000 1000000000000 None --value 6000000000000 --suri //Alice --skip-confirm -x
cargo contract call --contract 0xfbc1901fbd623893b206d01900e267f75f09ad44 --message create_native_escrow --args 0x1111111111111111111111111111111111111111 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef 1000 1000000000000 None --value 6000000000000 --suri //Alice --gas 3795825718 --proof-size 101390 --skip-dry-run --skip-confirm --storage-deposit-limit 0 -x 

deployed through factory - 0x4c6777e493e3f0ca7848df47c8fdb8ce8b87403b
```



## magic 
```bash
// dice devote amateur toss apart replace summer minor order humor derive turtle


cargo contract build --generate check-only --verifiable 

cargo install cargo-contract --locked --git https://github.com/paritytech/cargo-contract --branch master


cargo contract instantiate --args 0x1111111111111111111111111111111111111111 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 1000 1000000000000 --constructor new_native --value 6000000000000 --suri //Alice -x
cargo contract instantiate --args 0x6bd3cd4c04b9899c0fee3db05b4971256e153b70 0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4 1000 1000000 --constructor new_native --value 6000000000000 -x --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"
cargo contract instantiate --args 0xdb3934c0342637c9dcf29911ec070a04310c9976 1_000 0x1111111111111111111111111111111111111111 0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4 1000 1000000 --constructor new_psp22 --value 6000000000000 -x --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"

cargo contract call --contract 0x124954f324ab6253b8efc74c3073a7e88338cda5 --message get_info --suri //Alice
cargo contract call --contract 0x2adc86d276b57dcf887a479710e6c89f4ceea4ee --message get_info --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"
cargo contract call --contract 0x757e6b723a304e149fbd466410ebca9ac02c20b1 --message get_info --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"
cargo contract call --contract 0xa80b93dcab358f70a66ae816632eeeded28ecda3 --message claim --args 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef --skip-confirm --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" -x

jq -r '.source.hash' ./target/ink/htlc_escrow.contract

escrow hash: 0xcda7d3f5b71209f2245eac4f8d70292f84bc213b3d74ead15713a0a4df84ff85

cargo contract instantiate --args 0xd6f6ca7eab3cf6b564ed44b1c6ff245d9158f3cfbff7cdd352cf4f515ff0f6c3 --suri //Alice -x
cargo contract instantiate --args 0xcda7d3f5b71209f2245eac4f8d70292f84bc213b3d74ead15713a0a4df84ff85 --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" -x

cargo contract call --contract 0xfbc1901fbd623893b206d01900e267f75f09ad44 --message get_escrow_code_hash --suri //Alice
cargo contract call --contract 0xfbc1901fbd623893b206d01900e267f75f09ad44 --message get_last_escrow --suri //Alice
cargo contract call --contract 0xc601d44ee64d20d9b9fbc67b5592219fea78faac --message get_last_escrow --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"

// secret - 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
cargo contract call --contract 0xfbc1901fbd623893b206d01900e267f75f09ad44 --message create_native_escrow --args 0x1111111111111111111111111111111111111111 0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef 1000 1000000000000 None --value 6000000000000 --suri //Alice --skip-confirm -x
cargo contract call --contract 0x8e9bd9cdee97a785e602bf97a266108cb4c4552b --message create_native_escrow --args 0x6bd3cd4c04b9899c0fee3db05b4971256e153b70 0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4 1000 1000000000000 None --value 6000000000000 --skip-confirm -x --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"
cargo contract call --contract 0xc601d44ee64d20d9b9fbc67b5592219fea78faac --message create_psp22_escrow --args 0xdb3934c0342637c9dcf29911ec070a04310c9976 1_000 0x1111111111111111111111111111111111111111 0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4 1000 10000 None --value 10000 --skip-confirm -x --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"

deployed through factory - 0x4c6777e493e3f0ca7848df47c8fdb8ce8b87403b

npx ts-node scripts/substrate/factory.ts get-last --endpoint wss://testnet-passet-hub.polkadot.io --factory 0xa2bdef91b96a031897848e75210eecb1f394bbff --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"

cargo contract instantiate --args 1_000_000 -x --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"
cargo contract call --contract 0xdb3934c0342637c9dcf29911ec070a04310c9976 --message approve --args 0xc601d44ee64d20d9b9fbc67b5592219fea78faac 1_000_000_000 --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" --url wss://testnet-passet-hub.polkadot.io -x --skip-confirm
cargo contract call --contract 0xdb3934c0342637c9dcf29911ec070a04310c9976 --message balance_of --args 0xa80b93dcab358f70a66ae816632eeeded28ecda3 --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" --url wss://testnet-passet-hub.polkadot.io --skip-confirm
cargo contract call --contract 0xdb3934c0342637c9dcf29911ec070a04310c9976 --message balance_of --args 0x1111111111111111111111111111111111111111 --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" --url wss://testnet-passet-hub.polkadot.io --skip-confirm

SECRET: 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
HASH:   0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4

deployer - 0x6bd3cd4c04b9899c0fee3db05b4971256e153b70
factory - 0xc601d44ee64d20d9b9fbc67b5592219fea78faac
token - 0xdb3934c0342637c9dcf29911ec070a04310c9976
```