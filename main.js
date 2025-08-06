const { app, BrowserWindow, Menu } = require('electron'); // Dodano Menu
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
