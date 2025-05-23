- Команды для создания списка файлов
- # Команды для создания списка файлов проекта

## Вариант 1: Bash скрипт (Linux/Mac/WSL)

```bash
# Сделать скрипт исполняемым
chmod +x scripts/list-project-files.sh

# Запустить
./scripts/list-project-files.sh
```

## Вариант 2: Node.js скрипт (Кроссплатформенный)

```bash
# Запустить напрямую
node list-files-simple.js
```

## Вариант 3: Простые команды

### Для Linux/Mac:

```bash
# Создать список с помощью tree (если установлен)
tree -a -I 'node_modules|dist|coverage|.git' > project-files-list.txt

# Или с помощью find
find . -type f -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./.git/*" | sort > project-files-list.txt

# Или более детальный вариант
{
  echo "PROJECT STRUCTURE:"
  echo "=================="
  echo ""
  ls -la
  echo ""
  echo "SRC FILES:"
  echo "=========="
  find src -type f -name "*.ts" | sort
  echo ""
  echo "DOCKER FILES:"
  echo "============="
  find docker -type f | sort
  echo ""
  echo "CONFIG FILES:"
  echo "============="
  ls -la *.json *.yml .* 2>/dev/null | grep -v "^d"
} > project-files-list.txt
```

### Для Windows (PowerShell):

```powershell
# Простой список файлов
Get-ChildItem -Recurse -File | Where-Object { $_.DirectoryName -notmatch "node_modules|dist|\.git" } | Select-Object FullName | Out-File project-files-list.txt

# Более детальный вариант
@"
PROJECT STRUCTURE:
==================

ROOT FILES:
"@ | Out-File project-files-list.txt
Get-ChildItem -File | Select-Object Name | Out-File project-files-list.txt -Append

@"

SRC FILES:
==========
"@ | Out-File project-files-list.txt -Append
Get-ChildItem -Path src -Recurse -Filter "*.ts" | Select-Object FullName | Out-File project-files-list.txt -Append

@"

DOCKER FILES:
=============
"@ | Out-File project-files-list.txt -Append
Get-ChildItem -Path docker -Recurse -File | Select-Object FullName | Out-File project-files-list.txt -Append
```

### Для Windows (CMD):

```cmd
:: Простой список
dir /s /b > project-files-list.txt

:: Или с фильтрацией
dir /s /b | findstr /v "node_modules dist .git" > project-files-list.txt
```

## Вариант 4: Использование Git

Если проект в git репозитории:

```bash
# Показать все файлы под контролем git
git ls-files > project-files-list.txt

# Или с неотслеживаемыми файлами
git ls-files --others --exclude-standard >> project-files-list.txt

# Более детальный вариант
{
  echo "GIT TRACKED FILES:"
  git ls-files
  echo ""
  echo "UNTRACKED FILES:"
  git ls-files --others --exclude-standard
  echo ""
  echo "DIRECTORY STRUCTURE:"
  git ls-tree -r --name-only HEAD | sed 's|[^/]*/|  |g'
} > project-files-list.txt
```

## Вариант 5: Быстрая проверка ключевых файлов

```bash
# Linux/Mac
{
  echo "KEY FILES CHECK:"
  echo "================"
  for file in package.json tsconfig.json Makefile README.md src/server.ts src/app.ts docker/docker-compose.yml; do
    if [ -f "$file" ]; then
      echo "✅ $file"
    else
      echo "❌ $file (MISSING)"
    fi
  done
} > key-files-check.txt

# PowerShell
$files = @(
  "package.json",
  "tsconfig.json", 
  "Makefile",
  "README.md",
  "src/server.ts",
  "src/app.ts",
  "docker/docker-compose.yml"
)

"KEY FILES CHECK:" | Out-File key-files-check.txt
"================" | Out-File key-files-check.txt -Append

foreach ($file in $files) {
  if (Test-Path $file) {
    "✅ $file" | Out-File key-files-check.txt -Append
  } else {
    "❌ $file (MISSING)" | Out-File key-files-check.txt -Append
  }
}
```

## Результат

После выполнения любой из команд у вас будет файл `project-files-list.txt` со списком файлов проекта.

Отправьте этот файл для проверки структуры проекта.