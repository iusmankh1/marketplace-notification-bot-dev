const electron = require('electron');
const Automate = require('./Backend/Automate');
const { app, BrowserWindow, ipcMain } = electron;
const path = require("path");
const fs = require('fs')
const axios = require('axios');
const config = require('./config');
const browse = new Automate();
const macAddress = require('macaddress');
const { machineIdSync } = require('node-machine-id');
const https = require("https")
let mainWindow;

let username = ''; // Initialize an empty username

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
    },
    icon: "./Frontend/img/icon.png",
    show: false,
  });
  mainWindow.maximize();
  mainWindow.loadURL(config.login_page);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  ipcMain.on('login:authenticate', async (event, data) => {
    try {
      const productIds = config.Product_ID;
      const deviceIdentifier = await getUniqueDeviceID(); // called function to get device make address
      const response = await axios.post(
        'https://botswithbrains-api-v2.vercel.app/api/users/login',
        {
          email: data.email,
          password: data.password,
          deviceID: deviceIdentifier,
          productIds:productIds
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Bypass certificate validation
        }
      );

      const user = response.data.user;

      if (!fs.existsSync(config.first_name)) {
        fs.closeSync(fs.openSync(config.first_name, "a"));
      }
      fs.writeFileSync(config.first_name, user.username);
      mainWindow.loadURL(`${config.listing_executer}`);
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 401)) {
        // Unauthorized - Incorrect Email or Password
        let ERROR =  error.response.data.error
        console.log("Error",ERROR);
        event.sender.send('login:response', {
          type: 'error',
          message: `Oops! It looks like  ${ERROR}, click here or contact Customer Support.`,
        });
      } else {
        // Other API errors
        console.error('Error Happen',error);
        event.sender.send('login:response', {
          type: 'error',
          message: `We're sorry, but our system is currently unavailable. We're working hard to fix this. To report an issue, click here or contact Customer Support.`,
        });
      }
    }
  });

  // Helper function to get unique device identifier
  async function getUniqueDeviceID() {
    try {
      const mac = await getMacAddress();
      if (mac) {
        return mac;
      } else {
        // If MAC address retrieval fails, get a unique machine ID based on system properties
        const machineID = machineIdSync({ original: true });
        return machineID;
      }
    } catch (error) {
      throw 'Failed to retrieve MAC address and machine ID';
    }
  }

  // Helper function to get MAC address
  function getMacAddress() {
    return new Promise((resolve, reject) => {
      macAddress.one((err, mac) => {
        if (err) {
          console.warn('Could not fetch MAC address:', err);
          resolve(null);
        } else {
          resolve(mac);
        }
      });
    });
  }

  // Read the user's first name and store it in the 'username' variable
  const firstNameFilePath = path.join(app.getPath('userData'), 'name.txt');
  if (fs.existsSync(firstNameFilePath)) {
    username = fs.readFileSync(firstNameFilePath, 'utf8');
  }

  // IPC event to retrieve the username
  ipcMain.on('get-username', (event) => {
    event.sender.send('username-reply', username);
  });


  ipcMain.on('facebook:login', (event, data) => {
    browse.login(data);
  });

  ipcMain.on("automate:scrapLink", (event, data) => {
    if (browse) {
      browse.scrapeLink(data.link, event, data.email, data.refreshed);
    }
  });

  ipcMain.on("automate:scrapData", (event, link, scrollDelay, listingDelay, operationDelay, message, noOfMessage) => {
    if (browse) {
      browse.scrapeMarketplaceData(link, listingDelay, scrollDelay, operationDelay, event, message, noOfMessage);
    }
  });

  ipcMain.on('automate:stop', (event) => {
    if (browse) {
      browse.stop(event);
    }
  });

  ipcMain.on("scrapeLinkCompleted", (event) => {
    event.sender.send("action:completed");
  });

  ipcMain.on("scrapeDataCompleted", (event) => {
    event.sender.send("action:completed");
  });

  ipcMain.on("browserStopped", (event) => {
    event.sender.send("action:stopped");
  });
});