const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const decompress = require("decompress");
const puppeteer = require('puppeteer');
const AdmZip = require('adm-zip');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const currentFolderPath = path.join(__dirname, '../jogos');
  console.log(currentFolderPath)

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}
function createFolder() {
  // Caminho para a pasta fora da pasta 'src'
  const folderPath = path.join(__dirname, '../jogos');
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    console.log('Pasta criada com sucesso!');
  } else {
    console.log('A pasta já existe!');
  }
}

function openAndExecuteFileByPath(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Executando arquivo: ${filePath}`);

    // Obtém o diretório do arquivo
    const dirPath = path.dirname(filePath);
    const tempFilePath = path.join(dirPath, 'info.txt');

    // Cria o arquivo info.txt e escreve "algo" dentro

    
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    ////// ESCREVER O USER E A SENHA AQUI QUANDO LOGAR  ////
    ////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////
    
    fs.writeFile(tempFilePath, 'user', (err) => {
      if (err) {
        console.error('Erro ao criar info.txt:', err);
      } else {
        console.log('info.txt criado com sucesso.');
      }
    });

    // Executa o arquivo
    exec(`"${filePath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro ao executar o arquivo: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
  } else {
    console.error('O arquivo especificado não foi encontrado.');
  }
}

ipcMain.on('open-file-dialog', () => {
  openAndExecuteFile();
});

ipcMain.on('open-file-by-path', (event, filePath) => {
  openAndExecuteFileByPath(filePath);
});

app.whenReady().then(() => {
  createWindow();
  createFolder();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////

// funcção p baixar jogo usando Puppeteer
ipcMain.handle('download-game', async (event, url) => {
  downloadGame(url)
});

// Função de instalar o jogo
async function installGame(url) {
    const browser = await puppeteer.launch({
      headless: true, // Torna a aba invisível
      args: ['--disable-blink-features=AutomationControlled']
  });

  const page = await browser.newPage();

  // Definir diretório de download
  const downloadPath =  path.join(__dirname, '..', 'jogos');
  fs.mkdirSync(downloadPath, { recursive: true });

  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Aguarda o link de download e clica nele
  await page.waitForSelector('a.button.download_btn', { timeout: 5000 });
  await page.click('a.button.download_btn');

  console.log("Download iniciado...");

  // Monitorar a requisição para capturar a URL do download
  let downloadUrl = null;
  page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('download') || url.match(/\.(zip|pdf|exe|mp4|mp3)$/)) {
          console.log(`Arquivo detectado: ${url}`);
          downloadUrl = url;
      }
  });

  // Monitorar a pasta até o arquivo ser salvo
  const waitForDownload = async () => {
    let files;
    do {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Espera 1s
        files = fs.readdirSync(downloadPath);
    } while (files.length === 0 || files.some(f => f.endsWith('.crdownload'))); // Verifica .crdownload, .zip e .exe
    console.log("Download concluído:", files);
    return files;
  };

  const finalFiles = await waitForDownload();

  console.log("Encerrando navegador...");
  await browser.close();

  return finalFiles;
}

async function downloadGame(url) {
  let browser = null;
  try {
    // Verifique se a pasta 'jogos' existe dentro da pasta Downloads
    const downloadsDir = path.join(__dirname, '..', 'jogos');
    
    // Se a pasta não existir, cria a pasta 'jogos'
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    // Baixar o jogo para a pasta 'jogos'
    const finalFiles = await installGame(url, downloadsDir); 
    
    // Após o download, extrair o jogo
    const extractedFilePath = await extractGame(downloadsDir, finalFiles);
    
    console.log(`Arquivos extraídos para: ${extractedFilePath}`);

    // Verificar os arquivos baixados
    const installedFiles = fs.readdirSync(downloadsDir);
    console.log('Todos os arquivos encontrados no diretório de downloads:', installedFiles);
    
    // Limpeza ou qualquer outro passo adicional
    // fs.rmSync(tempDir, { recursive: true, force: true });  // Se for necessário limpar algum diretório temporário
    
    return {
      success: true,
      message: 'Download e extração concluídos com sucesso'
    };
  } catch (error) {
    console.error('Erro no download:', error);
    
    // Tentar fechar o navegador se ainda estiver aberto
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Erro ao fechar o navegador:', e);
      }
    }
    
    return {
      success: false,
      message: `Erro: ${error.message}`
    };
  }
}

