#!/usr/bin/env nodejs
const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');
const clear = require('clear');
const puppeteer = require('puppeteer');
const readlineSync = require('readline-sync');

const headless = true;
const currentDirectory = path.resolve(__dirname);
const downloadDirectory = path.resolve(currentDirectory, 'download/');

function getUsername() {
  if (process.env.DATEV_USERNAME) {
    return process.env.DATEV_USERNAME }
  else{
    return readlineSync.question('Please enter your username: ');
  }
}

function getPassword() {
  if (process.env.DATEV_PASSWORD) {
    return process.env.DATEV_PASSWORD }
  else{
    return readlineSync.question('Please enter your password: ', { hideEchoBack: true });
  }
}

function getSMSTan() {
  return readlineSync.question('Please enter the received smsTAN: ');
}

function delay(time) {
  return new Promise(function(resolve) {
    setTimeout(resolve, time);
  });
}

async function run() {
  // Clear screen
  clear();

  // Create headless browser
  const browser = await puppeteer.launch({
    headless: headless
  });

  // Create new page and fetch credentials
  const page = await browser.newPage();

  // Set download path
  await page._client.send('Page.setDownloadBehavior', {
    behavior: 'allow', downloadPath: downloadDirectory
  });
 
  // Landing page leads to another subdomain
  await page.setViewport({ width: 1920, height: 1024 });
  await page.goto('https://www.datev.de/ano/');
  await page.click('a#smsTANLogin.loginLink');

  // Enter credentials and submit form
  await page.waitForSelector('input#username');
  await page.click('input#username');
  await page.keyboard.type(getUsername());
  await page.click('input#password');
  await page.keyboard.type(getPassword());
  await page.click('button#formButton[data-tag="otpLoginSendForm"]');

  // Handle smsTAN
  await page.waitForSelector('input#mTAN');
  await page.click('input#mTAN');
  await page.keyboard.type(getSMSTan());
  await page.click('button#formButton[data-tag="medsecSendForm"]');

  // Wait for page load and switch to documents
  console.log('Please wait…');
  await delay(1000);
  await page.waitForSelector('[routerlink="/documents"]');
  console.log('found [routerlink="/documents] ...');
  await page.click('[routerlink="/documents"]');
 
  // Wait until documents are loaded and click the checkbox
  console.log('wait for (label[class="form-check-label ng-tns-c45-2"])');
  await page.waitForSelector('label[class="form-check-label ng-tns-c45-2"]');
  console.log('click on label[class="form-check-label ng-tns-c45-2"]');
  await page.click('label[class="form-check-label ng-tns-c45-2"]');
  //console.log('wait 1s…');
  //await delay(1000);
  console.log('wait for dowload button…');
  // <button _ngcontent-serverapp-c45="" class="btn btn-primary ng-tns-c45-2">Download</button>
  // #documentList > footer > div > div > button
  // -  await page.waitForSelector('.analysisGrid table > tbody > tr > td:nth-child(2) > div.analysisCaption');
  const [button] = await page.$x("//button[contains(., 'Download')]");
  //await page.waitForSelector('//button[contains(., "Download")]');
  console.log('Downloading…');
  await Promise.all([
    //page.click('button[contains(., "Download")]'),
    button.click(),
    page.on('response', response => {
        let headers = response.headers();
        let contentType = headers['content-type'];
        let contentDisposition = headers['content-disposition'];

        if (contentType === 'application/octet-stream' && contentDisposition.indexOf('attachment; filename=') !== -1) {
          let downloadFilename = contentDisposition.match(/filename=\"(.+)?\"/i)[1];
         
          fs.watch(downloadDirectory, (event, filename) => {
            if (event === 'rename' && filename === downloadFilename) {
              if (fs.existsSync(path.resolve(downloadDirectory, downloadFilename))) {
                // <a _ngcontent-serverapp-c20="" href="https://secure10.datev.de/pkmslogout" class="dropdown-item ng-tns-c20-0">Logout</a>
                console.log(`Saved as ${downloadDirectory}/${downloadFilename}`);
                console.log('logout browser...');
                page.goto('https://secure10.datev.de/pkmslogout').then(() => {
                  page.waitForNavigation().then(() => {
                    delay(2000);
                    browser.close();
                  });
                });

                // It's a zip file, unzip it !
                console.log(`unzipping to ${downloadDirectory}/`);
                fs.createReadStream(path.resolve(downloadDirectory, downloadFilename)).pipe(unzipper.Extract({ path: downloadDirectory }));

                // Ciao bella
                //process.exit();
              }
            }
          });
        }
    }),
  ]);
}

run();
