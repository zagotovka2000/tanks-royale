// copy-all-files-advanced.js
// Запуск: node copy-all-files-advanced.js [папка]

const fs = require('fs');
const path = require('path');

// Получаем папку из аргументов командной строки
const rootDir = process.argv[2] || '.';
const outputFile = `all-files-${Date.now()}.txt`;

// Настройки
const config = {
    excludeFolders: ['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage', '.vscode', '.idea'],
    excludeFiles: ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', '.DS_Store', 'Thumbs.db'],
    includeExtensions: ['.js', '.html', '.css', '.json', '.md', '.txt', '.vue', '.jsx', '.tsx', '.ts', '.xml', '.yaml', '.yml', '.sql', '.sh', '.bat'],
    maxFileSize: 1024 * 1024 * 5, // 5MB
    showProgress: true,
    addLineNumbers: false,
    separatorStyle: 'double' // 'double' или 'simple'
};

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (config.excludeFolders.includes(file)) return;
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (config.includeExtensions.includes(ext) && !config.excludeFiles.includes(file)) {
                arrayOfFiles.push(fullPath);
            }
        }
    });
    
    return arrayOfFiles;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function copyAllFilesToBuffer() {
    console.log(`📂 Сканирование папки: ${path.resolve(rootDir)}`);
    console.log('⏳ Подождите...');
    
    const files = getAllFiles(rootDir);
    console.log(`📄 Найдено ${files.length} файлов`);
    
    let content = '';
    let totalSize = 0;
    let fileCount = 0;
    let skippedFiles = 0;
    
    const separator = config.separatorStyle === 'double' 
        ? '='.repeat(80) 
        : '-'.repeat(60);
    
    files.forEach((file, index) => {
        try {
            const stats = fs.statSync(file);
            const relativePath = path.relative(rootDir, file);
            
            // Пропускаем слишком большие файлы
            if (stats.size > config.maxFileSize) {
                skippedFiles++;
                if (config.showProgress) {
                    console.warn(`⚠️ Пропущен (слишком большой): ${relativePath} (${formatFileSize(stats.size)})`);
                }
                return;
            }
            
            const fileContent = fs.readFileSync(file, 'utf8');
            totalSize += fileContent.length;
            fileCount++;
            
            if (config.showProgress && index % 10 === 0) {
                process.stdout.write(`\r📄 Обработано: ${index + 1}/${files.length}`);
            }
            
            // Добавляем содержимое
            content += `\n${separator}\n`;
            content += `📁 Файл: ${relativePath}\n`;
            content += `📏 Размер: ${formatFileSize(stats.size)}\n`;
            content += `📅 Изменен: ${stats.mtime.toLocaleString()}\n`;
            content += `${separator}\n\n`;
            
            if (config.addLineNumbers) {
                // Добавляем номера строк
                const lines = fileContent.split('\n');
                lines.forEach((line, i) => {
                    content += `${String(i + 1).padStart(4, ' ')} | ${line}\n`;
                });
            } else {
                content += fileContent;
            }
            content += '\n';
            
        } catch (error) {
            console.warn(`⚠️ Не удалось прочитать ${file}:`, error.message);
        }
    });
    
    if (config.showProgress) {
        process.stdout.write('\r✅ Обработка завершена!      \n');
    }
    
    // Сохраняем в файл
    fs.writeFileSync(outputFile, content, 'utf8');
    
    console.log('\n📊 Статистика:');
    console.log(`   📄 Файлов обработано: ${fileCount}`);
    console.log(`   ⚠️ Пропущено: ${skippedFiles}`);
    console.log(`   💾 Размер: ${formatFileSize(totalSize)}`);
    console.log(`   📁 Сохранено: ${outputFile}`);
    
    // Копируем в буфер обмена
    copyToClipboard(outputFile);
}

function copyToClipboard(file) {
    try {
        const { execSync } = require('child_process');
        
        if (process.platform === 'darwin') {
            execSync(`cat "${file}" | pbcopy`);
            console.log('📋 Содержимое скопировано в буфер обмена (macOS) ✅');
        } else if (process.platform === 'linux') {
            // Проверяем наличие xclip
            try {
                execSync('which xclip', { stdio: 'ignore' });
                execSync(`cat "${file}" | xclip -selection clipboard`);
                console.log('📋 Содержимое скопировано в буфер обмена (Linux) ✅');
            } catch {
                console.log('ℹ️ Установите xclip: sudo apt-get install xclip');
                console.log(`   Или скопируйте вручную: cat "${file}"`);
            }
        } else if (process.platform === 'win32') {
            execSync(`type "${file}" | clip`);
            console.log('📋 Содержимое скопировано в буфер обмена (Windows) ✅');
        } else {
            console.log(`ℹ️ Скопируйте вручную содержимое файла: ${file}`);
        }
    } catch (error) {
        console.log(`ℹ️ Не удалось скопировать в буфер обмена. Файл сохранен: ${file}`);
    }
}

// Запуск
console.log('🚀 Копирование всех файлов в буфер обмена\n');
copyAllFilesToBuffer();
console.log('\n✅ Готово!');