// Extrair os jogos
async function extractGame(downloadsDir, finalFiles) {
  // Encontra arquivos exe ou zip
  const zipFiles = finalFiles.filter(f => f.toLowerCase().endsWith('.zip'));
  const exeFiles = finalFiles.filter(f => f.toLowerCase().endsWith('.exe'));

  // Define o arquivo alvo, seja .exe ou .zip
  let targetFile = null;
  let zipPath = null;
  let targetPath = null;

  if (exeFiles.length > 0) {
    // Se encontrar arquivos .exe, cria uma pasta com o nome do arquivo (sem a extensão .exe)
    targetFile = exeFiles[0];
    targetPath = path.join(downloadsDir, targetFile);

    // Nome da pasta será o nome do arquivo .exe sem a extensão
    const folderName = path.basename(targetFile, path.extname(targetFile));
    const folderPath = path.join(downloadsDir, folderName);

    // Cria a pasta caso não exista
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // Define o novo caminho para o arquivo .exe dentro da pasta criada
    const newExePath = path.join(folderPath, targetFile);

    // Move o arquivo .exe para a nova pasta
    fs.renameSync(targetPath, newExePath);

    console.log(`Arquivo .exe movido para a pasta: ${newExePath}`);
    // Retorna o caminho do arquivo .exe para futura instalação ou execução
    return newExePath;

  } else if (zipFiles.length > 0) {
    // Se encontrar arquivos .zip, seleciona diretamente
    targetFile = zipFiles[0];
    targetPath = path.join(downloadsDir, targetFile);
    zipPath = path.join(downloadsDir, targetFile);
    console.log("Caminho normalizado do arquivo ZIP:", zipPath);

    console.log("Arquivo .zip encontrado: " + targetFile);

    // Agora, vamos extrair o conteúdo do arquivo ZIP
    console.log("Iniciando a extração do arquivo ZIP:", zipPath);

    // Decompressão do arquivo ZIP
    await testDecompress(zipPath)
      .then(() => {
        // Verifica se o arquivo ZIP não é do tipo .zip original
        if (!zipPath.endsWith('.zip')) {
          // Remover o arquivo ZIP após a extração se não for um arquivo .zip original
          fs.unlink(zipPath, (err) => {
            if (err) {
              console.error(`Erro ao excluir o arquivo ZIP: ${err}`);
            } else {
              console.log(`Arquivo ZIP ${zipPath} excluído com sucesso.`);
            }
          });
        }
      })
      .catch((error) => {
        console.error("Erro ao extrair o ZIP:", error);
      });

    // Excluir o arquivo ZIP original após a extração
    fs.unlink(zipPath, (err) => {
      if (err) {
        console.error(`Erro ao excluir o arquivo ZIP base: ${err}`);
      } else {
        console.log(`Arquivo ZIP base excluído com sucesso: ${zipPath}`);
      }
    });

    return zipPath;  // Retorna o caminho do arquivo ZIP
  } else {
    console.log("Nenhum arquivo .exe ou .zip encontrado.");
    return null;
  }
}

// extrai o arquivo
async function testDecompress(filePath) {
  try {
      const zipName = path.basename(filePath, path.extname(filePath)); // Nome do ZIP sem extensão
      const baseDir = "jogos"; // Diretório base
      const tempExtractDir = path.join(baseDir, zipName); // Pasta temporária para extração
      
      // Criar a pasta base se não existir
      if (!fs.existsSync(baseDir)) {
          fs.mkdirSync(baseDir, { recursive: true });
      }

      // Criar a pasta temporária se não existir
      if (!fs.existsSync(tempExtractDir)) {
          fs.mkdirSync(tempExtractDir, { recursive: true });
      }

      // Extrair arquivos para a pasta temporária
      let files = await decompress(filePath, tempExtractDir);

      if (files.length === 0) {
          console.log("Nenhum arquivo extraído.");
          files = null; // Libera a variável após o uso
          return;
      }

      if (files.length === 1) {
          const singleFile = files[0].path;
          const singleFileName = path.basename(singleFile, path.extname(singleFile));
          const finalExtractDir = path.join(baseDir, singleFileName);

          // Se a pasta final já existir, não renomeia para evitar erro
          if (!fs.existsSync(finalExtractDir)) {
              fs.renameSync(tempExtractDir, finalExtractDir);
              console.log(`Extraído para: ${finalExtractDir}`);
          } else {
              console.log(`A pasta ${finalExtractDir} já existe. Arquivos extraídos em: ${tempExtractDir}`);
          }
      } else {
          console.log(`Extraído para: ${tempExtractDir}`);
      }

  } catch (error) {
      console.error("Erro ao extrair o arquivo:", error);
  }
}
