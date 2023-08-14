const fs = require('fs').promises;
const path = require('path');
const { deviceSettings, apiKeys, loggingSessionsDirectories } = require('./config');

for (let key in process.env) {
  if (key.startsWith('API_KEY_')) {
    let deviceId = key.split('_')[2];  // get the device ID from the key name
    apiKeys[deviceId] = process.env[key];
  }
}

async function loadDeviceSettings() {
    try {
        let data = await fs.readFile('deviceSettings.json', 'utf-8');
        Object.assign(deviceSettings, JSON.parse(data)); // This will update deviceSettings in place
    } catch (err) {
        console.error("Error loading device settings:", err);
        throw err;
    }
}

async function initializeLogDirectoriesForDevices() {
    const deviceIds = Object.keys(deviceSettings);

    for (const deviceId of deviceIds) {
        const deviceDir = path.join(__dirname, 'logs', deviceId);

        try {
            await fs.mkdir(deviceDir, { recursive: true });
            console.log(`Directory for device ${deviceId} created.`);
        } catch (err) {
            if (err.code !== 'EEXIST') {
                console.error(`Error creating directory for device ${deviceId}:`, err);
            }
        }
    }
}

async function initializeLoggingSessionsDirectories() {
    const deviceIds = await fs.readdir(path.join(__dirname, 'logs'));

    for (let deviceId of deviceIds) {
        const deviceDir = path.join(__dirname, 'logs', deviceId);
        const sessionDirs = await fs.readdir(deviceDir);

        console.log(`For device: ${deviceId}, sessionDirs are:`, sessionDirs);

        if(sessionDirs.length > 0) {
            const statsPromises = sessionDirs.map(dir => fs.stat(path.join(deviceDir, dir)));
            const stats = await Promise.all(statsPromises);

            sessionDirs.sort((a, b) => {
                const aStat = stats.find(stat => stat.isDirectory() && path.basename(stat.path) === a);
                const bStat = stats.find(stat => stat.isDirectory() && path.basename(stat.path) === b);

                if (aStat && bStat) {
                    return bStat.mtime.getTime() - aStat.mtime.getTime();
                }
                return 0;
            });

            loggingSessionsDirectories[deviceId] = path.join(deviceDir, sessionDirs[0]);
        } else {
            console.warn(`No session directories found for device: ${deviceId}`);
        }
    }
}

async function initialize() {
    await loadDeviceSettings();
    await initializeLogDirectoriesForDevices();
    await initializeLoggingSessionsDirectories();
}

module.exports = {
    initialize
};
