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
    { key: 'name', label: 'Name', type: 'text', required: true, unique: true },
    { key: 'country', label: 'Country', type: 'text' },
    { key: 'focal_height_meters', label: 'Focal height (m)', type: 'number' },
    { key: 'light_characteristic', label: 'Light characteristic', type: 'text' }
];

// * A rejected value belongs to one field, so HubSpot's validation errors are turned into a
// * message for that field. HubSpot names the property in the message, for example
// * "...propertyName=name, value=Test...", so nothing here is tied to a particular property.
const fieldErrorFrom = (details) => {
    if (typeof details.message !== 'string') {
        return null;
    }

    const match = details.message.match(/propertyName=([a-zA-Z0-9_]+)/);
    const column = match ? COLUMNS.find((candidate) => candidate.key === match[1]) : null;

    if (!column) {
        return null;
    }

    const message = details.message.includes('already has that value')
        ? 'Entry must be unique.'
        : 'HubSpot rejected this value.';

    return { [column.key]: message };
};

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
        res.status(500).render('error', {
            title: 'Something went wrong | Integrating With HubSpot I Practicum',
            message: 'The lighthouses could not be loaded from HubSpot.'
        });
    }
});

const FORM_TITLE = 'Update Custom Object Form | Integrating With HubSpot I Practicum';

// ROUTE 2 - Renders the form used to create a new Lighthouse record.
app.get('/update-cobj', (req, res) => {
    res.render('updates', {
        title: FORM_TITLE,
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

        const details = error.response ? error.response.data : {};

        // * HubSpot rejects the record itself when a value is invalid, for example when the
        // * unique Name property is already taken. That is the user's mistake rather than a
        // * server fault, so the form is shown again with an explanation and their input kept.
        if (details.category === 'VALIDATION_ERROR') {
            const fieldErrors = fieldErrorFrom(details);

            return res.status(400).render('updates', {
                title: FORM_TITLE,
                columns: COLUMNS,
                values: req.body,
                fieldErrors,
                // * Only fall back to a form-wide message when the offending field is unknown.
                error: fieldErrors ? null : 'HubSpot rejected these values. Please check the fields and try again.'
            });
        }

        res.status(500).render('error', {
            title: 'Something went wrong | Integrating With HubSpot I Practicum',
            message: 'The lighthouse could not be created in HubSpot.'
        });
    }
});

// * Localhost
app.listen(3000, () => console.log('Listening on http://localhost:3000'));