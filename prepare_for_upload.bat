@echo off
setlocal enabledelayedexpansion

:: 🧹 اسكربت تنظيف المشروع قبل الرفع أو الضغط 🧹

echo [1/4] جاري مسح مجلدات الـ Build...
if exist "dist" rd /s /q "dist"

echo [2/4] جاري مسح ملفات الـ Environment الحساسة...
:: سيتم سؤالك قبل المسح لحماية بياناتك
set /p del_env="هل تريد مسح ملف .env قبل الرفع؟ (Y/N): "
if /i "%del_env%"=="Y" (
    if exist ".env" del .env
    echo ✅ تم مسح .env
)

echo [3/4] جاري مسح مجلد الـ node_modules (هذا سيقلل مساحة المشروع جداً قبل الرفع)...
set /p del_nm="هل تريد مسح node_modules؟ (Y/N): "
if /i "%del_nm%"=="Y" (
    if exist "node_modules" rd /s /q "node_modules"
    echo ✅ تم مسح node_modules
)

echo [4/4] جاري مسح أي ملفات مؤقتة أو سجلات أخطاء...
del /q *.log
del /q .DS_Store
if exist ".vercel" rd /s /q ".vercel"

echo.
echo ✨ مبروك! المشروع الآن "نظيف" وجاهز للضغط (ZIP) والرفع على GitHub أو Vercel.
echo ملاحظة: ستحتاج لتشغيل "npm install" مجدداً إذا أردت تشغيل المشروع محلياً.
echo.
pause
