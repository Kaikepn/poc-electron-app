const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process'); // Importa o módulo para executar comandos do sistema

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL('http://localhost:3000'); // Carregue sua aplicação HTML ou outro conteúdo aqui

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Função para criar uma pasta
function createFolder() {
  const folderPath = path.join(__dirname, 'Jogos');
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
    console.log('Pasta criada com sucesso!');
  } else {
    console.log('A pasta já existe!');
  }
}

// Função para pedir ao usuário o nome do arquivo e executá-lo
function openAndExecuteFile() {
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Selecione o arquivo para executar',
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      console.log(`Arquivo selecionado: ${filePath}`);

      // Executa o arquivo selecionado
      exec(filePath, (error, stdout, stderr) => {
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
    }
  }).catch(err => {
    console.log('Erro ao abrir o arquivo:', err);
  });
}

app.whenReady().then(() => {
  createWindow();
  createFolder(); // Chama a função para criar a pasta
  openAndExecuteFile(); // Chama a função para abrir e executar o arquivo
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
