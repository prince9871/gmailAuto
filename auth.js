const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const fs = require('fs');
const readline = require('readline');
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const oauth2Client = new OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  credentials.installed.redirect_uris[0]
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log(`Please authorize the app by visiting this URL: ${authUrl}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code);
  fs.writeFileSync('token.json', JSON.stringify(tokens));
  console.log('Token stored to token.json');
  rl.close();
});
