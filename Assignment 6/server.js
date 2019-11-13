const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const router = express.Router();
const request = require('request');  

//Using express handlebars to render pages
//Installed package by running npm install express-handlebars --save 
//https://github.com/ericf/express-handlebars
var exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({ defaultLayout: 'main' })); 
app.set('view engine', 'handlebars'); 

app.use(bodyParser.json());

const clientId = '579152520097-tbgmcv9h7b30f54s3qv8t5g3qi75mur0.apps.googleusercontent.com'; 
const secret = 'xV7MIeD6Cj0OTv11n3JffeCA';
var state = ''; 
var accessToken = ''; 
var tokenType = ''; 

//Function to create random state variable
//Found at resource https://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
function makeState(length) {
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      state += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return state;
}

app.get('/', function (req, res)  {
  //res.send('Hello from App Engine!');
  res.render('home');  
});

//oauth page will construct a redirect URL according to source below
//https://developers.google.com/identity/protocols/OAuth2WebServer
//Also using lecture OAuth 2.0 Flow Example to follow proper structure for requests
app.get('/authorize', function (req, res) {
    state = ''; 
    state = makeState(10); 
    const redirectURL = 'https://accounts.google.com/o/oauth2/v2/auth?' + 'response_type=code&client_id=' + clientId + '&redirect_uri=https://wallerirassignment6.appspot.com/oauth&scope=profile email&state=' + state; 
    //console.log(redirectURL); 
    res.redirect(redirectURL);  
}); 

//Retrieve authorization code
//Get access code to get data 
app.get('/oauth', function (req, res) {
    console.log("State Var :" + state); 
    console.log("Query Var :" + req.query.state);

//Checking for if the states equal each other
if (req.query.state == state) {
    const data = {
        code: req.query.code, 
        client_id: clientId, 
        client_secret: secret, 
        redirect_uri: 'https://wallerirassignment6.appspot.com/oauth',
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
        console.log("access token: " + accessToken);
        console.log("token type: " + tokenType);

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
            //content.email = body.emailAddresses[0].value;
            content.scopeVar = req.query.state;
            res.render('displayData', content);   
        });

    });
} else {
    res.status(500).send("States don't match"); 
}

}); 

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

//Previous implementation that threw the error invalid_grant_type
    /*if (req.query.state == state) {
        const options = {
            method: 'POST',
            url: 'https://www.googleapis.com/oauth2/v4/token', 
            data: JSON.stringify({
                'code': req.query.code, 
                'client_id': clientId, 
                'client_secret': secret, 
                'redirect_uri': 'https://wallerirassignment6.appspot.com/oauth', 
                'grant_type': 'authorization_code'    
            }) 
        };
        request(options, function(error, response, body) {
            if (error) {
                res.status(500).send("Some error occured"); 
            } else { 
                console.log(body); 
                res.redirect('/confirm'); 
            }
        });   
    } else {
        console.log("States wrong");
        res.status(500).send("Something is up with these damn states"); 
    }*/ 

        //professor suggestion
        /*const postData = 'code=' + req.query.code
           + '&client_id=' + clientId
           + '&client_secret=' + secret
           + '&redirect_uri= https://wallerirassignment6.appspot.com/oauth'
           + '&grant_type=authorization_code';*/ 
                       //data: postData, 
            /*headers: {
               //'Accept': 'application/json',
               //'Content-Type': 'application/json'
               'Content-Type': 'application/x-www-form-urlencoded', 
               //'Content-Length': postData.length
            } */
