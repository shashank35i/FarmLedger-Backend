# FarmLedger

FarmLedger is a blockchain‑anchored agricultural traceability platform that makes every batch verifiable from farm to consumer. It pairs a role‑based mobile experience with a PHP API, a Hardhat local chain, and a lightweight chain bridge that anchors batch hashes on‑chain.

**Why it matters**
- Counterfeit produce and opaque supply chains erode trust.
- FarmLedger makes provenance auditable with a tamper‑evident hash trail.
- Consumers and buyers can verify a product’s journey with a single scan.

**Core roles**
- **Farmer:** creates crop batches, generates QR, and initiates transfers.
- **Distributor:** verifies batches, updates transport/location, and passes custody.
- **Retailer:** confirms receipt, manages inventory, and sells verified goods.
- **Consumer:** scans QR to view the full journey and verify authenticity.

**What makes it special**
- On‑chain anchoring of batch hashes (`FARMLEDGER|v1` QR payloads).
- Real‑time custody trail across multiple actors.
- QR‑first flow for fast verification in the field.
- Designed for scale: stateless bridge, MySQL schema, JWT auth.

## Architecture

1. **Android App (Kotlin)**  
   Role‑aware UI for Farmers, Distributors, Retailers, and Consumers.

2. **PHP API (Apache + MySQL)**  
   Auth, batch creation, transfers, verification, and profile endpoints.

3. **Chain Bridge (Node + Express)**  
   Anchors batch hashes on the local chain and serves chain verification.

4. **Smart Contract (Hardhat)**  
   `FarmLedgerRegistry` stores batch hash by batch code.

## Folder Structure

- `api/` PHP API endpoints + schema
- `farmledger_chain_bridge/` Hardhat + bridge server + contract
- `docker/` Dockerfiles
- `docker-compose.yml` Full local stack

## Local Development (Docker)

1. Copy env:
```bash
cp .env.example .env
```

2. Start stack:
```bash
docker compose up --build
```

**Services started**
- MySQL (auto‑imports `api/schema_query.sql`)
- PHP/Apache API on port `8080`
- Hardhat local chain on port `8545`
- Chain bridge on port `5055`

**Health checks**
```bash
curl http://localhost:5055/bridge/health
curl http://localhost:8080/batches/my_products.php
```

**Verify on‑chain flow**
```bash
curl -X POST http://localhost:5055/chain/batchCreated \
  -H "Content-Type: application/json" \
  -d "{\"batch_code\":\"1\",\"hash_hex\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}"

curl http://localhost:5055/chain/batch/1
```

**DB sanity check**
```bash
mysql -h 127.0.0.1 -u farmledger -pfarmledger -e "USE farmledger; SHOW TABLES;"
```

## Environment Variables

- `DB_NAME`, `DB_USER`, `DB_PASS`, `DB_ROOT_PASS`
- `API_PORT`
- `HARDHAT_PORT`, `BRIDGE_PORT`
- `RPC_URL`, `PRIVATE_KEY`, `CONTRACT_ADDRESS`
- `CHAIN_BRIDGE_URL`
- `JWT_SECRET`

## Smart Contract

`FarmLedgerRegistry` provides:
- `recordBatchCreated(batchCode, payloadHash)`
- `getBatchHash(batchCode)`

The chain bridge proxies these for local development and deterministic testing.

## API Highlights

Key modules:
- `api/auth/` OTP + JWT authentication
- `api/farmer/` batch creation + QR generation
- `api/distributor/` transfer + transport updates
- `api/retailer/` receipt confirmation + inventory
- `api/consumer/` verification + journey lookup

## Production Notes

- Move SMTP and JWT secrets into environment variables.
- Remove build artifacts and cached Hardhat outputs before publishing.
- Use a managed database and HTTPS reverse proxy in production.

## Mobile App

The Android client is the primary interface for all roles. It expects:
- `API_BASE_URL` pointing to the API container (or remote server).
- QR scan flow for verification and custody hand‑offs.

If you keep the Android app in a separate repo, wire the base URL to your API host.
