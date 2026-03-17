#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔨 Building Tidymark..."
npx vite build
echo "✅ Build complete → dist/"
