const { exec } = require("child_process");

const executionDirectory = "../../contracts/ink/htlc-factory/";

const command = `cargo contract call \
  --contract 0x75e742d4c46cd85f3dc1866335394b53eada6867 \
  --message create_native_escrow \
  --args 0x6bd3cd4c04b9899c0fee3db05b4971256e153b70 0x86c47f76ff4a6cb8ee9c172982eda47e895262b5a6a7582aaf7d97295ce1d8d4 1000 1000000000000 None \
  --value 6000000000000 \
  --skip-confirm \
  -x \
  --url wss://testnet-passet-hub.polkadot.io \
  --suri ""`;

console.log(`Executing in directory: ${executionDirectory}`);
console.log(`Command: ${command.replace(/\s+/g, " ")}`);

// Execute the command
exec(command, { cwd: executionDirectory }, (error, stdout, stderr) => {
  if (error) {
    // This catches system errors or non-zero exit codes from the command
    console.error(`\n❌ COMMAND FAILED with exit code ${error.code}:`);
    console.error(`Error message: ${error.message}`);
    if (stderr) console.error(`Command STDERR: ${stderr}`);
    return;
  }

  if (stderr) {
    // stderr often contains warnings or extra diagnostic info even on success
    console.warn(`\n⚠️ Command completed with warnings (STDERR): ${stderr}`);
  }

  // Success output
  console.log(`\n✅ COMMAND SUCCESSFUL (STDOUT):`);
  console.log(stdout);
});
