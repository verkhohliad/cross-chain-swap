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