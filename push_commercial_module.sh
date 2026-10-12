#!/usr/bin/env bash
# ==============================================================================
# Nexora Food - Push Commercial Onboarding Module Changes to GitHub
# ==============================================================================

set -e

echo "🔍 Step 1: Checking working directory status..."
git status

echo ""
echo "📦 Step 2: Staging all files and updates..."
git add .

echo ""
echo "📋 Staged files summary:"
git status --short

echo ""
echo "💾 Step 3: Committing restaurant onboarding module implementation..."
git commit -m "feat(commercial): complete restaurant onboarding module implementation"

echo ""
echo "🚀 Step 4: Pushing changes to remote main branch..."
git push origin main

echo ""
echo "✅ Successfully pushed all changes to 'main' branch!"
