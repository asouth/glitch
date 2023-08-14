const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const { initialize } = require('./init');
const { fromDisplayName, toDisplayName } = require('./utils');
const { apiKeyAuth } = require('./middleware');
const { deviceSettings, isWriting, loggingSessionsDirectories } = require('./config');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

async function writeDebugData(deviceId, sessionFolder) {
    const sampleData = [
        {
            "date": "13/08/2023 12:01:00.123",
            "laeq": 75.2,
            "la90": 72.1,
            "lamax": 79.0
        },
        {
            "date": "13/08/2023 12:02:00.124",
            "laeq": 74.8,
            "la90": 71.8,
            "lamax": 78.5
        },
        {
            "date": "13/08/2023 12:03:00.125",
            "laeq": 75.5,
            "la90": 72.4,
            "lamax": 79.2
        }
    ];

    const currentDateTime = new Date();
    const logFileName = `LOG-${currentDateTime.getFullYear()}${String(currentDateTime.getMonth() + 1).padStart(2, '0')}${String(currentDateTime.getDate()).padStart(2, '0')}-${String(currentDateTime.getHours()).padStart(2, '0')}${String(currentDateTime.getMinutes()).padStart(2, '0')}.json`;

    const targetPath = path.join(__dirname, 'logs', deviceId, sessionFolder, logFileName);
    try {
        await fs.writeFile(targetPath, JSON.stringify(sampleData, null, 2), 'utf8');
        console.log(`Sample data written to ${targetPath}`);
    } catch (error) {
        console.error(`Error writing sample data: ${error.message}`);
    }
}


writeDebugData('esp32_device_1', 'SSN20230813123649401');

app.get('/', (req, res) => {
  const deviceIds = Object.keys(deviceSettings);
  let selectedDeviceId = req.query.deviceId;
  if (!selectedDeviceId || !deviceIds.includes(selectedDeviceId)) {
    selectedDeviceId = deviceIds[0];
  }

  const displayedSettings = deviceSettings[selectedDeviceId] 
    ? Object.fromEntries(
        Object.entries(deviceSettings[selectedDeviceId]).map(
          ([key, value]) => [toDisplayName(key), value]
        )
      ) 
    : {};

  res.render('index', {
    deviceIds: deviceIds,
    selectedDeviceId: selectedDeviceId,
    settings: displayedSettings,
    username: "Guest"
  });
});

app.post('/', async (req, res) => {
  const deviceId = req.body.deviceId;
  delete req.body.deviceId;

  const newSettings = Object.fromEntries(
    Object.entries(req.body).map(
      ([key, value]) => [fromDisplayName(key), value]
    )
  );

  deviceSettings[deviceId] = newSettings;

  while (isWriting) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  isWriting = true;

  fs.writeFile('deviceSettings.json', JSON.stringify(deviceSettings, null, 2), 'utf-8', (err) => {
    isWriting = false;

    if (err) {
      console.error(err);
      return res.status(500).send('An error occurred while writing to file');
    }
    res.redirect(`/?deviceId=${deviceId}`);
  });
});

app.post('/log', apiKeyAuth, async (req, res) => {
  const logData = req.body;
  const deviceId = req.body.deviceId;
  const loggingSessionDirectory = loggingSessionsDirectories[deviceId];

  if (!loggingSessionDirectory) {
    return res.status(400).send('No logging session started for this device');
  }

  const logFilePath = path.join(loggingSessionDirectory, new Date().toISOString() + '.json');

  try {
    await fs.writeFile(logFilePath, JSON.stringify(logData, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing log data to file', err);
    return res.status(500).send('An error occurred while writing to log file');
  }

  res.status(204).send();
});

app.get('/api/settings', (req, res) => {
    const deviceId = req.query.deviceId;
    const specificDeviceSettings = deviceSettings[deviceId];

    if (!specificDeviceSettings) {
        return res.status(404).send('Device not found');
    }

    const settingsWithDisplayName = Object.fromEntries(
        Object.entries(specificDeviceSettings).map(
            ([key, value]) => [toDisplayName(key), value]
        )
    );

    res.json(settingsWithDisplayName);
});

app.get('/log/:deviceId/latest', async (req, res) => {
    const deviceId = req.params.deviceId;

    // Check if logs directory for device exists
    const logsDirPath = path.join(__dirname, 'logs', deviceId);

    try {
        await fs.access(logsDirPath);
    } catch (error) {
        console.error("No logs for the selected device.");
        return res.status(404).json({ message: "No logs for the selected device." });
    }

    // Fetch session directories and find the latest
    const sessionDirs = await fs.readdir(logsDirPath);
    if (!sessionDirs.length) {
        console.error("No session logs for the selected device.");
        return res.status(404).json({ message: "No session logs for the selected device." });
    }

    const latestSessionDir = sessionDirs.sort().pop();
    const latestSessionPath = path.join(logsDirPath, latestSessionDir);

    // Now, fetch log files and find the latest
    const logFiles = (await fs.readdir(latestSessionPath)).filter(file => file.startsWith('LOG-')).sort();

    if (!logFiles.length) {
        console.error("No log files for the latest session.");
        return res.status(404).json({ message: "No log files for the latest session." });
    }

    const latestLogFile = logFiles.pop();
    const logDataPath = path.join(latestSessionPath, latestLogFile);

    let logData;
    try {
        // Changed from using require to fs.readFile as require caches files
        const rawData = await fs.readFile(logDataPath, 'utf8');
        logData = JSON.parse(rawData);
    } catch (error) {
        console.error("Error fetching log data for the latest session.");
        return res.status(500).json({ message: "Error fetching log data for the latest session." });
    }

    // Return log data in table format (limit to 100 rows for now)
    res.json(logData.slice(0, 100)); // assuming logData is an array
});

app.post('/start-logging-session', async (req, res) => {
    const deviceId = req.body.deviceId;

    // Check if deviceId is valid
    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is missing' });
    }

    const logsDir = path.join(__dirname, 'logs', deviceId);

    try {
        // Check if the logs directory for the device exists
        await fs.access(logsDir);

        // If it exists, create a new session directory within it
        const date = new Date();
        const sessionDirName = 'SSN' + date.toISOString().replace(/[-T:.Z]/g, "");
        const sessionDirPath = path.join(logsDir, sessionDirName);

        await fs.mkdir(sessionDirPath);

        // Return success message
        res.json({ message: `New logging session started for device ${deviceId} in ${sessionDirName}` });

    } catch (error) {
        // If logs directory for the device does not exist, handle it
        if (error.code === 'ENOENT') {
            console.log(`Log directory for device ${deviceId} does not exist.`);
            return res.status(400).json({ error: 'Log directory for the specified device does not exist.' });
        }

        // For other errors, send them
        res.status(500).json({ error: 'Server error.' });
    }
});


initialize().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Initialization failed:', err);
});
