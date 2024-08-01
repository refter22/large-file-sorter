const fs = require('fs');
const path = require('path');


function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    output: 'output.txt',
    fileSize: 100 * 1024 * 1024, // 100 МБ
    chunkSize: 10 * 1024 * 1024 // 10 МБ
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^-+/, '');
    const value = args[i + 1];

    switch (key) {
      case 'o':
      case 'output':
        params.output = value;
        break;
      case 's':
      case 'fileSize':
        params.fileSize = parseInt(value, 10) * 1024 * 1024;
        break;
      case 'c':
      case 'chunkSize':
        params.chunkSize = parseInt(value, 10) * 1024 * 1024;
        break;
      case 'h':
      case 'help':
        printHelp();
        process.exit(0);
    }
  }

  return params;
}

function printHelp() {
  console.log(`
Использование: node largeFileGenerator.js [опции]

Опции:
  -o, --output     Путь к выходному файлу (по умолчанию: output.txt)
  -s, --fileSize   Размер файла в мегабайтах (по умолчанию: 100)
  -c, --chunkSize  Размер чанка в мегабайтах (по умолчанию: 10)
  -h, --help       Показать эту справку
  `);
}

const { output, fileSize, chunkSize } = parseArgs();

generateLargeFile(output, fileSize, chunkSize).catch(error => {
  console.error('Произошла ошибка при генерации файла:', error);
});

async function generateLargeFile(output, fileSize, chunkSize) {
  const writeStream = fs.createWriteStream(output);
  const totalBytes = fileSize;
  let bytesWritten = 0;

  console.log(`Генерация файла размером ${fileSize} МБ...`);

  while (bytesWritten < totalBytes) {
    chunkSize = Math.min(chunkSize, totalBytes - bytesWritten);
    const chunk = Buffer.alloc(chunkSize);
    let offset = 0;

    while (offset < chunkSize) {
      const lineLength = Math.floor(Math.random() * 95) + 5;
      const line = generateRandomString(lineLength);
      const lineBuffer = Buffer.from(line + '\n');
      offset += lineBuffer.copy(chunk, offset);
    }

    const canWrite = writeStream.write(chunk);
    if (!canWrite) {
      await new Promise(resolve => writeStream.once('drain', resolve));
    }

    bytesWritten += chunkSize;
    const progress = (bytesWritten / totalBytes * 100).toFixed(2);
    console.log(`Прогресс: ${progress}%`);
  }


  writeStream.end(error => {
    if (error) {
      console.error('Ошибка при закрытии потока:', error);
    } else {
      console.log('Генерация файла завершена.');
    }
  });
}

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]|:;<>,.?/~`АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

