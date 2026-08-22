// contracts/format_deployments.js
const fs = require('fs');
const path = require('path');

const chainId = process.argv[2];
if (!chainId) {
  console.error("❌ Please provide a chainId! Example: node format_deployments.js 16602");
  process.exit(1);
}

const frontendPath = path.join(__dirname, '../frontend/src/deployments.json');

const tempPath = './temp_addresses.json';
if (!fs.existsSync(tempPath)) {
  console.error("❌ temp_addresses.json not found. Did you run `forge script` first?");
  process.exit(1);
}

const addresses = JSON.parse(fs.readFileSync(tempPath, 'utf8'));

const agentraArtifact = JSON.parse(fs.readFileSync('./out/Agentra.sol/Agentra.json', 'utf8'));
const registryArtifact = JSON.parse(fs.readFileSync('./out/AgentraRegistry.sol/AgentraRegistry.json', 'utf8'));
// NEW: TrustedOracleVerifier lives in the same file as the IERC7857DataVerifier interface
const verifierArtifact = JSON.parse(fs.readFileSync('./out/Agentra.sol/TrustedOracleVerifier.json', 'utf8'));

let deployments = {};
if (fs.existsSync(frontendPath)) {
  const rawData = fs.readFileSync(frontendPath, 'utf8').trim();
  if (rawData) {
    try {
      deployments = JSON.parse(rawData);
    } catch (e) {
      console.warn("⚠️ deployments.json was malformed. Overwriting with fresh JSON.");
      deployments = {};
    }
  }
}

deployments[chainId] = {
  Agentra: {
    address: addresses.Agentra,
    abi: "%%AGENTRA_ABI%%"
  },
  AgentraRegistry: {
    address: addresses.AgentraRegistry,
    abi: "%%REGISTRY_ABI%%"
  },
  Verifier: {
    address: addresses.Verifier,
    abi: "%%VERIFIER_ABI%%"
  }
};

let outputJson = JSON.stringify(deployments, null, 2);

outputJson = outputJson.replace('"%%AGENTRA_ABI%%"', JSON.stringify(agentraArtifact.abi));
outputJson = outputJson.replace('"%%REGISTRY_ABI%%"', JSON.stringify(registryArtifact.abi));
outputJson = outputJson.replace('"%%VERIFIER_ABI%%"', JSON.stringify(verifierArtifact.abi));

fs.writeFileSync(frontendPath, outputJson);
fs.unlinkSync('./temp_addresses.json');

console.log(`✅ Deployments auto-synced to frontend for Chain ID ${chainId}`);