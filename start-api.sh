#!/bin/bash
cd /Users/richard/singularity/apps/api
export $(grep -v '^#' .env | xargs)
echo "Starting API on port $PORT..."
cd /Users/richard/singularity
npx tsx apps/api/src/index.ts
