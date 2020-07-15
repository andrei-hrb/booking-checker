const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");
const dateFormat = require("dateformat");
const express = require("express");
// require("dotenv").config();

const location = process.env.LOCATION;
const emails = process.env.EMAILS.split(",");
const propreties = process.env.PROPRETIES.split(",");
const propretiesFindTommorow = [];
const propretiesFindFuture = [];

let searchLinkTommorow = "";
let searchLinkFuture = "";

const today = new Date();
const tommorow = new Date();
const future = new Date();
tommorow.setDate(tommorow.getDate() + 1);
future.setDate(future.getDate() + 2);

const formatedToday = dateFormat(today, "yyyy-mm-dd");
const formatedTommorow = dateFormat(tommorow, "yyyy-mm-dd");
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

  for (let i = 0; i < 2; i++) {
    await page.goto("https://www.booking.com/", { waitUntil: "networkidle2" });

    await page.click("input[data-component]");
    await page.waitFor(250);
    await page.keyboard.type(location, { delay: 100 });
    await page.waitFor(250);

    await page.click(".xp__dates");
    await page.waitFor(250);
    await page.click(`td[data-date='${formatedToday}']`);
    await page.waitFor(250);
    await page.click(
      `td[data-date='${i === 0 ? formatedTommorow : formatedFuture}']`
    );
    await page.waitFor(100);

    await page.click("button.sb-searchbox__button");
    await page.waitForNavigation();
    searchLinkTommorow = i === 0 ? page.url() : searchLinkTommorow;
    searchLinkFuture = i === 1 ? page.url() : searchLinkFuture;

    for (let proprety of propreties) {
      // forEach in async sucks
      const found = await page.evaluate(
        (proprety) => window.find(proprety),
        proprety
      );
      if (i === 0) {
        propretiesFindTommorow.push(await found);
      } else {
        propretiesFindFuture.push(await found);
      }
    }

    const client = await page.target().createCDPSession();
    await client.send("Network.clearBrowserCookies");
    await client.send("Network.clearBrowserCache");
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
    html: getHtml(propreties, propretiesFindTommorow, propretiesFindFuture),
  });
};

/**
 * Change these acordigly
 */
const getHtml = (propreties, propretiesFindTommorow, propretiesFindFuture) => {
  let output = "";

  for (let i = 0; i < propreties.length; i++) {
    output +=
      "<i>" +
      propreties[i] +
      "</i>" +
      " " +
      (propretiesFindTommorow[i] ? "" : "<b>nu</b>") +
      " <b>este</b> disponibilă pentru un sejur de o noapte." +
      "<br />";

    output +=
      "<i>" +
      propreties[i] +
      "</i>" +
      " " +
      (propretiesFindFuture[i] ? "" : "<b>nu</b>") +
      " <b>este</b> disponibilă pentru un sejur de două nopți." +
      "<br />";

    output += "<br />";
  }

  output += "<br /><br /><hr />";

  output += `<br /><br /><small>Acesta este încă un soft netestat extensiv, așa că pot exista probleme cu acuratețea informațiilor; Recomand, cel puțin pâna la dispariția acestui paragraf, verificarea acestor informații pe Booking.com apasând <a href="${searchLinkTommorow}">acest link pentru un sejur de o noapte</a> sau <a href="${searchLinkFuture}">acest link pentru un sejur de două nopți</a>, iar orice problemă trebuie comunicată. Mulțumesc anticipat!</small>`;

  output +=
    "<br /><br /><small>Nu răspundeți acestui email/trimiteți email-uri pe acestă adresă, nu vă va răspunde nimeni.</small>";

  output +=
    '<br /><br /><small>Creat cu multă ❤️ și ☕ de către <a href="https://andrei-hrb.com/" rel="noopener noreferrer" target="_blank">Hîrbu Andrei</a>.</small>';

  output += "<br /><br /><small>Version: 1.01 - Updated on 15.07.2020</small>";
  return output;
};

const app = express();
const port = process.env.PORT;

app.get("/", (req, res) => {
  if (req.query.key === process.env.KEY) {
    functionality().then(() => res.send("Done!"));
  } else {
    res.send("Invalid key!");
  }
});

app.listen(port, () => console.log(`App listening at port ${port}`));
