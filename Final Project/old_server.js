const express = require('express');
const app = express();

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const router = express.Router();
//const request = require('request');

const projectId = 'wallerirfinalproject';
const datastore = new Datastore();

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const BOATS = "Boats"; 
const CARGO = "Cargo"; 
const USERS = "Users"; 

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

const clientId = '417993649089-knprd2tgs8e4te927hv66v6v9ej1vc6h.apps.googleusercontent.com'; 
const secret = 'a-Rl4As7VyLvFIXaK8H_-iaY';
var accessToken = ''; 
var tokenType = ''; 

var fname = ''; 
var lname = ''; 
var email = '';
var self = '';  

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

//Function to pass Postman tests 
function stringifyExample(idValue, nameValue, typeValue, lengthValue, ownerValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "name": "' + nameValue + '",\n "type": "' + typeValue + '",\n "length": ' + lengthValue + ',\n "owner": "' + ownerValue + '",\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

function stringifyExample1(idValue, weightValue, contentValue, deliveryValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "weight": "' + weightValue + '",\n "content": "' + contentValue + '",\n "delivery date": "' + deliveryValue + '",\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length, owner){
    var key = datastore.key(BOATS);
	const new_boat = {
    "name": name, 
    "type": type, 
    "length": length, 
    "owner":owner,
    "loads": [], 
    "self": ""
    };
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

//Get boats that were created by a specific owner 
function get_boats(owner) {
    const q = datastore.createQuery(BOATS);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(fromDatastore).filter( item => item.owner === owner );
    }); 
}

//No credentials need to be provided/can be invalid credentials are provided according to assignment description
function get_boats_unprotected(req){
    var q = datastore.createQuery(BOATS).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(fromDatastore);
            if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		}); 
	/*const q = datastore.createQuery(BOATS);
	return datastore.runQuery(q).then( (entities) => {
			//return entities[0].map(fromDatastore).filter( item => item.owner === owner );
            return entities[0].map(fromDatastore);
            console.log("IN get boats function"); 
		});*/   
}

function get_boat(id, owner){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.get(key).then( (data) => {
            return fromDatastore(data[0]);
        }
    );
} 
function get_individual_boat(id){
    const key = datastore.key([BOATS, parseInt(id,10)]); 
    return datastore.get(key); 
}

function delete_boat(id){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.delete(key);
}  
/* ------------- End Boat Model Functions ------------- */

/* ------------- Begin Cargo Model Functions ------------- */
function post_cargo(weight, content, expected_delivery){
    var key = datastore.key(CARGO);
	const new_cargo = {
    "weight": weight, 
    "content": content, 
    "expected_delivery": expected_delivery, 
    "carrier": null,  
    "self": ""
    };
	return datastore.save({"key":key, "data":new_cargo}).then(() => {return key});
}

function get_cargo(req){
    var q = datastore.createQuery(CARGO).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        console.log(req.query);
        prev = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + req.query.cursor;
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            console.log(entities);
            results.items = entities[0].map(fromDatastore);
            if(entities[1].moreResults !== Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}
/* ------------- End Cargo Model Functions ------------- */

/* ------------- Begin User Model Functions ------------- */
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

function get_users(){
    console.log("In get users");
	const q = datastore.createQuery(USERS);
	return datastore.runQuery(q).then( (entities) => {
        console.log("In get users"); 
			return entities[0].map(fromDatastore);
		});
}
/* ------------- End User Model Functions ------------- */

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

/* ------------- Begin Boat Controller Functions ------------- */ 
router.get('/', function(req, res){
    const boats = get_boats_unprotected(req)
	.then( (boats) => {
        /*for (var i = 0; i<boats.items.length; i++) {
           boats.items[i].self =  req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id;  
        }*/ 
        res.status(200).json(boats);
    });
}); 

router.post('/', function(req, res){
    if(req.get('content-type') !== 'application/json'){
        res.status(406).send('Server only accepts application/json data.')
    }
    else { 
        post_boat(req.body.name, req.body.type, req.body.length, req.body.owner)
            .then( key => {
                //res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
                //boat.self = req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id;
                res.status(201).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol, req.get("host"), req.baseUrl));
            });
    }  
});
/* ------------- End Boat Controller Functions ------------- */ 

/* ------------- Begin Cargo Controller Functions ------------- */ 
router.get('/', function(req, res){
    const cargo = get_cargo()
	.then( (cargo) => {
        res.status(200).json(cargo);
    });
});

router.post('/', function(req, res){
    //console.log(req.body);
    if (req.body.weight == null || req.body.content == null || req.body.expected_delivery == null) {
        res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}')
    }
    else {
    post_cargo(req.body.weight, req.body.content, req.body.expected_delivery)
    .then( key => {
        res.status(201).send(stringifyExample1(key.id, req.body.weight, req.body.content, req.body.expected_delivery, req.protocol, req.get("host"), req.baseUrl));
        });
    }
});
/* ------------- End Cargo Controller Functions ------------- */ 

/* ------------- Begin User Controller Functions ------------- */
router.get('/', function(req, res){
    const user = get_users()
	.then( (user) => {
        res.status(200).json(user);
    });
});
/* ------------- End User Controller Functions ------------- */ 

app.use('/', router);
app.use('/boats', router);
app.use('/cargo', router); 
app.use('/users', router); 

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});