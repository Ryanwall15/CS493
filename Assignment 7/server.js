const express = require('express');
const app = express();

const json2html = require('json-to-html');

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const router = express.Router();
const request = require('request'); 

const projectId = 'wallerirassignment7';
const datastore = new Datastore();

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const BOAT = "Boat";

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

//Using express handlebars to render pages
//Installed package by running npm install express-handlebars --save 
//https://github.com/ericf/express-handlebars
var exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({ defaultLayout: 'main' })); 
app.set('view engine', 'handlebars'); 

app.use(bodyParser.json());
app.enable('trust proxy');

const clientId = '920369479438-a30615qmkgnakftjvbe9nm68qqr3pht1.apps.googleusercontent.com'; 
const secret = 'n6ZOIQmSSmWrxcwaol8yncOV';
var state = ''; 
var accessToken = ''; 
var tokenType = ''; 

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: 'https://www.googleapis.com/oauth2/v3/certs'
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://accounts.google.com`,
    algorithms: ['RS256']
}); 

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

//Function to pass Postman tests 
function stringifyExample(idValue, nameValue, typeValue, lengthValue, ownerValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "name": "' + nameValue + '",\n "type": "' + typeValue + '",\n "length": ' + lengthValue + ',\n "owner": "' + ownerValue + '",\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length, owner){
    var key = datastore.key(BOAT);
	const new_boat = {
    "name": name, 
    "type": type, 
    "length": length, 
    "owner":owner
    };
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

//Get boats that were created by a specific owner 
function get_boats(owner) {
    const q = datastore.createQuery(BOAT);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore).filter( item => item.owner === owner );
    }); 
}

//No credentials need to be provided/can be invalid credentials are provided according to assignment description
function get_boats_unprotected(){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			//return entities[0].map(fromDatastore).filter( item => item.owner === owner );
            return entities[0].map(fromDatastore);
		});
}

function get_boat(id, owner){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.get(key).then( (data) => {
            return fromDatastore(data[0]);
        }
    );
} 
function get_individual_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]); 
    return datastore.get(key); 
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Boat Model Functions ------------- */

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
    const redirectURL = 'https://accounts.google.com/o/oauth2/v2/auth?' + 'response_type=code&client_id=' + clientId + '&redirect_uri=https://wallerirassignment7.appspot.com/oauth&scope=profile email&state=' + state; 
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
        redirect_uri: 'https://wallerirassignment7.appspot.com/oauth',
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
            content.idValue = idToken; 
            //content.email = body.emailAddresses[0].value;
            //content.scopeVar = req.query.state;
            res.render('displayData', content);   
        });

    });

}); 

/* ------------- Begin Controller Functions ------------- */

router.get('/', function(req, res){
    const boats = get_boats_unprotected()
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.get('/:user_id/boats', checkJwt, function(req, res){
    if(!checkJwt) {
        res.status(401).end(); 
    } else {
    const boats = get_boats(req.user.sub)
	.then( (boats) => {
        res.status(200).json(boats);
    });
    }
}); 

router.post('/', checkJwt, function(req, res){
    if(req.get('content-type') !== 'application/json'){
        res.status(415).send('Server only accepts application/json data.')
    }
    else if(!checkJwt) {
        res.status(401).end(); 
    }
    else {
    post_boat(req.body.name, req.body.type, req.body.length, req.user.sub)
    //req.user.name
    .then( key => {
        //res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
        res.status(201).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.user.sub, req.protocol, req.get("host"), req.baseUrl));
    } );
    }  
});

router.delete('/:boat_id', checkJwt, function(req, res){
    if(!checkJwt) {
        res.status(401).send('Missing/Invalid Jwt'); 
    } else { 
    const boat = get_individual_boat(req.params.boat_id)
    .then( (boat) => {
        //console.log(req.user.sub); 
        //console.log(boat[0].owner); 
        console.log(boat[0]); 
        if(boat[0] == null) {
            res.status(403).send('No boat with this boat_id exists').end();
        }
        else if (boat[0].owner && boat[0].owner !== req.user.sub) {
            res.status(403).send('Boat is owned by another person'); 
        }  
        else {
        delete_boat(req.params.boat_id).then(res.status(204).end())
        }
    });
    }
});

/* router.get('/:user_id', checkJwt, function(req, res){
    const boats = get_boat(req.params.user_id)
	.then( (boat) => {
        const accepts = req.accepts(['application/json', 'text/html']);
        if(boat.owner && boat.owner !== req.user.name){
            res.status(403).send('Forbidden');
        } else if(!accepts){
            res.status(406).send('Not Acceptable');
        } else if(accepts === 'application/json'){
            res.status(200).json(boat);
        } else if(accepts === 'text/html'){
            res.status(200).send(json2html(boat).slice(1,-1));
        } else { res.status(500).send('Content type got messed up!'); }
    });
});*/ 

/* ------------- End Controller Functions ------------- */ 
app.use('/', router);
app.use('/boats', router); 

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});

