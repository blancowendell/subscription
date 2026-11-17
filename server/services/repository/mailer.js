const nodemailer = require("nodemailer");
const { Decrypter } = require("./cryptography");
require("dotenv").config();

let password = "";
Decrypter(`${process.env._EMAIL_PASSWORD}`, (err, decrypted) => {
  if (err) {
    console.error("Email password decrypt error: ", err);
    return;
  }
  password = decrypted;
});

// Built on first send so the decrypted password is always ready.
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env._EMAIL_PORT) || 587;

    transporter = nodemailer.createTransport({
      host: `${process.env._EMAIL_HOST}`,
      port,
      secure: port === 465, // SSL on 465, STARTTLS/plain on others
      auth: {
        user: `${process.env._EMAIL_USER}`,
        pass: password,
      },
    });
  }
  return transporter;
};

// Awaitable version: resolves with the send info, rejects on failure.
// Use this in new code when the caller needs to know if the email went out.
const SendEmailAsync = (to, subject, html) =>
  new Promise((resolve, reject) => {
    const mailOptions = {
      from: process.env._EMAIL_FROM,
      to,
      subject,
      html,
    };

    getTransporter().sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email Error: ", error);
        return reject(error);
      }
      console.log("Email sent");
      return resolve(info);
    });
  });

// Original fire-and-forget version, kept for existing callers. Never throws.
const SendEmail = (to, subject, text) => {
  SendEmailAsync(to, subject, text).catch(() => {});
};

module.exports = {
  SendEmail,
  SendEmailAsync,
};