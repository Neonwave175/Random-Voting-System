#!/bin/bash
# Clears all vote data, tokens, and registry. Keys are preserved.

DATA_DIR="$(dirname "$0")/data"

rm -f "$DATA_DIR/used-voters.json" "$DATA_DIR/voter-registry.json" "$DATA_DIR/votes.json"

echo "Cleared: votes, used tokens, voter registry."
echo "Keys kept: private.pem, public.pem, public.jwk"
