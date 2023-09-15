# FB Marketplace Scraper Bot

This is an Electron app for scraping data from Facebook Marketplace.

## Installation

1. Clone this repository to your local machine:

  
   git clone https://github.com/SirUsman-Repo/FB-Marketplace-Scraper-Bot.git


## Navigate to the project directory:
cd FB-Marketplace-Scraper-Bot

## Install the required dependencies:
npm install

## Usage
Running the App
To run the app without building the executable:
npm start

## Building the Executable
To build the executable for your platform:

async write(headersArray, dataJsonArray, fname) {
    // Uncomment the following lines when building the executable (packed file)
    // const appRootDir = process.resourcesPath; // Get packed application root path
    // const resultFolderPath = path.join(appRootDir, '..','Result'); // You can change 'Result' to 'Scrap Data' if needed
    // const filename = path.join(resultFolderPath, fname);
    // // Create the 'Result' folder if it doesn't exist
    // if (!fs.existsSync(resultFolderPath)) {
    //     fs.mkdirSync(resultFolderPath);
    // }

    // Comment out the above lines when running the code outside of the executable
    const filename = path.join(__dirname, '..', `${fname}`);
    let rows;
    if (!fs.existsSync(filename)) {
        rows = json2csv(dataJsonArray, {
            header: true
        });
    } else {
        rows = json2csv(dataJsonArray, {
            header: false
        });
    }
    fs.appendFileSync(filename, rows);
    fs.appendFileSync(filename, "\r\n");
}

npm run build


## This will generate executable files in the out directory.

## Contributing
If you'd like to contribute to this project, feel free to fork the repository and submit pull requests.

## License
This project is licensed under the MIT License - see the LICENSE file for details.



