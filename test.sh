#!/bin/bash

API="http://localhost:8000"
PROMPT="${1:-cylinder radius 5 height 10}"

echo "Generating: $PROMPT"
curl -s -X POST $API/generate \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"$PROMPT\"}" | python3 -m json.tool

echo ""
echo "Downloading STL..."
curl -s -o shape.stl $API/download/stl
echo "Saved as shape.stl ($(wc -c < shape.stl | tr -d ' ') bytes)"
