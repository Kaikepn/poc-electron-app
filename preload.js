const { contextBridge, ipcRenderer } = require('electron');

// Expor API segura para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Funções adicionais que você quiser expor para o renderer
  openAndExecuteFileByPath: (filePath) => ipcRenderer.send('open-file-by-path', filePath),

  // Função para baixar jogos que não necessita mais do seletor
  downloadGame: (url) => ipcRenderer.invoke('download-game', url),
});
