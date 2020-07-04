const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const dateFormat = require("dateformat");
const express = require("express");
// require("dotenv").config();

const location = process.env.LOCATION;
const emails = process.env.EMAILS.split(",");
const propreties = process.env.PROPRETIES.split(",");
const propretiesFind = [];

let searchLink = "";

const today = new Date();
const future = new Date();
future.setDate(future.getDate() + 2);

const formatedToday = dateFormat(today, "yyyy-mm-dd");
const formatedFuture = dateFormat(future, "yyyy-mm-dd");

const functionality = async () => {
  // prevent detecting Puppeteer
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-infobars",
    "--window-position=0,0",
    "--ignore-certifcate-errors",
    "--ignore-certifcate-errors-spki-list",
    '--user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"',
  ];

  const options = {
    args,
    headless: true,
    ignoreHTTPSErrors: true,
  };

  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  await page.goto("https://www.booking.com/", { waitUntil: "networkidle2" });

  await page.click("input[data-component]");
  await page.waitFor(250);
  await page.keyboard.type(location, { delay: 100 });
  await page.waitFor(250);

  await page.click(".xp__dates");
  await page.waitFor(250);
  await page.click(`td[data-date='${formatedToday}']`);
  await page.waitFor(100);
  await page.click(`td[data-date='${formatedFuture}']`);
  await page.waitFor(100);

  await page.click("button.sb-searchbox__button");
  await page.waitForNavigation();
  searchLink = page.url();

  for (let proprety of propreties) {
    // forEach in async sucks
    const found = await page.evaluate(
      (proprety) => window.find(proprety),
      proprety
    );
    propretiesFind.push(await found);
  }

  await browser.close();

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    secure: process.env.MAIL_SECURE, // use TLS
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"${process.env.MAIL_NAME}" <${process.env.MAIL_USER}>`,
    to: emails.join(", "),
    subject: `${process.env.MAIL_SUBJECT} [${formatedToday}]`,
    text: getText(propreties, propretiesFind),
    html: getHtml(propreties, propretiesFind),
  });
};

/**
 * Change these acordigly
 */
const getText = (propreties, propretiesFind) => {
  let output = "";

  for (let i = 0; i < propreties.length; i++) {
    output +=
      propreties[i] +
      " " +
      (propretiesFind[i] ? "" : "nu") +
      " este disponibilă" +
      "\n";
  }

  return output;
};

const getHtml = (propreties, propretiesFind) => {
  let output = "";

  for (let i = 0; i < propreties.length; i++) {
    output +=
      "<i>" +
      propreties[i] +
      "</i>" +
      " " +
      (propretiesFind[i] ? "" : "<b>nu</b>") +
      " <b>este</b> disponibilă" +
      "<br />";
  }

  output += `<br />Acesta este încă un soft netestat extensiv, așa că pot exista probleme cu acuratețea informațiilor; Recomand, cel puțin pâna la dispariția acestui paragraf, verificarea acestor informații pe Booking.com apasând <a href="${searchLink}">acest link</a>, iar orice problemă trebuie comunicată. Mulțumesc anticipat!`;

  output += "<br /><br /><hr />";

  output +=
    "<br /><small>Nu răspundeți acestui email/trimiteți email-uri pe acestă adresă, nu vă va răspunde nimeni.</small>.";

  output +=
    '<br /><small>Creat cu multă ❤️ și ☕ de către <a href="https://andrei-hrb.com/" rel="noopener noreferrer" target="_blank">Hîrbu Andrei</a></small>.';

  return output;
};

const app = express();
const port = process.env.PORT;

app.get("/", (req, res) => {
  functionality().then(() => res.send("Done!"));
});

app.listen(port, () => console.log(`App listening at port ${port}`));
