require('dotenv').config();

const express = require('express');
const axios = require('axios');
const app = express();

app.set('view engine', 'pug');
app.use(express.static(__dirname + '/public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// * Please DO NOT INCLUDE the private app access token in your repo. Don't do this practicum in your normal account.
// * Both values are read from .env, which is listed in .gitignore. See env.example for the expected keys.
const PRIVATE_APP_ACCESS = process.env.PRIVATE_APP_ACCESS;
const CUSTOM_OBJECT_TYPE = process.env.CUSTOM_OBJECT_TYPE;

if (!PRIVATE_APP_ACCESS || !CUSTOM_OBJECT_TYPE) {
    console.warn('Missing PRIVATE_APP_ACCESS or CUSTOM_OBJECT_TYPE. Copy env.example to .env and fill both in.');
}

// * Optional override. Falls back to the public HubSpot API host when HUBSPOT_API is not set.
const HUBSPOT_API = process.env.HUBSPOT_API || 'https://api.hubapi.com';

const HUBSPOT_HEADERS = {
    Authorization: `Bearer ${PRIVATE_APP_ACCESS}`,
    'Content-Type': 'application/json'
};

// * HubSpot names the offending property in the JSON error body, so log it in full.
const logApiError = (message, error) => {
    const details = error.response ? error.response.data : error.message;
    console.error(message, typeof details === 'string' ? details : JSON.stringify(details, null, 2));
};

// * The Lighthouse custom properties, defined once. The form fields, the properties sent to
// * HubSpot and the homepage table columns are all derived from this list, so an internal
// * property name is only ever written in one place.
const COLUMNS = [
    { key: 'name', label: 'Name', type: 'text' },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'focal_height_meters', label: 'Focal height (m)', type: 'number' },
    { key: 'light_characteristic', label: 'Light characteristic', type: 'text' }
];

// ROUTE 1 - Homepage. Reads the Lighthouse records and renders them as a table.
app.get('/', async (req, res) => {
    const lighthouses = `${HUBSPOT_API}/crm/v3/objects/${CUSTOM_OBJECT_TYPE}`;

    // * The custom properties have to be requested explicitly, otherwise HubSpot only
    // * returns its own default set of properties for each record.
    const params = {
        limit: 100,
        properties: COLUMNS.map((column) => column.key).join(',')
    };

    try {
        const resp = await axios.get(lighthouses, { headers: HUBSPOT_HEADERS, params });

        res.render('homepage', {
            title: 'Lighthouses | Integrating With HubSpot I Practicum',
            columns: COLUMNS,
            data: resp.data.results
        });
    } catch (error) {
        logApiError('Could not fetch the lighthouses:', error);
        res.status(500).send('Could not load the lighthouses from HubSpot. Check the server log for details.');
    }
});

// ROUTE 2 - Renders the form used to create a new Lighthouse record.
app.get('/update-cobj', (req, res) => {
    res.render('updates', {
        title: 'Update Custom Object Form | Integrating With HubSpot I Practicum',
        columns: COLUMNS
    });
});

// ROUTE 3 - Creates a new Lighthouse record from the submitted form data, then redirects home.
app.post('/update-cobj', async (req, res) => {
    const properties = {};

    for (const column of COLUMNS) {
        const value = (req.body[column.key] || '').trim();

        // Blank fields are left out of the payload so the number property is never sent an empty string.
        if (value !== '') {
            properties[column.key] = value;
        }
    }

    const createLighthouse = `${HUBSPOT_API}/crm/v3/objects/${CUSTOM_OBJECT_TYPE}`;

    try {
        await axios.post(createLighthouse, { properties }, { headers: HUBSPOT_HEADERS });
        res.redirect('/');
    } catch (error) {
        logApiError('Could not create the lighthouse:', error);
        res.status(500).send('Could not create the lighthouse in HubSpot. Check the server log for details.');
    }
});

// * Localhost
app.listen(3000, () => console.log('Listening on http://localhost:3000'));