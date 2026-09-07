# Integrating With HubSpot I: Foundations Practicum

An Express + Pug application that lists and creates records of a **Lighthouses** custom object in a HubSpot developer test account through the HubSpot CRM API.

To read the full directions, please go to the [practicum instructions](https://app.hubspot.com/academy/l/tracks/1092124/1093824/5493?language=en).

**Put your HubSpot developer test account custom objects URL link here:** https://app.hubspot.com/contacts/149256684/objects/2-252868179/views/all/list

___

## The custom object

`Lighthouses` is a custom object created in the developer test account and associated with the Contacts object type. It has four properties:

| Property | Internal name | Type |
| --- | --- | --- |
| Name | `name` | Single-line text (primary display property) |
| Country | `country` | Single-line text |
| Focal Height Meters | `focal_height_meters` | Number |
| Light Characteristic | `light_characteristic` | Single-line text |

`Light Characteristic` holds standard nautical chart notation, for example `Fl (2) W 10s` - two white flashes every ten seconds.

## Routes

| Method | Route | Purpose | Template |
| --- | --- | --- | --- |
| `GET` | `/` | Reads the Lighthouse records and renders them in a table | `views/homepage.pug` |
| `GET` | `/update-cobj` | Renders the form used to create a new record | `views/updates.pug` |
| `POST` | `/update-cobj` | Creates the record in HubSpot, then redirects to `/` | - |

If a HubSpot request fails, the route logs the full JSON error response to the server console and renders `views/error.pug` with a 500 status.

## Running locally

1. Install the dependencies:

   ```
   npm install
   ```

2. Create a private app in the developer test account with the `crm.schemas.custom`, `crm.objects.custom` and `crm.objects.contacts` scopes (read and write), then copy its access token.

3. Copy `env.example` to `.env` and fill in both values:

   ```
   PRIVATE_APP_ACCESS=your-private-app-access-token
   CUSTOM_OBJECT_TYPE=2-252868179
   ```

   `.env` is listed in `.gitignore`, so the access token is never committed to this repository.

4. Start the server:

   ```
   node index.js
   ```

5. Open http://localhost:3000.

## Implementation notes

- The four custom properties are declared once, in the `COLUMNS` array in `index.js`. The form fields, the properties requested from the API and the table columns are all derived from it, so an internal property name is only ever written in one place.
- The homepage request passes an explicit `properties` parameter. Without it HubSpot returns only its own default properties for each record.
- Blank form fields are left out of the create payload, so the number property is never sent an empty string.
- `HUBSPOT_API` can be overridden through the environment; it defaults to `https://api.hubapi.com`.

## Pre-requisites:
- Using [Node](https://nodejs.org/en/download) and node packages
- Using [Express](https://expressjs.com/en/starter/installing.html)
- Using [Axios](https://axios-http.com/docs/intro)
- Using [Pug templating system](https://pugjs.org/api/getting-started.html)
- Using the command line
- Using [Git and GitHub](https://product.hubspot.com/blog/git-and-github-tutorial-for-beginners)
