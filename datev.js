#!/usr/bin/env nodejs
const fs = require('fs');
const path = require('path');
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
  await delay(10000);
  await page.waitForSelector('#navSTARTHEADLINEDOCS > a');
  await page.click('#navSTARTHEADLINEDOCS > a');
  
  // Wait until documents are loaded and click the checkbox
  await page.waitForSelector('.analysisGrid table > tbody > tr > td:nth-child(2) > div.analysisCaption');
  await page.click('input#analysesCheckAll');
  console.log('Downloading…');

  await Promise.all([
    page.click("#btnDownloadZip"),
    page.on('response', response => {
        let headers = response.headers();
        let contentType = headers['content-type'];
        let contentDisposition = headers['content-disposition'];

        if (contentType === 'application/octet-stream' && contentDisposition.indexOf('attachment; filename=') !== -1) {
          let downloadFilename = contentDisposition.match(/filename=\"(.+)?\"/i)[1];
          
          fs.watch(downloadDirectory, (event, filename) => {
            if (event === 'rename' && filename === downloadFilename) {
              if (fs.existsSync(path.resolve(downloadDirectory, downloadFilename))) {
                page.click('#top > div.infobar > ul > li:nth-child(2) > a').then(() => {
                  console.log(`Saved as ./download/${downloadFilename}`);
                  browser.close().then(process.exit());
                });
              }
            }
          });
        }
    }),
  ]);
}

run();
