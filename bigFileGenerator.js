const fs = require('fs');
const crypto = require('crypto');

const OUTPUT_FILE = 'input.txt';
const FILE_SIZE_MB = 100; // Размер файла в мегабайтах
const CHUNK_SIZE = 1 * 1024 * 1024; // 1 МБ

function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]|:;<>,.?/~`АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

async function generateLargeFile() {
  const writeStream = fs.createWriteStream(OUTPUT_FILE);
  const totalBytes = FILE_SIZE_MB * 1024 * 1024;
  let bytesWritten = 0;

  console.log(`Генерация файла размером ${FILE_SIZE_MB} МБ...`);

  while (bytesWritten < totalBytes) {
    const chunkSize = Math.min(CHUNK_SIZE, totalBytes - bytesWritten);
    const chunk = Buffer.alloc(chunkSize);
    let offset = 0;

    while (offset < chunkSize) {
      const lineLength = Math.floor(Math.random() * 95) + 5; // Случайная длина строки от 5 до 100 символов
      const line = generateRandomString(lineLength);
      const lineBuffer = Buffer.from(line + '\n');
      offset += lineBuffer.copy(chunk, offset);
    }

    await new Promise((resolve, reject) => {
      writeStream.write(chunk, error => {
        if (error) reject(error);
        else resolve();
      });
    });

    bytesWritten += chunkSize;
    const progress = (bytesWritten / totalBytes * 100).toFixed(2);
    console.log(`Прогресс: ${progress}%`);
  }

  await new Promise((resolve, reject) => {
    writeStream.end(error => {
      if (error) reject(error);
      else resolve();
    });
  });

  console.log('Генерация файла завершена.');
}

generateLargeFile().catch(error => {
  console.error('Произошла ошибка при генерации файла:', error);
});