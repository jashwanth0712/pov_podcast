#!/bin/bash

# Script to generate all pending images for prebuilt scenarios
# Run this after RunPod billing is resolved

echo "=== POV Podcast Image Generation ==="
echo ""

# Check pending jobs first
echo "Checking pending jobs..."
npx convex run imageGeneration:getPendingImageJobs '{}'

echo ""
read -p "Proceed with generation? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting image generation..."
    echo "This may take a while (each image takes ~30-60 seconds)"
    echo ""
    npx convex run imageGeneration:runAllPendingJobs '{}'
    echo ""
    echo "Done!"
else
    echo "Aborted."
fi
