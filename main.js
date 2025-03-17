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
function openAndExecuteFileByName() {
  dialog.showInputBox({
    title: 'Digite o nome do arquivo para executar',
    placeholder: 'Exemplo: jogo.exe'
  }).then(result => {
    if (!result.canceled && result.value) {
      const fileName = result.value;
      const filePath = path.join(__dirname, 'Jogos', fileName);

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
  }).catch(err => {
    console.log('Erro ao obter o nome do arquivo:', err);
  });
}

app.whenReady().then(() => {
  createWindow();
  createFolder(); // Chama a função para criar a pasta
  openAndExecuteFileByName(); // Chama a função para solicitar e executar o arquivo
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