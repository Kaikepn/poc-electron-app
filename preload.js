const { contextBridge, ipcRenderer } = require('electron');

// Expor API segura para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Função para baixar jogos que não necessita mais do seletor
  downloadGame: (url) => ipcRenderer.invoke('download-game', url),
  // Funções adicionais que você quiser expor para o renderer
  createFolder: () => ipcRenderer.send('create-folder'),
  openAndExecuteFileByPath: (filePath) => ipcRenderer.send('open-file-by-path', filePath),
  onExecutionResult: (callback) => ipcRenderer.on('execution-result', callback),
  onFolderCreated: (callback) => ipcRenderer.on('folder-created', callback),
});
