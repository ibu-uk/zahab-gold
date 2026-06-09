@echo off
echo ============================================================
echo   ZAHAB GOLD MANAGEMENT SYSTEM — Setup Script
echo ============================================================
echo.

echo [1/4] Installing Node.js dependencies...
cd backend
call npm install
if errorlevel 1 ( echo ERROR: npm install failed. Make sure Node.js is installed. & pause & exit /b 1 )

echo.
echo [2/4] Creating uploads directories...
if not exist "..\frontend\assets\uploads\items"  mkdir "..\frontend\assets\uploads\items"
if not exist "..\frontend\assets\uploads\orders" mkdir "..\frontend\assets\uploads\orders"

echo.
echo [3/4] Setting up database...
echo   Please import the schema manually:
echo   mysql -u root -p zahab_gold ^< ..\database\schema.sql
echo   (or use phpMyAdmin to import database/schema.sql)

echo.
echo [4/4] Setup complete!
echo.
echo ============================================================
echo   To START the server:
echo     cd backend
echo     npm start
echo.
echo   Then open: http://localhost:3000
echo   Login: admin@zahab.com / admin123
echo ============================================================
echo.
pause
