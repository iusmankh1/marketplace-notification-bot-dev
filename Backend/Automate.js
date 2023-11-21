const puppeteer = require("puppeteer-extra");
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const locateChrome = require("locate-chrome");
const nodemailer = require("nodemailer");
require('dotenv').config()



class Automate {
  constructor() {
    this.lock = false;
    this.browser = null;
    this.page = null;
    this.stopped = false;
    this.logMessages = [];
    this.existingLinks = []; // Initialize an array to store existing links
    this.refreshIntervalIds = []; // Initialize an array to store interval IDs
  }

  async init() {
    // Initialization code if needed
  }


  async sendMail(email, subject, text, event) {
    console.log("function calling ");
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: "botwithbrain8@gmail.com",
        pass: "mbii gicb noka zevm",
      },
    });
    // console.log("trnasporter", transporter)


    const mailOptions = {
      from: "botwithbrain8@gmail.com",
      to: email,
      subject: subject,
      text: text,
    };
    console.log("mailOptions", mailOptions)
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Mail Sent', info.response);
      return ('New Scraped Links sent via email Successfully')
    } catch (error) {
      console.error('Error while sending email', error);
      return ('Error while sending email')
    }
  }


  async login(data) {
    this.lock = true;
    const chromePath = await locateChrome();
    console.log("Chromium path:", chromePath);
    puppeteer.use(StealthPlugin());

    this.browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false,
      // ignoreDefaultArgs: ['--enable-automation'],
      args: [
        '--start-maximized',
        '--disable-infobars',
        '--disable-notifications',
        '--password-store=basic',
      ],
    });
    const [page] = await this.browser.pages();
    this.page = page

    await this.page.goto("https://facebook.com/");
    try {
      await this.page.type("input[name='email']", data.username);
      await this.page.type("input[name='pass']", data.password);
      await this.page.waitForTimeout(3000);
      await this.page.click("button[name='login']");
      this.lock = false;
    } catch (error) {
      console.log("Already logged in");
      this.lock = true;
    }
  }

  async scrapeLink(link, event, email, refreshed) {
    if (this.lock) return;

    this.clearScrapingIntervals();
    let intervalId;
    this.stopped = false;
    // Store the existing links from previous scrapes
    const existingItemIds = new Set(this.existingLinks.map(link => link.match(/\/item\/(\d+)\//)[1]));

    const performScrape = async () => {
      try {
        if (this.stopped) {
          clearInterval(intervalId);
          this.onLogMessage('Scraping process stopped.', 'status');
          this.sendLogsToUI(event);
          return;
        }

        await this.page.goto(link, { waitUntil: 'networkidle2', timeout: 60000 });

        this.onLogMessage('Waiting is over, starting to scrape...', 'status');
        this.sendLogsToUI(event);
        // Extract new links
        const Links = await this.extractLinkHrefs();
        const extractLink = [];

        for (const link of Links) {
          const itemId = link.match(/\/item\/(\d+)\//)[1];

          if (!existingItemIds.has(itemId)) {
            extractLink.push({ Link: link });
            existingItemIds.add(itemId);
            this.onLogMessage('New Link extracted: ' + link, 'operation');
            this.sendLogsToUI(event);
          }
        }
        this.onLogMessage('Total Scraped Links: ' + extractLink.length, 'status');
        this.sendLogsToUI(event);

        if (extractLink.length > 0) {
          // Send email with new scraped links
          const emailSubject = "New Scraped Links";
          const emailText = `Here are the new scraped links:\n${extractLink.map(linkObj => linkObj.Link).join("\n")}`;
          const result = await this.sendMail(email, emailSubject, emailText);
          this.onLogMessage(`${result}`, 'status');
          this.sendLogsToUI(event);
        } else {
          this.onLogMessage('No new links found', 'status');
          this.sendLogsToUI(event);
        }
      } catch (error) {
        console.error('Error while scraping Link:', error);
        this.onLogMessage('Error while scraping Link: ' + error.message, 'status');
        this.sendLogsToUI(event);
      }
    }

    await performScrape();
    intervalId = setInterval(performScrape, refreshed);// Set the interval for subsequent iterations
    this.refreshIntervalIds.push(intervalId);
  }

  async scrapeMarketplaceData(links, listingDelay, scrollDelay, operationDelay, event, message, noOfMessage) {
    if (this.lock) return;
    try {
      await this.page.goto(links, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await this.page.waitForTimeout(listingDelay);
      await this.scrollPage(listingDelay, scrollDelay);
      this.onLogMessage('Waiting is over, starting to scrape...', "status");
      this.sendLogsToUI(event);

      const Links = await this.extractLinkHrefs();
      this.onLogMessage("Total Scraped Links:" + Links.length, "status")
      this.sendLogsToUI(event);

      let products = [];
      for (let i = 0; i < Math.min(Links.length, noOfMessage); i++) {
        this.onLogMessage(`Processing link ${i + 1} of ${Links.length}`, "operation")
        this.sendLogsToUI(event);

        if (!Links[i]) continue;
        await this.page.goto(Links[i], {
          waitUntil: 'networkidle2',
          timeout: 40000
        });
        await this.page.waitForTimeout(operationDelay);
        // Send message
        const messageButtonXPath = '//div[@aria-label="Message"]/div/div[2]';
        const [messageButton] = await this.page.$x(messageButtonXPath);

        if (messageButton) {
          await messageButton.click();
          await this.page.waitForTimeout(1000);

          const messageInputXPath = '//*[@id="facebook"]//div[3]/label';
          await this.page.waitForXPath(messageInputXPath);
          const [messageInput] = await this.page.$x(messageInputXPath);
          if (messageInput) {
            await messageInput.type(message); // Type the message
          } else {
            console.error('Message input element not found');
          }
          const sendButtonXPath = '//div[@aria-label="Send Message"]';
          const [sendButton] = await this.page.$x(sendButtonXPath);
          if (sendButton) {
            await sendButton.click(); // Click the send button
          } else {
            console.error('Send button element not found');
          }
          // Log message and UI updates
          this.onLogMessage(`Message sent to link ${i + 1} of ${Links.length}: ${message}`, "status");
          this.sendLogsToUI(event);
        } else {
          console.error('Message button element not found');
          this.onLogMessage(`Message button element not found`, "status");
          this.sendLogsToUI(event);
        }
        const productName = await this.scrapeText(`//div[contains(@class, 'x1pi30zi')]/h1/span`);
        this.onLogMessage("Product Name:" + productName, "operation");
        this.sendLogsToUI(event);

        const productCondition = await this.scrapeText(`//span[@class='x1e558r4 xp4054r x3hqpx7']//span/span`);
        this.onLogMessage("Product Condition:" + productCondition, "operation");
        this.sendLogsToUI(event);

        const productDescription = await this.scrapeText(`//div[@class="xz9dl7a x4uap5 xsag5q8 xkhd6sd x126k92a"]//span`);
        this.onLogMessage("Product Description:" + productDescription, "operation");
        this.sendLogsToUI(event);

        const productPrice = await this.scrapeText(`//div[@class='x1xmf6yo']/div/span[contains(@class, 'x1s928wv ')]`);
        this.onLogMessage("Product Price:" + productPrice, "operation");
        this.sendLogsToUI(event);

        const productLocation = await this.scrapeText(`//div[@class="xu06os2 x1ok221b"]//span[contains(@class, 'x1nxh6w3 x1sibtaa')]/span`);
        this.onLogMessage("Product Location:" + productLocation, "operation");
        this.sendLogsToUI(event);

        products.push({
          ProductDescription: productDescription,
          ProductName: productName,
          ProductCondition: productCondition,
          ProductPrice: productPrice,
          ProductLocation: productLocation,
          ProductUrl: Links,
        });
      }

      if (products.length > 0) {
        this.onLogMessage("Total " + noOfMessage + " Message Send", "status")
        this.sendLogsToUI(event);
        event.sender.send("scrapeDataCompleted");
      }
      this.stop(event);
    } catch (error) {
      console.error("Error while scraping:", error);
      this.onLogMessage("Error while scraping Data:" + error.message, "status");
      this.sendLogsToUI(event);
    }
  }

  async extractLinkHrefs() {
    const linksElements = await this.page.$x(`//div[@class='x3ct3a4']//a[@role='link']`);
    const Links = await Promise.all(linksElements.map(async (link) => {
      const hrefProp = await link.getProperty("href");
      return hrefProp.jsonValue();
    }));
    return Links;
  }
  async scrapeText(xpath) {
    try {
      const [element] = await this.page.$x(xpath);
      return element ? await this.page.evaluate(el => el.textContent, element) : "";
    } catch (error) {
      return "";
    }
  }

  async scrollPage(listingDelay, scrollDelay) {
    for (let i = 0; i < scrollDelay; i++) {
      await this.page.evaluate(() => {
        window.scrollBy(0, window.innerHeight);
      });
      await this.page.waitForTimeout(listingDelay);
    }
  }

  async stop(event) {
    if (this.browser) {
      this.stopped = true;
      this.clearScrapingIntervals();
      await this.browser.close();
      this.onLogMessage("Browser stopped.", "status");
      this.sendLogsToUI(event);
    }
    event.sender.send("browserStopped");
  }

  clearScrapingIntervals() {
    // Clear all refresh intervals
    for (const intervalId of this.refreshIntervalIds) {
      clearInterval(intervalId);
    }
    this.refreshIntervalIds = []; // Clear the array
  }


  onLogMessage(message, status, event) {
    this.logMessages.push({ message, status });
  }

  // Method to send log messages to the frontend and clear them
  sendLogsToUI(event) {
    const logMessageStringsWithStatus = this.logMessages.map(log => ({
      message: log.message,
      status: log.status
    }));
    this.logMessages = []; // Clear the log messages after sending
    event.sender.send("logMessageUpdate", logMessageStringsWithStatus);
  }
}

module.exports = Automate;