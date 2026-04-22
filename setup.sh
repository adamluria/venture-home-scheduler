#!/bin/bash
# venture-home-scheduler — one-time setup script
# Run once after unzipping: bash setup.sh

echo ""
echo "Setting up venture-home-scheduler..."
echo ""

if [ -f ".env.local" ]; then
  echo "✓ .env.local already exists — skipping copy"
else
  cp .env.example .env.local
  echo "✓ Created .env.local from .env.example"
fi

echo ""
echo "Next steps:"
echo "  1. Open the QUICKSTART.pdf for step-by-step instructions"
echo "  2. Edit .env.local and fill in each API key (instructions in the PDF)"
echo "  3. Run: npm run dev"
echo ""
echo "Need help? → ignition.venturehome.com → 'I have an existing project'"
echo ""
