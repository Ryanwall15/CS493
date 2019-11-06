const express = require('express');
const app = express();

const json2html = require('json-to-html');
const Joi = require('@hapi/joi'); 

app.enable('trust proxy'); 
app.use('/', require('./index'));

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});