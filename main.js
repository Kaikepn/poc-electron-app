const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const decompress = require("decompress");
const puppeteer = require('puppeteer');
const AdmZip = require('adm-zip');

let mainWindow;

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
  const currentFolderPath = path.join(__dirname, 'Jogos');
  console.log(currentFolderPath)

  const htmlContent = `
 <!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gerenciador de Jogos</title>
    <script>
        const { ipcRenderer } = require('electron');
        
        function createFolder() {
            ipcRenderer.send('create-folder');
        }

        function openAndExecuteFile() {
            ipcRenderer.send('open-file-dialog');
        }

        function openAndExecuteFileByPath() {
            const filePath = document.getElementById('filePathInput').value;
            if (filePath) {
                ipcRenderer.send('open-file-by-path', filePath);
            } else {
                alert('Por favor, digite o caminho do arquivo.');
            }
        }

        function testDecompress() {
            ipcRenderer.send('test-decompress');
        }

        function showAlert(message) {
            alert(message);
        }

        ipcRenderer.on('execution-result', (event, message) => {
            document.getElementById('output').innerText = message;
        });

        ipcRenderer.on('folder-created', (event, message) => {
            showAlert(message);
        });
    </script>
</head>
<body>
    <h1>Gerenciador de Jogos</h1>
    <button onclick="createFolder()">Criar Pasta Jogos</button>
    <button onclick="openAndExecuteFile()">Abrir e Executar Arquivo</button>
    <div>
        <label for="filePathInput">Digite o caminho completo do arquivo para executar:</label>
        <input type="text" id="filePathInput" placeholder="${currentFolderPath}" />
      </div>
      <div>
        <button onclick="openAndExecuteFileByPath()">Executar Arquivo</button>
      </div>
    <button onclick="testDecompress()">Testar Extração de Arquivo</button>
    <p id="output"></p>
    <div class="container">
    <h1>Download de Jogos Automático</h1>
    
    <div class="form-group">
      <label for="gameUrl">URL do Jogo:</label>
      <input type="text" id="gameUrl" placeholder="https://exemplo.com/pagina-do-jogo">
      <small>Cole a URL da página onde está o jogo que você deseja baixar</small>
    </div>
    
    <button id="downloadBtn">Baixar Jogo Automaticamente</button>
    
    <div id="status">Aguardando URL...</div>
    
    <div class="progress">
      <div class="progress-bar" id="progressBar"></div>
    </div>
    
    <div class="result" id="resultBox"></div>
  </div>

  <script src="renderer.js"></script>
</body>
</html>`;

  const htmlPath = path.join(__dirname, 'index.html');
  fs.writeFileSync(htmlPath, htmlContent);
  
  mainWindow.loadFile(htmlPath);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createFolder() {
  const folderPath = path.join(__dirname, 'Jogos');
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    console.log('Pasta criada com sucesso!');
  } else {
    console.log('A pasta já existe!');
  }
}

function openAndExecuteFile() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Selecione o arquivo para executar'
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      console.log('Arquivo selecionado: ' + filePath);

      const quotedPath = `"${filePath}"`;
      
      exec(quotedPath, (error, stdout, stderr) => {
        let message;
        if (error) {
          message = 'Erro ao executar o arquivo: ' + error.message;
        } else if (stderr) {
          message = 'stderr: ' + stderr;
        } else {
          message = 'Arquivo executado com sucesso: ' + stdout;
        }
        console.log(message);
        if (mainWindow) {
          mainWindow.webContents.send('execution-result', message);
        }
      });
    }
  }).catch(err => {
    console.error('Erro ao abrir o arquivo:', err);
  });
}

function testDecompress() {
    decompress("TerrorDaCaatinga.exe.zip", "Jogos")
    .then((files) => {
      console.log(files);
    })
    .catch((error) => {
      console.log(error);
    });
}

