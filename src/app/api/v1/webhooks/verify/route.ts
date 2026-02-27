import { apiSuccess } from "@/lib/api-response";

const examples = {
  node: `const crypto = require('crypto');

function verifyWebhook(body, signature, timestamp, secret) {
  const payload = \`\${timestamp}.\${body}\`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express example
app.post('/webhooks/goblink', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-goblink-signature'];
  const timestamp = req.headers['x-goblink-timestamp'];

  if (!verifyWebhook(req.body.toString(), signature, timestamp, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  console.log('Received:', event.event, event.data);
  res.sendStatus(200);
});`,

  python: `import hmac
import hashlib

def verify_webhook(body: str, signature: str, timestamp: str, secret: str) -> bool:
    payload = f"{timestamp}.{body}"
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

# Flask example
from flask import Flask, request, abort

@app.route('/webhooks/goblink', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-GoBlink-Signature')
    timestamp = request.headers.get('X-GoBlink-Timestamp')
    body = request.get_data(as_text=True)

    if not verify_webhook(body, signature, timestamp, WEBHOOK_SECRET):
        abort(401)

    event = request.get_json()
    print(f"Received: {event['event']}", event['data'])
    return '', 200`,

  ruby: `require 'openssl'

def verify_webhook(body, signature, timestamp, secret)
  payload = "#{timestamp}.#{body}"
  expected = OpenSSL::HMAC.hexdigest('SHA256', secret, payload)
  Rack::Utils.secure_compare(signature, expected)
end

# Sinatra example
post '/webhooks/goblink' do
  body = request.body.read
  signature = request.env['HTTP_X_GOBLINK_SIGNATURE']
  timestamp = request.env['HTTP_X_GOBLINK_TIMESTAMP']

  halt 401, 'Invalid signature' unless verify_webhook(body, signature, timestamp, WEBHOOK_SECRET)

  event = JSON.parse(body)
  puts "Received: #{event['event']} #{event['data']}"
  status 200
end`,

  go: `package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
)

func verifyWebhook(body, signature, timestamp, secret string) bool {
	payload := fmt.Sprintf("%s.%s", timestamp, body)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(payload))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}

func webhookHandler(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	signature := r.Header.Get("X-GoBlink-Signature")
	timestamp := r.Header.Get("X-GoBlink-Timestamp")

	if !verifyWebhook(string(body), signature, timestamp, webhookSecret) {
		http.Error(w, "Invalid signature", http.StatusUnauthorized)
		return
	}

	fmt.Printf("Received webhook: %s\\n", string(body))
	w.WriteHeader(http.StatusOK)
}`,

  php: `<?php

function verifyWebhook(string $body, string $signature, string $timestamp, string $secret): bool {
    $payload = "{$timestamp}.{$body}";
    $expected = hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}

// Usage
$body = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_GOBLINK_SIGNATURE'] ?? '';
$timestamp = $_SERVER['HTTP_X_GOBLINK_TIMESTAMP'] ?? '';

if (!verifyWebhook($body, $signature, $timestamp, $webhookSecret)) {
    http_response_code(401);
    echo 'Invalid signature';
    exit;
}

$event = json_decode($body, true);
error_log("Received: {$event['event']} " . json_encode($event['data']));
http_response_code(200);`,
};

// GET /api/v1/webhooks/verify — Webhook signature verification examples
export async function GET() {
  return apiSuccess({
    description: "goBlink webhooks are signed with HMAC-SHA256. The signature is computed over '{timestamp}.{raw_body}' using your webhook secret.",
    headers: {
      "X-GoBlink-Signature": "HMAC-SHA256 hex digest",
      "X-GoBlink-Timestamp": "Unix timestamp (seconds) when the webhook was sent",
      "X-GoBlink-Event": "The event type (e.g. payment.confirmed)",
    },
    verification_steps: [
      "1. Read the raw request body (do not parse JSON first)",
      "2. Get X-GoBlink-Signature and X-GoBlink-Timestamp headers",
      "3. Compute HMAC-SHA256 of '{timestamp}.{body}' using your webhook secret",
      "4. Compare the computed signature with X-GoBlink-Signature using constant-time comparison",
      "5. Optionally reject requests where the timestamp is more than 5 minutes old",
    ],
    examples,
  });
}
