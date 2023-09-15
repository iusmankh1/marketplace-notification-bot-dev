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
      const deviceIdentifier = await getUniqueDeviceID(); // called function to get device make address
      const response = await axios.post(
        'http://192.168.18.227:4000/api/users/login',
        {
          email: data.email,
          password: data.password,
          deviceID: deviceIdentifier
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const user = response.data.user;
      const expiryDate = new Date(user.expiryDate);
      const currentDate = new Date();

      if (currentDate > expiryDate) {
        event.sender.send('login:response', {
          type: 'error',
          message: `It appears your software license has expired. To continue using our services, click here to repurchase or contact our System Administrator for assistance.`,
        });
        return;
      }
      if (user.Product_ID !== config.sampleProductId && user.Product_ID !== config.specialId) {
        event.sender.send('login:response', {
          type: 'error',
          message: `Unfortunately, you're not eligible for this product. If you believe this is an error, you can report the issue here or reach out to Customer Support.`,
        });
        return;
      }
      if (!user.status) {
        event.sender.send('login:response', {
          type: 'error',
          message: "Your account has been blocked by the system admin. To resolve this, please contact Customer Support or to visit click here."
        });
        return;
      }
      if (!fs.existsSync(config.first_name)) {
        fs.closeSync(fs.openSync(config.first_name, "a"));
      }
      fs.writeFileSync(config.first_name, user.username);
      mainWindow.loadURL(`${config.listing_executer}`);
    } catch (error) {
      if (error.response && (error.response.status === 400 || error.response.status === 401)) {
        // Unauthorized - Incorrect Email or Password
        if (error.response.data.error) {
          event.sender.send('login:response', {
            type: 'error',
            message: `Device limit reached. To report an issue, click here or contact Customer Support.`,
          });
        } else {
          event.sender.send("login:response", {
            type: "error",
            message: `Oops! It looks like your email or password is incorrect. Need help? Click here to visit the website or contact a Customer Support representative.`,
          });
        }
      } else {
        // Other API errors
        console.error('Error Happen');
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