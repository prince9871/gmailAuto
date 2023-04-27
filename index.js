const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const fs = require('fs');

// CONFIGURATION
const config = {
  credentialsFile: 'credentials.json',
  tokenFile: 'token.json',
  vacationLabel: 'Vacation Auto Reply',
};

// AUTHENTICATION
const credentials = JSON.parse(fs.readFileSync(config.credentialsFile));
const oauth2Client = new OAuth2(
  credentials.installed.client_id,
  credentials.installed.client_secret,
  credentials.installed.redirect_uris[0]
);
oauth2Client.setCredentials(JSON.parse(fs.readFileSync(config.tokenFile)));

// MAIN FUNCTION
async function autoReply() {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  while (true) {
    console.log('Checking for new messages...');
    (await gmail.users.messages.list({ userId: 'me', q: `is:inbox -label:${config.vacationLabel} -from:me` }))
      .data.messages.forEach(async message => {
        const fullMessage = (await gmail.users.messages.get({ userId: 'me', id: message.id })).data;
        if (fullMessage.payload.headers.some(header => header.name.toLowerCase() === 'in-reply-to')) return;

        const subjectHeader = fullMessage.payload.headers.find(header => header.name.toLowerCase() === 'subject');
        const subject = subjectHeader ? subjectHeader.value : '';
        console.log(`Sending auto-reply to '${subject}'`);

        const fromHeader = fullMessage.payload.headers.find(header => header.name.toLowerCase() === 'from');
        const senderName = fromHeader ? fromHeader.value.match(/(.*) <.*@.*>/)[1] : fromHeader.value;

        const body =
          `Hi ${senderName},\n\nThank you for your email. I'm currently out of office and will not be able to respond until 28 April. If your matter is urgent, please contact soniprince142@gmail.com.\n\nBest regards,\nPrince Soni`;

        const encodedBody = Buffer.from(body)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedBody,
            threadId: fullMessage.threadId,
          },
        });

        console.log(`Replied to '${subject}'. Applying label '${config.vacationLabel}'...`);
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: { addLabelIds: [await getOrCreateLabelId(gmail, config.vacationLabel)] },
        });
      });

    await new Promise(resolve => setTimeout(resolve, Math.random() * (120000 - 45000) + 45000));
  }
}

// HELPER FUNCTION TO GET OR CREATE LABEL
async function getOrCreateLabelId(gmail, labelName) {
  const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
  const existingLabel = labelsResponse.data.labels.find(label => label.name === labelName);
  if (existingLabel) return existingLabel.id;

  const newLabel = await gmail.users.labels.create({
    userId: 'me',
    requestBody: { name: labelName, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
  });
  console.log(`Created new label '${labelName}' with ID ${newLabel.data.id}`);
  return newLabel.data.id;
}

// START THE APP
autoReply();
