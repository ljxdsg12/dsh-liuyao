// 生成「一键安装」批处理脚本（给非技术用户用）。
//
// 设计取舍（每一处都是踩过坑之后改的）：
//   · 纯 ASCII 输出：cmd 的代码页处理不可靠，中文极易乱码 → 说明另放 安装说明.txt
//   · 强制 CRLF：LF-only 会让 cmd 误解析，表现为「闪一下就没了」
//   · 不假设 profile 名：插件只在该 profile 被启动时才加载，所以必须自动识别
//   · 不假设安装路径：PATH → 桌面快捷方式反推 → 扫描常见目录，三道查找
//   · 结尾 pause：否则出错时窗口一闪而过，用户看不到原因
//
// 用法：node scripts/make-installer.mjs <输出目录> [包文件名]
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = process.argv[2]
const pkgName = process.argv[3] ?? 'dsh-liuyao-0.1.0.tar.gz'

if (!outDir) {
  console.error('用法: node scripts/make-installer.mjs <输出目录> [包文件名]')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const version = pkg.version

const cmd = `@echo off
chcp 65001 >nul 2>nul
setlocal EnableExtensions
title Liuyao Plugin Installer

echo ===============================================
echo   Liuyao Plugin - One-Click Installer
echo ===============================================
echo.

rem ============ 1. locate the package ============
set "HERE=%~dp0"
set "PKG="
if exist "%HERE%${pkgName}" set "PKG=%HERE%${pkgName}"
if not defined PKG if exist "%HERE%dsh-liuyao-${version}.tgz" set "PKG=%HERE%dsh-liuyao-${version}.tgz"
if not defined PKG (
  for %%F in ("%HERE%dsh-liuyao-*.tar.gz" "%HERE%dsh-liuyao-*.tgz") do if not defined PKG set "PKG=%%~fF"
)
if not defined PKG (
  echo [ERROR] Package not found, expected ${pkgName}
  echo         Keep this cmd file in the SAME folder as the package.
  echo         Current folder: %HERE%
  goto :end
)
echo [1/5] Package: %PKG%
echo.

rem ============ 2. locate DeepSeek Harness ============
echo [2/5] Looking for DeepSeek Harness...
set "DSH="

rem 2a. already on PATH
for %%P in (dsh.cmd) do if not defined DSH if not "%%~$PATH:P"=="" set "DSH=%%~$PATH:P"

rem 2b. derive from desktop / start menu shortcut
if not defined DSH (
  for %%L in ("%USERPROFILE%\\Desktop\\*Harness*.lnk" "%PUBLIC%\\Desktop\\*Harness*.lnk" "%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\*Harness*.lnk") do (
    if not defined DSH call :fromLnk "%%~fL"
  )
)

rem 2c. scan common install roots
if not defined DSH (
  for %%R in ("%LOCALAPPDATA%\\Programs" "%ProgramFiles%" "%ProgramFiles(x86)%" "%USERPROFILE%") do (
    if not defined DSH if exist "%%~R" (
      for /f "delims=" %%D in ('dir /b /s "%%~R\\dsh.cmd" 2^>nul') do (
        if not defined DSH echo %%D | find /i "runtime\\cli\\bin" >nul && set "DSH=%%D"
      )
    )
  )
)

if not defined DSH (
  echo [ERROR] DeepSeek Harness not found.
  echo.
  echo Please locate it manually:
  echo   Right-click the "DeepSeek Harness" shortcut
  echo   -^> Open file location
  echo   Send that folder path to the author.
  goto :end
)
echo       Found: %DSH%
for /f "delims=" %%V in ('"%DSH%" --version 2^>nul') do echo       Version: %%V
echo.

rem ============ 3. pick the RIGHT profile ============
rem CRITICAL: the plugin only shows up in the profile DSH actually starts with.
rem Never assume a profile name - it differs per machine.
echo [3/5] Looking for your DSH profile...
set "PROFILEDIR=%USERPROFILE%\\.dsh\\profiles"
set "PROFILE="

if not exist "%PROFILEDIR%" (
  echo       No profiles folder yet - DSH may never have been started.
  echo       Will create the default "web" profile.
  set "PROFILE=web"
)

if not defined PROFILE call :singleProfile "%PROFILEDIR%"

if not defined PROFILE (
  call :newestProfile "%PROFILEDIR%"
  if defined PROFILE echo       Several profiles found; picked the most recently used one.
)

if not defined PROFILE (
  echo [ERROR] Could not determine which profile to use.
  echo         Open the DSH app once, then run this installer again.
  goto :end
)
echo       Target profile: %PROFILE%
echo.

rem ============ 4. install ============
echo [4/5] Installing (about 1 second)...
"%DSH%" plugin --profile %PROFILE% add "%PKG%"
if errorlevel 1 (
  echo.
  echo [ERROR] Installer failed. See the reason in the output above.
  echo.
  echo If it mentions EPERM or "operation not permitted", DeepSeek Harness
  echo is still RUNNING and holding the plugin folder. Close it fully,
  echo then run this installer again.
  echo.
  tasklist /fi "imagename eq DeepSeek Harness.exe" 2>nul | find /i "Harness" >nul && echo NOTE: DeepSeek Harness is running right now.
  goto :end
)
echo.

rem ============ 5. verify ============
echo [5/5] Verifying
set "OKFILE=%PROFILEDIR%\\%PROFILE%\\node_modules\\dsh-liuyao\\package.json"
if exist "%OKFILE%" (
  echo       [OK] Installed into profile: %PROFILE%
) else (
  echo       [WARN] Command finished but plugin files were not found at:
  echo              %OKFILE%
  echo              Please screenshot this window.
)
echo.
echo ===============================================
echo   DONE - one more step is REQUIRED
echo ===============================================
echo.
echo   Fully QUIT DeepSeek Harness (close it completely,
echo   do not just minimize), then start it again and
echo   refresh the window.
echo.
echo   A "6-yao / liuyao" panel will appear on the left.
echo.
echo   IMPORTANT: installed into profile: %PROFILE%
echo   If you see no panel after restarting, send the
echo   author this exact line.
echo.

:end
echo.
pause
exit /b

:fromLnk
for /f "usebackq tokens=*" %%T in (\`powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%~1'); if($s.TargetPath){Split-Path -Parent $s.TargetPath}" 2^>nul\`) do (
  if not defined DSH if exist "%%T\\resources\\runtime\\cli\\bin\\dsh.cmd" set "DSH=%%T\\resources\\runtime\\cli\\bin\\dsh.cmd"
)
exit /b

:singleProfile
set "ONLY="
set "N=0"
for /d %%D in ("%~1\\*") do call :countOne "%%~nxD"
if "%N%"=="1" set "PROFILE=%ONLY%"
exit /b

:countOne
set /a N+=1
set "ONLY=%~1"
exit /b

:newestProfile
set "NEWEST="
for /f "delims=" %%D in ('dir /b /ad /o-d "%~1" 2^>nul') do if not defined NEWEST set "NEWEST=%%D"
set "PROFILE=%NEWEST%"
exit /b
`

// 落到磁盘：ASCII + CRLF（这两条是批处理能跑起来的前提）
const normalized = cmd.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n')
const nonAscii = [...normalized].filter((c) => c.charCodeAt(0) > 127)
if (nonAscii.length > 0) {
  console.error(`✗ 生成结果含 ${nonAscii.length} 个非 ASCII 字符（批处理不接受）：${[...new Set(nonAscii)].join(' ')}`)
  process.exit(1)
}

mkdirSync(outDir, { recursive: true })
const target = join(outDir, '一键安装六爻插件.cmd')
writeFileSync(target, normalized, 'ascii')

console.log(`✓ 已生成 ${target}`)
console.log(`  包名引用：${pkgName}`)
console.log(`  行尾 CRLF ${(normalized.match(/\r\n/g) ?? []).length} 个，裸 LF ${(normalized.match(/(?<!\r)\n/g) ?? []).length} 个，非 ASCII 0 个`)

// 顺手确认包是否在同目录
const pkgPath = join(outDir, pkgName)
console.log(existsSync(pkgPath)
  ? `  ✓ 同目录已有安装包：${pkgName}`
  : `  ⚠ 同目录还没有安装包，请把 ${pkgName} 放到这里`)
