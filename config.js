
const path = require("path");
const electron = require('electron');
let app = electron.app || electron.remote.app;

module.exports = {
    login_page: `file://${__dirname}/Frontend/login.html`,
    listing_executer: `file://${__dirname}/Frontend/listing-executer.html`,
    token_path: path.join(app.getPath('userData'), "token.txt"),
    first_name: path.join(app.getPath('userData'), "name.txt"),
    sampleProductId: "659260e2d68befe6024e4f89",
    specialId: "BXTEAEM0013",
}   