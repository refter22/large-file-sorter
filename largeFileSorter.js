const fs = require('fs')
const path = require('path');
const readline = require('readline')

const { MinHeap } = require('./MinHeap');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    input: 'input.txt',
    output: 'output.txt',
    chunkSize: 10 * 1024 * 1024 // 10 мегабайт
  };

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^-+/, '');
    const value = args[i + 1];

    switch (key) {
      case 'i':
      case 'input':
        params.input = value;
        break;
      case 'o':
      case 'output':
        params.output = value;
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
Использование: node index.js [опции]

Опции:
  -i, --input     Путь к входному файлу (по умолчанию: input.txt)
  -o, --output    Путь к выходному файлу (по умолчанию: output.txt)
  -c, --chunkSize Размер чанка в мегабайтах (по умолчанию: 10)
  -h, --help      Показать эту справку
  `);
}

const { input, output, chunkSize } = parseArgs();

sortLargeFile(input, output, chunkSize)

async function sortLargeFile(inputFile, outputFile, chunkSize) {
  console.log(`Сортировка файла ${inputFile}...`);
  const tempDir = path.join(__dirname, `temp_chunks_${Date.now()}`);
  try {
    if (!fs.existsSync(inputFile)) {
      throw new Error(`Входной файл не существует: ${inputFile}`);
    }

    fs.mkdirSync(tempDir, { recursive: true });

    const chunkFiles = await splitAndSortChunks(inputFile, chunkSize, tempDir);
    await mergeChunks(chunkFiles, outputFile);
    console.log(`Сортировка завершена успешно, файл ${outputFile} создан`);
  } catch (error) {
    console.error('Ошибка при сортировке большого файла:', error);
  } finally {
    console.log('Очистка временных файлов...');
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log('Временные файлы очищены');
  }
}

async function splitAndSortChunks(inputFile, chunkSize, tempDir) {
  const chunkFiles = [];
  let chunkNumber = 0;
  let currentSize = 0;

  const fileStream = fs.createReadStream(inputFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let linesRead = 0;
  let writeStream = fs.createWriteStream(path.join(tempDir, `chunk_${chunkNumber}.txt`));

  for await (const line of rl) {
    await new Promise(resolve => writeStream.write(line + '\n', resolve));
    currentSize += Buffer.byteLength(line, 'utf8') + 1;
    linesRead++;

    if (currentSize >= chunkSize) {
      await new Promise(resolve => writeStream.end(resolve));
      await sortChunk(path.join(tempDir, `chunk_${chunkNumber}.txt`));
      chunkFiles.push(path.join(tempDir, `chunk_${chunkNumber}.txt`));
      chunkNumber++;
      currentSize = 0;
      writeStream = fs.createWriteStream(path.join(tempDir, `chunk_${chunkNumber}.txt`));
    }
  }

  if (currentSize > 0) {
    await new Promise(resolve => writeStream.end(resolve));
    await sortChunk(path.join(tempDir, `chunk_${chunkNumber}.txt`));
    chunkFiles.push(path.join(tempDir, `chunk_${chunkNumber}.txt`));
  }

  console.log(`Прочитано строк: ${linesRead}`);
  console.log(`Создано фрагментов: ${chunkFiles.length}`);

  return chunkFiles;
}

async function sortChunk(filePath) {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    lines.sort((a, b) => a.localeCompare(b));
    await fs.promises.writeFile(filePath, lines.join('\n'));
    const fileName = path.basename(filePath);

    console.log(`Отсортирован фрагмент: ${fileName}, строк: ${lines.length}`);
  } catch (error) {
    const fileName = path.basename(filePath);
    console.error(`Ошибка при сортировке фрагмента ${fileName}:`, error);
    throw error;
  }
}

async function mergeChunks(chunkFiles, outputFile) {
  console.log('Начало объединения фрагментов...');
  const outputStream = fs.createWriteStream(outputFile, { highWaterMark: 1024 * 1024 });
  const readers = [];

  try {
    for (const chunkFile of chunkFiles) {
      if (!fs.existsSync(chunkFile)) {
        throw new Error(`Файл фрагмента не существует: ${chunkFile}`);
      }
      readers.push(openChunkReader(chunkFile));
    }

    const heap = new MinHeap(chunkFiles.length, (a, b) => a.value.localeCompare(b.value));

    for (let i = 0; i < readers.length; i++) {
      const { value: line, done } = await readers[i].next();
      if (!done) {
        heap.insert({ value: line, readerIndex: i });
      }
    }

    let outputBuffer = '';
    const flushBuffer = () => {
      if (outputBuffer.length > 0) {
        outputStream.write(outputBuffer);
        outputBuffer = '';
      }
    };

    let linesWritten = 0;
    let lastLine = '';

    while (heap.size > 0) {
      const { value: minLine, readerIndex } = heap.extractMin();

      if (minLine !== lastLine) {
        outputBuffer += minLine;
        if (heap.size > 0) {
          outputBuffer += '\n';
        }
        linesWritten++;
        lastLine = minLine;
      }

      if (outputBuffer.length >= 1024 * 1024) {
        flushBuffer();
      }

      const { value: nextLine, done } = await readers[readerIndex].next();
      if (!done) {
        heap.insert({ value: nextLine, readerIndex });
      }
    }

    flushBuffer();
    await new Promise(resolve => outputStream.end(resolve));
    console.log(`Записано строк: ${linesWritten}`);
  } catch (error) {
    console.error('Ошибка при объединении фрагментов:', error);
    throw error;
  } finally {
    readers.forEach(reader => reader.close());
  }
}

function openChunkReader(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  const iterator = rl[Symbol.asyncIterator]();
  return {
    next: () => iterator.next(),
    close: () => {
      rl.close();
      fileStream.close();
    }
  };
}

module.exports = { sortLargeFile };