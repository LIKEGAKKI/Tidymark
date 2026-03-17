#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🧹 Cleaning build artifacts..."
rm -rf dist
echo "✅ Clean complete"
