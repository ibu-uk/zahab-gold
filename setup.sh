#!/bin/bash
echo "⚜ Zahab Gold v2 Setup"
echo "Installing backend dependencies..."
cd backend && npm install
echo "✅ Done. Run: cd backend && npm start"
echo "Import DB: mysql -u root -p < database/schema.sql"
