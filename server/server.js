const fs = require('fs');
const path = require('path');

const fastify = require('fastify')({logger: true});
const cors = require('@fastify/cors');
const process = require('process');
const { authenticate } = require('@google-cloud/local-auth');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

const TOKEN_PATH = path.join(__dirname, 'token.json');
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

const calendarUtils = require('./utils/calendar-middleware');

// Get Environment Variables

require('dotenv').config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }
  
  /**
   * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
   *
   * @param {OAuth2Client} client
   * @return {Promise<void>}
   */
  async function saveCredentials(client) {
    const content = await fs.readFileSync(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFileSync(TOKEN_PATH, payload)
  }
  
  /**
   * Load or request or authorization to call APIs.
   *
   */
  async function authorize() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
    client = await authenticate({
      scopes: SCOPES,
      keyfilePath: CREDENTIALS_PATH,
    });
    if (client.credentials) {
      await saveCredentials(client);
    }
    return client;
  }



// connect fastify to mongodb

fastify.register(require('@fastify/mongodb'), {
    url: 'mongodb://localhost:27017/classroom-calendar'
});

// add routes
fastify.register(require('./routes/events'));
fastify.register(cors, {
    origin: '*'
});

// start the server
const start = async () => {
    try {
        const auth = await authorize();
        const calId = await calendarUtils.getClassroomCalendar(auth);
        fastify.decorate('auth', auth);
        fastify.decorate('calId', calId);
        await fastify.listen({
            port: PORT,
            host: HOST
        });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

start();



