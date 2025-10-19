```base
SECRET: 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
HASH:   0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4

deployer - 0x6bd3cd4c04b9899c0fee3db05b4971256e153b70
factory - 0xc601d44ee64d20d9b9fbc67b5592219fea78faac
token - 0xdb3934c0342637c9dcf29911ec070a04310c9976

cargo contract call --contract 0xdb3934c0342637c9dcf29911ec070a04310c9976 --message approve --args 0xc601d44ee64d20d9b9fbc67b5592219fea78faac 1_000_000_000 --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" --url wss://testnet-passet-hub.polkadot.io -x --skip-confirm

cargo contract call --contract 0xc601d44ee64d20d9b9fbc67b5592219fea78faac --message create_psp22_escrow --args 0xdb3934c0342637c9dcf29911ec070a04310c9976 1_000 0x1111111111111111111111111111111111111111 0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4 1000 10000 None --value 10000 --skip-confirm -x --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"
cargo contract call --contract 0xc601d44ee64d20d9b9fbc67b5592219fea78faac --message get_last_escrow --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle"

cargo contract call --contract 0xdb3934c0342637c9dcf29911ec070a04310c9976 --message balance_of --args 0x1111111111111111111111111111111111111111 --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" --url wss://testnet-passet-hub.polkadot.io --skip-confirm

cargo contract call --contract {last escrow result} --message claim --args 0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef --skip-confirm --url wss://testnet-passet-hub.polkadot.io --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" -x

cargo contract call --contract 0xdb3934c0342637c9dcf29911ec070a04310c9976 --message balance_of --args 0x1111111111111111111111111111111111111111 --suri "dice devote amateur toss apart replace summer minor order humor derive turtle" --url wss://testnet-passet-hub.polkadot.io --skip-confirm
```