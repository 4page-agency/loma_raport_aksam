const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron'); // Dodano Menu
const fs = require('fs');

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

ipcMain.handle('export-data-to-excel', async (event, data) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Zapisz dane',
                defaultPath: 'dane.xls',
                filters: [
                        { name: 'Excel Files', extensions: ['xls'] },
                        { name: 'All Files', extensions: ['*'] },
                ],
        });

        if (canceled || !filePath) {
                return { canceled: true };
        }

        const headers = ['date', 'machine_number', 'program_number', 'status', 'weight'];

        const headerRow =
                '<tr>' + headers.map((h) => `<th>${h}</th>`).join('') + '</tr>';

        const rows = data
                .map((row) => {
                        return (
                                '<tr>' +
                                `<td style="mso-number-format:'yyyy-mm-dd hh:mm:ss'">${
                                        row.date ?? ''
                                }</td>` +
                                `<td>${row.machine_number ?? ''}</td>` +
                                `<td>${row.program_number ?? ''}</td>` +
                                `<td>${row.status ?? ''}</td>` +
                                `<td>${row.weight ?? ''}</td>` +
                                '</tr>'
                        );
                })
                .join('');

        const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8" /></head><body><table>${headerRow}${rows}</table></body></html>`;

        fs.writeFileSync(filePath, htmlContent, 'utf8');
        return { canceled: false, filePath };
});
