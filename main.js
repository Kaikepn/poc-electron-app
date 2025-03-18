const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Teste arquivo</title>
      </head>
      <body>
        <h1>Teste arquivo</h1>
        <button id="selectFile">Selecione e rode o arquivo</button>
        <div id="output"></div>
        <script>
          const { ipcRenderer } = require('electron');
          document.getElementById('selectFile').addEventListener('click', function() {
            ipcRenderer.send('open-file-dialog');
          });
          
          ipcRenderer.on('execution-result', function(event, result) {
            const outputDiv = document.getElementById('output');
            outputDiv.innerHTML += '<p>' + result + '</p>';
          });
        </script>
      </body>
    </html>
  `;
  
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

ipcMain.on('open-file-dialog', () => {
  openAndExecuteFile();
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
