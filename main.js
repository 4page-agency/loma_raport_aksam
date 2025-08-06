const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron'); // Dodano Menu
const fs = require('fs');
const path = require('path');

// Wyłączenie menu aplikacji
Menu.setApplicationMenu(null);

let mainWindow;

app.on('ready', () => {
        mainWindow = new BrowserWindow({
                width: 1200,
                height: 800,
                webPreferences: {
                        nodeIntegration: true, // Włącz integrację Node.js
                        contextIsolation: false, // Wyłącz izolację kontekstu
                },
        });

        mainWindow.loadFile('index.html');
});

ipcMain.handle('export-data-to-csv', async (event, data) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Zapisz dane',
                defaultPath: 'dane.csv',
                filters: [
                        { name: 'CSV Files', extensions: ['csv'] },
                        { name: 'All Files', extensions: ['*'] },
                ],
        });

        if (canceled || !filePath) {
                return { canceled: true };
        }

        const headers = ['date', 'machine_number', 'program_number', 'status', 'weight'];
        const csvRows = [
                headers.join(';'),
                ...data.map((row) => headers.map((h) => row[h] ?? '').join(';')),
        ];

        fs.writeFileSync(filePath, csvRows.join('\n'));
        return { canceled: false, filePath };
});
