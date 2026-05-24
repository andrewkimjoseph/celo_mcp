#!/usr/bin/env npx tsx
import { encryptPrivateKey } from "../src/crypto/wallet-key-crypto.js";

function parseArgs(argv: string[]) {
  let url: string | undefined;
  let key: string | undefined;
  let publicKeyFile: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--url" && argv[i + 1]) {
      url = argv[++i];
    } else if (arg === "--key" && argv[i + 1]) {
      key = argv[++i];
    } else if (arg === "--public-key-file" && argv[i + 1]) {
      publicKeyFile = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return { url, key, publicKeyFile };
}

function printUsage() {
  console.log(`Usage: encrypt-key [options]

Encrypt a private key for Celina with the server's RSA public key.

Options:
  --url <url>                 Fetch public key from server (e.g. https://celina.onrender.com)
  --public-key-file <path>    Use a local PEM public key file instead of --url
  --key <0x...>                Private key to encrypt (required)

Examples:
  npm run encrypt-key -- --url https://celina.onrender.com --key 0xabc...
  npm run encrypt-key -- --public-key-file ./public.pem --key 0xabc...
`);
}

async function fetchPublicKey(url: string): Promise<string> {
  const base = url.replace(/\/$/, "");
  const response = await fetch(`${base}/public-key`);
  if (!response.ok) {
    throw new Error(`Failed to fetch public key: ${response.status} ${response.statusText}`);
  }
  const data = (await response.json()) as { publicKey: string };
  if (!data.publicKey) {
    throw new Error("Response missing publicKey field.");
  }
  return data.publicKey;
}

async function loadPublicKeyFromFile(path: string): Promise<string> {
  const { readFile } = await import("node:fs/promises");
  return readFile(path, "utf8");
}

async function main() {
  const { url, key, publicKeyFile } = parseArgs(process.argv.slice(2));

  if (!key) {
    console.error("Error: --key is required.\n");
    printUsage();
    process.exit(1);
  }

  if (!url && !publicKeyFile) {
    console.error("Error: provide --url or --public-key-file.\n");
    printUsage();
    process.exit(1);
  }

  const publicKeyPem = url
    ? await fetchPublicKey(url)
    : await loadPublicKeyFromFile(publicKeyFile!);

  const encrypted = encryptPrivateKey(publicKeyPem, key);
  console.log(encrypted);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
