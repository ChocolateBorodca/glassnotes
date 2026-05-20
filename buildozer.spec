[app]
title = Notes club
package.name = notesclub
package.domain = org.glassnotes
source.dir = .
source.include_exts = py,png,jpg,kv,atlas,html,js,css
version = 1.0
orientation = portrait
fullscreen = 1
icon.filename = logo.png

# ГАРАНТИРУЕТ СБОРКУ ОДНОГО ЦЕЛЬНОГО ФАЙЛА .APK БЕЗ СЛОЖНЫХ НАБОРОВ
android.build_mode = debug

# Настройки для сборки Android
android.api = 33
android.minapi = 21
android.ndk = 25.b
android.archs = armeabi-v7a, arm64-v8a
android.allow_backup = True

[buildozer]
log_level = 2
warn_on_root = 1
