const fs = require('fs');
const crypto = require('crypto');

const OUTPUT_FILE = 'input.txt';
const FILE_SIZE_GB = 1; // Размер файла в гигабайтах
const CHUNK_SIZE = 100 * 1024 * 1024; // 100 МБ

function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

async function generateLargeFile() {
  const writeStream = fs.createWriteStream(OUTPUT_FILE);
  const totalBytes = FILE_SIZE_GB * 1024 * 1024 * 1024;
  let bytesWritten = 0;

  console.log(`Генерация файла размером ${FILE_SIZE_GB} ГБ...`);

  while (bytesWritten < totalBytes) {
    const chunk = [];
    let chunkSize = 0;

    while (chunkSize < CHUNK_SIZE && bytesWritten < totalBytes) {
      const lineLength = Math.floor(Math.random() * 95) + 5; // Случайная длина строки от 5 до 100 символов
      const line = generateRandomString(lineLength);
      chunk.push(line);
      chunkSize += line.length + 1; // +1 для символа новой строки
      bytesWritten += line.length + 1;
    }

    await new Promise((resolve, reject) => {
      writeStream.write(chunk.join('\n') + '\n', error => {
        if (error) reject(error);
        else resolve();
      });
    });

    const progress = (bytesWritten / totalBytes * 100).toFixed(2);
    console.log(`Прогресс: ${progress}%`);
  }

  writeStream.end();
  console.log('Генерация файла завершена.');
}

generateLargeFile().catch(console.error);