function openAndExecuteFileByPath(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Executando arquivo: ${filePath}`);
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
  testDecompress();
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
  let browser = null;
  console.log("bombardillo")
  try {
    //caminho p pasta temporaria, gera o nome unico p diretorio
    const tempDir = path.join(app.getPath('temp'), 'game-download-' + Date.now());
    const downloadsDir = path.join(__dirname, 'Jogos') //caminho da pasta 
    
    //ve seja existe 
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // puppeteer - sempre em modo headless (sem interface gráfica)
    browser = await puppeteer.launch({
      headless: 'new', // Use o novo modo headless sempre
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // cria nova aba no nav
    const page = await browser.newPage();
    
    // Configurar onde os downloads serão salvos
    const client = await page.target().createCDPSession(); //sessão do prot devTools p ter controle sob o nav
    await client.send('Page.setDownloadBehavior', { //config o comportamento de download da pag
      behavior: 'allow', //download automatico sem interaão do usuário
      downloadPath: tempDir //pasta q os arq serão baixados
    });
    
    // Navegar p URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    console.log(`Navegou para: ${url}`);
    
    // Seletores aprimorados para detecção automática de botões de download
    const seletor = 
  'a[href*=".exe"], ' + 
  'a[download], ' +
  '.download-button, ' + 
  '#download-button, ' +
  'a.btn-download, ' +
  'button.download, ' +
  'a[href*=".zip"], ' +
  'a[href*=".msi"], ' +
  'a[href*="download"]';
    
    console.log(`Procurando pelo botão de download usando seletor: ${seletor}`);
    
    // Tentar encontrar o elemento 
    try {
      await page.waitForSelector(seletor, { visible: true, timeout: 5000 });
      console.log('Botão de download encontrado pelo seletor!');
    } catch (error) {
      console.log('Seletor não encontrado, tentando avaliação de página...');
      
      // Se o seletor não for encontrado, tente encontrar links que pareçam ser de download
      const downloadLinks = await page.evaluate(() => { 
        const links = Array.from(document.querySelectorAll('a'));//acessa o dom da pagina p achar o botão
        return links
        //verifica se o link parece um link de download
          .filter(link => {
            const href = (link.href || '').toLowerCase();
            const text = (link.innerText || '').toLowerCase();
            return (href.includes('.exe') || 
                   href.includes('Download') || 
                   href.includes('.zip') || 
                  //  href.includes('.msi') ||
                  //  href.includes('.rar') ||
                  //  href.includes('get') ||
                   text.includes('download') ||
                  //  text.includes('get') ||
                   text.includes('install')) &&
                   link.offsetWidth > 0 && 
                   link.offsetHeight > 0;
          })
          //cria um array com + detalhes sobre os links
          .map((link, index) => ({
            index,
            href: link.href,
            text: link.innerText,
            position: link.getBoundingClientRect()
          }));
      });
      
      console.log('Possíveis links de download encontrados:', downloadLinks);
      
      if (downloadLinks.length > 0) {
        // Encontra o link que mais provavelmente é de download
        // Priorizando links com palavras-chave específicas
        let bestLinkIndex = 0;
        let bestScore = 0;
        
        downloadLinks.forEach((link, index) => {
          let score = 0;
          const href = link.href.toLowerCase();
          const text = link.text.toLowerCase();
          
          if (href.includes('.exe')) score += 5;
          if (href.includes('.zip')) score += 4;
          // if (href.includes('.msi')) score += 4;
          if (text.includes('download now')) score += 3;
          if (text.includes('Download')) score += 2;
          if(text.includes('Download Now')) score += 2
          // if (href.includes('download')) score += 2;
          if (link.position.y < 500) score += 1; // Links mais no topo têm prioridade
          
          if (score > bestScore) {
            bestScore = score;
            bestLinkIndex = index;
          }
        });
        
        // clica no melhor link encontrado
        const bestLink = downloadLinks[bestLinkIndex];
        console.log(`Selecionado melhor link: ${bestLink.text} (${bestLink.href})`);
        
        try {
          await page.click(`a[href="${bestLink.href}"]`);
          console.log('Clicou no link de download!');
        } catch (clickError) {
          console.log('Erro ao clicar no link, tentando via JavaScript:', clickError);
          // Se não conseguir clicar diretamente, tenta via JavaScript
          await page.evaluate((href) => {
            const links = Array.from(document.querySelectorAll('a'));
            const targetLink = links.find(link => link.href === href);
            if (targetLink) targetLink.click();
          }, bestLink.href);
        }
      } else {
        throw new Error('Não foi possível encontrar o botão de download');
      }
    }
    
    // clica no botão se o botão foi achado pelo seletor
    if (await page.$(seletor)) {
      await Promise.all([
        page.click(seletor),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      console.log('Clicou no botão de download via seletor');
    }
    
    console.log('Aguardando download...');
    
    // Esperar alguns segundos para garantir que o download foi iniciado
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Verificar quais arquivos foram baixados
    const files = fs.readdirSync(tempDir);
    console.log('Arquivos encontrados:', files);
    
    if (files.length === 0) {
      throw new Error('Nenhum arquivo foi baixado');
    }
    
    // Pega o arquivo baixado 
    const downloadedFile = files[0];
    const filePath = path.join(tempDir, downloadedFile);
    
    // Espera até que o arquivo esteja completamente baixado 
    let fileIsReady = !downloadedFile.endsWith('.crdownload') && !downloadedFile.endsWith('.part');
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos (60 x 5s)
    
    while (!fileIsReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Esperar 5 segundos
      const currentFiles = fs.readdirSync(tempDir);
      
      // Verificar se algum arquivo tem extensão .crdownload ou .part
      const pendingFiles = currentFiles.filter(f => f.endsWith('.crdownload') || f.endsWith('.part'));
      fileIsReady = pendingFiles.length === 0 && currentFiles.length > 0;
      //tentativas (60 de 5s)
      attempts++;
      console.log(`Verificando download... Tentativa ${attempts}/${maxAttempts}`);
    }
    
    if (!fileIsReady) {
      throw new Error('Tempo esgotado esperando o download completar');
    }
    
    // cria um zip qnd baixar
    const finalFiles = fs.readdirSync(tempDir);
    if (finalFiles.length === 0) {
      throw new Error('Nenhum arquivo foi baixado');
    }
    
    // Encontra arquivos exe
    const exeFiles = finalFiles.filter(f => f.endsWith('.exe'));
    const targetFile = exeFiles.length > 0 ? exeFiles[0] : finalFiles[0];
    const targetPath = path.join(tempDir, targetFile);
    
    // Caminho para o arquivo ZIP final
    const zipPath = path.join(downloadsDir, `${targetFile}.zip`);
    
    // Criar ZIP com o arquivo baixado
    const zip = new AdmZip();
    zip.addLocalFile(targetPath, '', targetFile);
    zip.writeZip(zipPath);
    
    // Fechar o navegador
    await browser.close();
    browser = null;
    
    // Limpar diretório temporário
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    return {
      success: true,
      message: 'Download concluído com sucesso',
      path: zipPath,
      fileName: targetFile
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
});