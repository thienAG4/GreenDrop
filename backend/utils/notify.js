// Simulated notification channel. A real deployment would plug in a provider
// (e.g. Nodemailer/SendGrid for email, Twilio for SMS) here. For this build we
// just log what *would* be sent so the business flow (BR: "system must send a
// confirmation email/SMS") is still exercised end-to-end.

function sendEmail(to, subject, body) {
  console.log(`[SIMULATED EMAIL] to=${to} subject="${subject}"\n${body}\n`);
  return Promise.resolve({ simulated: true, channel: 'email', to, subject });
}

function sendSms(to, body) {
  console.log(`[SIMULATED SMS] to=${to} "${body}"`);
  return Promise.resolve({ simulated: true, channel: 'sms', to, body });
}

module.exports = { sendEmail, sendSms };
