# ⚜ Zahab Gold Management System v2

Production-ready gold shop management for Kuwait & GCC countries.

## Default Login
- **Email:** admin@zahab.com
- **Password:** Admin@1234  
> Change this immediately after first login via Settings → Change Password

## Setup

```bash
# 1. Install backend dependencies
cd backend && npm install

# 2. Import database
mysql -u root -p < ../database/schema.sql

# 3. Configure environment
cp .env .env.local
# Edit .env with your DB credentials and JWT secret

# 4. Start server
npm start
# Open http://localhost:3000
```

## What's New in v2
- ✅ Critical bug fixes (users page, categories route, stock validation, VAT)
- ✅ Arabic / RTL full UI toggle
- ✅ Barcode scanner support in POS
- ✅ Real stock display on POS item cards
- ✅ Hold sale with multiple holds
- ✅ Item edit and delete from catalog
- ✅ Customer view, edit, purchase history
- ✅ Proper branch add/edit modal (no more prompts)
- ✅ Buyback — buy gold from customers with live price calculation
- ✅ Returns & Refunds with stock-back on completion
- ✅ Purchase Orders for stock intake from suppliers
- ✅ Installment plans with payment schedule tracking
- ✅ Supplier management
- ✅ Category management
- ✅ Audit log for all actions
- ✅ Low stock alerts
- ✅ Dashboard charts (Chart.js)
- ✅ Export reports to CSV
- ✅ Print invoice styles (@media print)
- ✅ WhatsApp notifications for orders
- ✅ Live gold price API (goldapi.io)
- ✅ CORS locked to your domain
- ✅ Login rate limiting (10 attempts / 15 min)
- ✅ Session auto-timeout (configurable)
- ✅ Real bcrypt admin password

## GCC VAT Rates (correct per country)
| Country | VAT |
|---------|-----|
| Kuwait  | 0%  |
| Saudi Arabia | 15% |
| UAE | 5% |
| Bahrain | 10% |
| Qatar | 0% |
| Oman | 5% |

## Security Checklist Before Production
- [ ] Change JWT_SECRET in .env to a long random string
- [ ] Set ALLOWED_ORIGINS to your exact domain
- [ ] Change admin password from Admin@1234
- [ ] Configure GOLD_API_KEY from goldapi.io
- [ ] Enable HTTPS (use nginx + certbot)
- [ ] Set NODE_ENV=production
