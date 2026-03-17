#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🚀 Starting Tidymark dev mode..."
npx vite build --watch --mode development
