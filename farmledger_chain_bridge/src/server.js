// Lightweight bridge server to satisfy backend expectations without altering ABI.
require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = parseInt(process.env.BRIDGE_PORT, 10) || 5055;
const CHAIN_ID =
  process.env.CHAIN_ID ||
  process.env.NETWORK_CHAIN_ID ||
  (() => {
    try {
      const deployment = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'deployments', 'local.json'), 'utf8')
      );
      return String(deployment.chainId || '31337');
    } catch (_e) {
      return '31337';
    }
  })();

const CONTRACT_ADDRESS =
  process.env.CONTRACT_ADDRESS ||
  (() => {
    try {
      const deployment = JSON.parse(
        fs.readFileSync(path.join(__dirname, '..', 'deployments', 'local.json'), 'utf8')
      );
      return deployment.address;
    } catch (_e) {
      return undefined;
    }
  })();

app.use(express.json());

// In-memory store is enough for local smoke tests.
const batches = new Map(); // batchCode -> record

const makeTxHash = (hashHex) => {
  const hex = (hashHex || '').replace(/^0x/, '').padEnd(64, '0').slice(0, 64);
  return `0x${hex}`;
};

app.get('/bridge/health', (_req, res) => {
  res.json({ ok: true, status: 'UP', chain_id: CHAIN_ID, contract_address: CONTRACT_ADDRESS });
});

app.post('/chain/batchCreated', (req, res) => {
  const { batch_code: batchCode, hash_hex: hashHex } = req.body || {};
  if (!batchCode || !hashHex) {
    return res.status(400).json({ error: 'batch_code and hash_hex required' });
  }

  const tx_hash = makeTxHash(hashHex);
  const block_number = Math.floor(Date.now() / 1000); // pseudo block height
  const record = {
    batch_code: batchCode,
    hash_hex: hashHex.toLowerCase(),
    tx_hash,
    block_number,
    chain_id: CHAIN_ID,
    contract_address: CONTRACT_ADDRESS,
    status: 'CONFIRMED',
  };
  batches.set(String(batchCode), record);
  return res.json(record);
});

app.get('/chain/batch/:code', (req, res) => {
  const code = req.params.code;
  const record = batches.get(String(code));
  if (!record) return res.status(404).json({ error: 'Batch not found' });
  return res.json(record);
});

app.get('/bridge/tx/:tx', (req, res) => {
  const tx = String(req.params.tx || '').toLowerCase();
  const record = [...batches.values()].find((b) => b.tx_hash.toLowerCase() === tx);
  if (!record) return res.status(404).json({ error: 'Tx not found' });
  return res.json(record);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Bridge server listening on ${PORT} chainId=${CHAIN_ID} contract=${CONTRACT_ADDRESS || 'n/a'}`);
});
