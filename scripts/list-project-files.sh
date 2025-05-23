#!/bin/bash

# Скрипт для создания полного списка файлов проекта

echo "📋 Создание списка файлов проекта proxy-server..."
echo "=========================================="
echo ""

# Проверяем, что мы в корне проекта
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Ошибка: похоже, вы не в корне проекта proxy-server"
    echo "   Запустите скрипт из корневой директории проекта"
    exit 1
fi

# Имя файла для вывода
OUTPUT_FILE="project-files-list.txt"

# Создаем заголовок файла
cat > "$OUTPUT_FILE" << 'EOF'
PROXY-SERVER PROJECT FILE STRUCTURE
===================================
Generated on: $(date)
Directory: $(pwd)

FILE TREE:
----------

EOF

# Проверяем наличие команды tree
if command -v tree &> /dev/null; then
    echo "Используем команду tree..."

    # Создаем список с помощью tree
    tree -a -I 'node_modules|dist|coverage|.git|logs|*.log|.env|data|backups' --dirsfirst >> "$OUTPUT_FILE"

    echo "" >> "$OUTPUT_FILE"
    echo "DETAILED FILE LIST:" >> "$OUTPUT_FILE"
    echo "==================" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
else
    echo "⚠️  Команда tree не найдена, используем find..."
fi

# Добавляем детальный список файлов
echo "Создание детального списка файлов..."

# Функция для форматированного вывода
print_files() {
    local dir=$1
    local indent=$2

    # Сначала выводим директории
    find "$dir" -maxdepth 1 -type d ! -path "$dir" 2>/dev/null | sort | while read -r subdir; do
        local basename=$(basename "$subdir")
        # Пропускаем скрытые и системные директории
        if [[ ! "$basename" =~ ^(\.git|node_modules|dist|coverage|logs|data|backups)$ ]]; then
            echo "${indent}📁 $basename/" >> "$OUTPUT_FILE"
            print_files "$subdir" "  $indent"
        fi
    done

    # Затем выводим файлы
    find "$dir" -maxdepth 1 -type f 2>/dev/null | sort | while read -r file; do
        local basename=$(basename "$file")
        # Пропускаем временные и log файлы
        if [[ ! "$basename" =~ \.(log|swp|swo|tmp)$ ]] && [[ ! "$basename" == ".env" ]]; then
            echo "${indent}📄 $basename" >> "$OUTPUT_FILE"
        fi
    done
}

# Если tree не установлен, создаем свое дерево
if ! command -v tree &> /dev/null; then
    echo "📁 proxy-server/" >> "$OUTPUT_FILE"
    print_files "." "  "
fi

# Добавляем список всех TypeScript файлов
echo "" >> "$OUTPUT_FILE"
echo "TYPESCRIPT FILES:" >> "$OUTPUT_FILE"
echo "=================" >> "$OUTPUT_FILE"
find . -name "*.ts" -not -path "./node_modules/*" -not -path "./dist/*" -not -path "./coverage/*" | sort >> "$OUTPUT_FILE"

# Добавляем список конфигурационных файлов
echo "" >> "$OUTPUT_FILE"
echo "CONFIGURATION FILES:" >> "$OUTPUT_FILE"
echo "====================" >> "$OUTPUT_FILE"
ls -la *.json *.yml *.yaml .* 2>/dev/null | grep -v "^d" | awk '{print $9}' | grep -v "^$" | sort >> "$OUTPUT_FILE"

# Добавляем список Docker файлов
echo "" >> "$OUTPUT_FILE"
echo "DOCKER FILES:" >> "$OUTPUT_FILE"
echo "=============" >> "$OUTPUT_FILE"
find docker -type f 2>/dev/null | sort >> "$OUTPUT_FILE"

# Добавляем статистику
echo "" >> "$OUTPUT_FILE"
echo "PROJECT STATISTICS:" >> "$OUTPUT_FILE"
echo "===================" >> "$OUTPUT_FILE"

# Подсчет файлов по типам
TS_COUNT=$(find ./src -name "*.ts" 2>/dev/null | wc -l)
JS_COUNT=$(find . -name "*.js" -not -path "./node_modules/*" -not -path "./dist/*" 2>/dev/null | wc -l)
JSON_COUNT=$(find . -name "*.json" -not -path "./node_modules/*" 2>/dev/null | wc -l)
YML_COUNT=$(find . -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l)
MD_COUNT=$(find . -name "*.md" 2>/dev/null | wc -l)

echo "TypeScript files: $TS_COUNT" >> "$OUTPUT_FILE"
echo "JavaScript files: $JS_COUNT" >> "$OUTPUT_FILE"
echo "JSON files: $JSON_COUNT" >> "$OUTPUT_FILE"
echo "YAML files: $YML_COUNT" >> "$OUTPUT_FILE"
echo "Markdown files: $MD_COUNT" >> "$OUTPUT_FILE"

# Проверка наличия ключевых файлов
echo "" >> "$OUTPUT_FILE"
echo "KEY FILES CHECK:" >> "$OUTPUT_FILE"
echo "================" >> "$OUTPUT_FILE"

check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1" >> "$OUTPUT_FILE"
    else
        echo "❌ $1 (MISSING)" >> "$OUTPUT_FILE"
    fi
}

# Проверяем основные файлы
check_file "package.json"
check_file "tsconfig.json"
check_file "Makefile"
check_file ".gitignore"
check_file ".dockerignore"
check_file ".env.example"
check_file "README.md"

# Проверяем src файлы
check_file "src/server.ts"
check_file "src/app.ts"
check_file "src/config/index.ts"
check_file "src/config/redis.ts"
check_file "src/config/logger.ts"

# Проверяем Docker файлы
check_file "docker/docker-compose.yml"
check_file "docker/docker-compose.dev.yml"
check_file "docker/docker-compose.prod.yml"
check_file "docker/Dockerfile"
check_file "docker/nginx/nginx.conf"

# Проверяем наличие важных директорий
echo "" >> "$OUTPUT_FILE"
echo "DIRECTORY CHECK:" >> "$OUTPUT_FILE"
echo "================" >> "$OUTPUT_FILE"

check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/" >> "$OUTPUT_FILE"
    else
        echo "❌ $1/ (MISSING)" >> "$OUTPUT_FILE"
    fi
}

check_dir "src"
check_dir "src/config"
check_dir "src/controllers"
check_dir "src/middlewares"
check_dir "src/services"
check_dir "src/services/queue"
check_dir "src/routes"
check_dir "docker"
check_dir "docker/monitoring"
check_dir "docker/monitoring/grafana"
check_dir "tests"
check_dir "scripts"

# Конец файла
echo "" >> "$OUTPUT_FILE"
echo "=========================================" >> "$OUTPUT_FILE"
echo "Generated by: $0" >> "$OUTPUT_FILE"
echo "Date: $(date)" >> "$OUTPUT_FILE"

# Выводим результат
echo ""
echo "✅ Список файлов создан: $OUTPUT_FILE"
echo ""
echo "📊 Краткая статистика:"
echo "   - TypeScript файлов: $TS_COUNT"
echo "   - Конфигурационных файлов: $JSON_COUNT JSON, $YML_COUNT YAML"
echo "   - Документации: $MD_COUNT Markdown файлов"
echo ""
echo "📄 Первые 50 строк файла:"
echo "------------------------"
head -n 50 "$OUTPUT_FILE"
echo "..."
echo ""
echo "💡 Для просмотра полного файла используйте:"
echo "   cat $OUTPUT_FILE"
echo "   less $OUTPUT_FILE"
echo ""
echo "📤 Отправьте файл $OUTPUT_FILE для проверки"