const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();
const request = require('request'); 

const ds = require('./datastore');
const datastore = ds.datastore;

router.use(bodyParser.json());

const USERS = "Users";

var exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({ defaultLayout: 'main' })); 
app.set('view engine', 'handlebars'); 

//Using express handlebars to render pages
//Installed package by running npm install express-handlebars --save 
//https://github.com/ericf/express-handlebars
//var exphbs = require('express-handlebars');
//app.engine('handlebars', exphbs({ defaultLayout: 'main' })); 
//app.set('view engine', 'handlebars');

const clientId = '417993649089-knprd2tgs8e4te927hv66v6v9ej1vc6h.apps.googleusercontent.com'; 
const secret = 'a-Rl4As7VyLvFIXaK8H_-iaY';
var accessToken = ''; 
var tokenType = ''; 

var fname = ''; 
var lname = ''; 
var email = '';

function post_user(fname, lname, email){
    var key = datastore.key(USERS);
    console.log(key); 
	const new_user = {
    "First Name": fname, 
    "Last Name": lname, 
    "email": email
    };
	return datastore.save({"key":key, "data":new_user}).then(() => {return key});
} 

/* ------------- Begin Controller Functions ------------- */
app.get('/', function(req, res) {
    res.render('home');
});

app.get('/authorize', function (req, res) { 
    const redirectURL = 'https://accounts.google.com/o/oauth2/v2/auth?' + 'response_type=code&client_id=' + clientId + '&redirect_uri=https://wallerirfinalproject.appspot.com/oauth&scope=profile email'; 
    //console.log(redirectURL); 
    res.redirect(redirectURL);  
});  

//Retrieve authorization code
//Get access code to get data 
app.get('/oauth', function (req, res) {
    //console.log("State Var :" + state); 
    //console.log("Query Var :" + req.query.state);

//Checking for if the states equal each other
    const data = {
        code: req.query.code, 
        client_id: clientId, 
        client_secret: secret, 
        redirect_uri: 'https://wallerirfinalproject.appspot.com/oauth',
        grant_type: 'authorization_code'
    };  
    
    //POST Request
    //Manually pipe in information needed instead of storing in options
    //That code is below. 
    //Used the request function found here: https://github.com/request/request
    request({
       uri: "https://www.googleapis.com/oauth2/v4/token", 
       method: "POST", 
       json: true, 
       body: data
    }, function (error, response, body) {
        accessToken = body.access_token;
        tokenType = body.token_type;
        idToken = body.id_token; 
        console.log("access token: " + accessToken);
        console.log("token type: " + tokenType);
        console.log("id token: " + idToken); 

        //Get request to display targeted info to user
        request({
            uri: "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses", 
            method: "GET", 
            json: true, 
            headers: {
                'Authorization': `${tokenType} ${accessToken}`
            }
        }, function (error, response, body) {
            var content = {}; 
            //console.log(body.names[0].givenName);
            //console.log(body.names[0].familyName);
            //console.log(body.emailAddresses[0].value);
            content.firstName = body.names[0].givenName;
            content.lastName = body.names[0].familyName;
            content.email = body.emailAddresses[0].value;
            content.idValue = idToken; 
            //post_user(body.names[0].givenName, body.names[0].familyName, body.emailAddresses[0].value);
            fname = body.names[0].givenName;
            lname = body.names[0].familyName;
            email = body.emailAddresses[0].value;
            console.log(fname);
            console.log(lname);
            console.log(email);
            post_user(fname, lname, email);  
            res.render('displayData', content);   
        });

    });

});

module.exports = router;
module.exports = app; 