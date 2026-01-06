# RPC Gateway

A TypeScript HTTP gateway with ordered RPC providers and bounded failover. Each deployment supports optional mainnet and testnet provider pools. Configure either environment alone or both in one process. The gateway does not select a blockchain or validate the network behind a provider.

## Run

Requires Node.js 22.14 or later.

```sh
npm ci
cp .env.example .env
cp config/gateway.example.json config/gateway.json
```

Set real upstream URLs in `.env`. Provider priority and request limits live in `config/gateway.json`. The example defines both mainnet and testnet; remove the entire network block for any environment you do not need. Omitted networks do not require URL environment variables and do not expose their RPC routes. Failover is enabled for every RPC method automatically; no method names or blockchain presets are required.

```sh
npm run dev
```

For compiled execution:

```sh
npm run build
npm start
```

The service loads `.env` if present. Existing process environment variables take precedence. Configuration is loaded once at startup; restart after changing it. Set `GATEWAY_CONFIG` to use another configuration file.

## Docker

The Docker setup follows the same production pattern as the related services: a multi-stage Node.js 24 image, production dependencies, a non-root runtime user, Compose init, and a 30-second graceful stop period. Secrets and local configuration are excluded from the image build.

Prepare `.env` and `config/gateway.json` as described above, then start the service in the background:

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f --tail=100 gateway
```

The gateway is published at `http://127.0.0.1:3000`. Mainnet uses `/rpc` and testnet uses `/rpc-testnet`, according to the configured networks. Set `GATEWAY_PUBLISH_PORT` in `.env` to change the host port. The localhost binding matches the reverse-proxy deployment pattern used by the related services.

The published port explicitly uses `host_ip: 127.0.0.1`, so it is available from the VPS itself rather than directly through the VPS public IP. `GATEWAY_HOST=0.0.0.0` controls listening inside the isolated container and is needed for Docker port forwarding. The Compose service uses bridge networking, without host networking. A reverse proxy or another service explicitly configured to forward traffic can expose the gateway separately.

Compose injects `.env` at runtime and mounts the `config` directory read-only. It fixes the container listen address to `0.0.0.0:3000` using `GATEWAY_HOST` and `GATEWAY_PORT`, so a local `127.0.0.1` setting in the JSON configuration does not prevent Docker port forwarding. Direct Node.js execution still uses the JSON listen settings unless these environment overrides are supplied.

The `unless-stopped` restart policy restarts an exited container and restores it after Docker starts again, unless it was manually stopped. Docker must itself start with the host operating system. Closing the terminal does not stop a detached container. The healthcheck probes `/healthz`; an unhealthy status alone does not trigger Docker's restart policy. Container logs rotate at 10 MB with three files retained.

After changing RPC configuration, restart the service:

```sh
docker compose restart gateway
```

After changing `.env`, recreate it to apply the updated environment:

```sh
docker compose up -d --force-recreate gateway
```

To stop the deployment intentionally:

```sh
docker compose down
```

## Endpoints

- `POST /rpc` or `POST /`: mainnet, available only when `networks.mainnet` is configured.
- `POST /rpc-testnet`: testnet, available only when `networks.testnet` is configured.
- `GET /healthz`: process liveness; this does not probe upstream providers.

Clients must send `Content-Type: application/json`. Request IDs, methods, and parameters are forwarded without chain-specific transformations. Notifications, batches, REST APIs such as Horizon, and WebSocket subscriptions are not supported in this initial version.

RPC routes accept one JSON-RPC 2.0 request with an explicit `id`. An omitted network's route returns HTTP `404`; it never falls back to the other environment.

Point an HTTP JSON-RPC client at `http://127.0.0.1:3000/rpc`. Use a method supported by the configured providers:

```sh
curl http://127.0.0.1:3000/rpc \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

## Configuration

| Field              | Default     | Meaning                                                            |
| ------------------ | ----------- | ------------------------------------------------------------------ |
| `host`             | `127.0.0.1` | Listen address                                                     |
| `port`             | `3000`      | Listen port                                                        |
| `attemptTimeoutMs` | `3000`      | Maximum time for an upstream attempt, including its response body  |
| `requestTimeoutMs` | `8000`      | Total request deadline, including incoming body reading            |
| `maxAttempts`      | `3`         | Maximum distinct providers attempted per request                   |
| `maxRequestBytes`  | `1048576`   | Incoming body limit                                                |
| `maxResponseBytes` | `5242880`   | Upstream body limit after decompression                            |
| `redactEnv`        | `[]`        | Additional environment variable names containing secrets to redact |
| `networks.mainnet` | Omitted     | Mainnet provider pool, exposing `/rpc` and `/`                     |
| `networks.testnet` | Omitted     | Testnet provider pool, exposing `/rpc-testnet`                     |

At least one network must be defined. Each defined network requires a nonempty `providers` array with at least one enabled provider. Shared deadlines, body limits, and attempt limits apply to both pools. For example, this testnet-only configuration exposes `/rpc-testnet` and leaves `/rpc` unavailable:

```json
{
  "networks": {
    "testnet": {
      "providers": [
        {
          "name": "primary",
          "urlEnv": "TESTNET_PRIMARY_RPC_URL",
          "priority": 1
        }
      ]
    }
  }
}
```

Add a sibling `mainnet` block to expose both environments. Each block contains its own provider list and priorities. A mainnet-only configuration uses the same shape with only the `mainnet` block. The previous top-level `providers` array now belongs under `networks.mainnet.providers` or `networks.testnet.providers`, according to the actual environment of those RPC URLs.

Each provider has a unique `name` within its network, a `urlEnv` pointing to its URL environment variable, and a nonnegative integer `priority`. Lower priority values are tried first; ties preserve configuration order. `enabled` defaults to `true`. Disabled providers do not require their environment variables. Duplicate enabled URLs within a network are rejected. Provider names may be reused across mainnet and testnet.

Optional `headersEnv` maps upstream header names to environment variable names:

```json
{
  "name": "primary",
  "urlEnv": "PRIMARY_RPC_URL",
  "priority": 1,
  "headersEnv": {
    "authorization": "PRIMARY_RPC_AUTH"
  }
}
```

For example, set `PRIMARY_RPC_AUTH` to the complete authorization header value. Incoming client headers are not forwarded. Provider redirects are not followed. HTTP and HTTPS URLs are supported; URL user info and fragments are rejected.

## Failover behavior

Every request starts with the first enabled provider in its selected environment. Each provider is attempted at most once, with a shared deadline and a maximum attempt count. Failover never crosses between mainnet and testnet. Concurrent client requests have independent attempt budgets. The gateway applies the same failure classification to every method, including contract calls and transaction submission, without maintaining a method allowlist.

The next provider is tried after a network failure, timeout, malformed response, mismatched response ID, oversized response, or HTTP `401`, `402`, `403`, `404`, `408`, `429`, or any `5xx` infrastructure failure. This includes an HTTP 404 from an incorrect upstream URL. Other HTTP failures terminate the request.

Valid JSON-RPC application errors, invalid requests and parameters, unknown errors, and operation failures inside `result` are returned without failover. A transaction error inside a valid JSON-RPC response is preserved even when the HTTP status is `500` or `404`.

Provider errors inside a valid JSON-RPC error envelope can also trigger failover. Known standalone infrastructure messages such as `Rate limit exceeded`, `Quota exceeded`, `Too many requests`, `API key expired`, and `Service unavailable` are recognized after case, whitespace, and trailing punctuation normalization. JSON-RPC errors carried by HTTP `401`, `402`, `403`, or `429` are classified as provider failures, except standard caller errors such as invalid parameters. A message containing these words as part of an execution error does not match. Error codes alone do not identify quota failures.

For a provider with a different error format, its optional `infrastructureErrors` configuration supplies exact code-and-message pairs:

```json
"infrastructureErrors": [
  {
    "code": -32099,
    "message": "Provider usage budget reached"
  }
]
```

Only configure errors that identify provider infrastructure failures. Unknown JSON-RPC errors remain terminal because providers can reuse the same codes for operation and infrastructure errors. Rules are specific to a provider, without chain-specific logic in the gateway.

Each attempt preserves the RPC ID, method, and parameters. The gateway does not sign, rebuild, or modify transactions. A timeout does not establish whether the first provider accepted a transaction; failover resends the same payload and does not guarantee exactly-once execution. The client can query transaction status using the original transaction identifier.

If all eligible attempts fail, the gateway returns HTTP `503`; the total deadline returns `504`. Gateway errors include a tracking ID in `error.data.requestId`. The `x-request-id` response header is generated by the gateway for every request.

| Gateway error code | Meaning                                                   |
| ------------------ | --------------------------------------------------------- |
| `-32700`           | Invalid JSON                                              |
| `-32600`           | Invalid or unsupported request, or request too large      |
| `-32603`           | Internal gateway failure                                  |
| `-32000`           | No provider succeeded within the attempt limit            |
| `-32001`           | Request deadline exceeded                                 |
| `-32003`           | Upstream HTTP rejection that is not eligible for failover |

These codes describe gateway-generated errors. Upstream JSON-RPC errors retain their own codes and data, subject to secret redaction.

## Logs and secrets

Pino handles application logging. `npm run dev` uses readable `pino-pretty` output, while production and Docker retain structured JSON for collection and filtering. `LOG_LEVEL` defaults to `info` and supports `debug`, `info`, `warn`, `error`, and `fatal`. Failovers and provider failures use `warn`; gateway errors use `error`; startup failures use `fatal`. `LOG_FORMAT=json` explicitly selects JSON output during development. Compose fixes the format to JSON, and the production image does not include the development formatter.

Each record includes a severity level, ISO timestamp, event name, and message. Attempt logs include the tracking ID, environment (`mainnet` or `testnet`), internal provider name, RPC method, duration, HTTP status, failure category, transport error code when available, and RPC error code. Failover, skipped failover, and request completion are separate events. Startup logs list configured networks. Skipped failover logs identify HTTP rejections that are not infrastructure failures. Provider failures inside JSON-RPC envelopes use the `provider_error` category. Collect or redirect the logger's standard output with the deployment's log system.

To view Docker JSON logs through the readable formatter on a development machine with dev dependencies installed:

```sh
docker compose logs --no-log-prefix -f gateway | ./node_modules/.bin/pino-pretty
```

Upstream URLs, upstream headers, request bodies, and provider error messages are not logged. Pino also redacts configured sensitive field names, including authorization, API keys, URLs, headers, bodies, and parameters. Responses are rebuilt from validated JSON-RPC fields, without upstream HTTP headers. Known provider URLs and origins, query parameter values, long URL path segments, configured header values, and additional `redactEnv` values are redacted from response string values. Numeric values and the caller's top-level JSON-RPC ID are preserved. Add short path-based API keys or other provider-specific secrets through `redactEnv`; redaction cannot recognize arbitrary encoded or transformed secrets.

Functions use one file each, and shared types live under `src/types`.

## Verification and next steps

```sh
npm run check
npm run build
npm test
```

Tests use local mock HTTP providers and require no real RPC credentials.

This first step implements the request path, ordered failover, infrastructure error classification, limits, and structured logging. Circuit breakers, cooldown and recovery probes, metrics, batches, subscriptions, and access controls are separate future steps. No persistent health state is maintained yet, so the next request starts with the primary provider again.

## License

MIT License. Copyright (c) 2025 poconik. See [LICENSE](LICENSE).
