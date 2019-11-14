const express = require('express');
const app = express();

const json2html = require('json-to-html');

const Datastore = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const request = require('request');

const projectId = 'wallerirassignment7';
const datastore = new Datastore();
//const datastore = new Datastore({projectId:projectId});

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

const LODGING = "Lodging";

const router = express.Router();
const login = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

const checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `https://osu-cs493.auth0.com/.well-known/jwks.json`
    }),
  
    // Validate the audience and the issuer.
    issuer: `https://osu-cs493.auth0.com/`,
    algorithms: ['RS256']
  });

/* ------------- Begin Lodging Model Functions ------------- */
function post_lodging(name, description, price, owner){
    var key = datastore.key(LODGING);
	const new_lodging = {"name": name, "description": description, "price": price, "owner":owner};
	return datastore.save({"key":key, "data":new_lodging}).then(() => {return key});
}

function get_lodgings(owner){
	const q = datastore.createQuery(LODGING);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore).filter( item => item.owner === owner );
		});
}

function get_lodgings_unprotected(){
	const q = datastore.createQuery(LODGING);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
		});
}

function get_lodging(id, owner){
    const key = datastore.key([LODGING, parseInt(id,10)]);
    return datastore.get(key).then( (data) => {
            return fromDatastore(data[0]);
        }
    );
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', checkJwt, function(req, res){
    const lodgings = get_lodgings(req.user.name)
	.then( (lodgings) => {
        res.status(200).json(lodgings);
    });
});

router.get('/unsecure', function(req, res){
    const lodgings = get_lodgings_unprotected()
	.then( (lodgings) => {
        res.status(200).json(lodgings);
    });
});

router.get('/:id', checkJwt, function(req, res){
    const lodgings = get_lodging(req.params.id)
	.then( (lodging) => {
        const accepts = req.accepts(['application/json', 'text/html']);
        if(lodging.owner && lodging.owner !== req.user.name){
            res.status(403).send('Forbidden');
        } else if(!accepts){
            res.status(406).send('Not Acceptable');
        } else if(accepts === 'application/json'){
            res.status(200).json(lodging);
        } else if(accepts === 'text/html'){
            res.status(200).send(json2html(lodging).slice(1,-1));
        } else { res.status(500).send('Content type got messed up!'); }
    });
});

router.post('/', checkJwt, function(req, res){
    if(req.get('content-type') !== 'application/json'){
        res.status(415).send('Server only accepts application/json data.')
    }
    post_lodging(req.body.name, req.body.description, req.body.price, req.user.name)
    .then( key => {
        res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
        res.status(201).send('{ "id": ' + key.id + ' }')
    } );
});

login.post('/', function(req, res){
    const username = req.body.username;
    const password = req.body.password;
    var options = { method: 'POST',
    url: 'https://osu-cs493.auth0.com/oauth/token',
    headers: { 'content-type': 'application/json' },
    body:
     { grant_type: 'password',
       username: username,
       password: password,
       client_id: 'YOUR_CLINET_ID',
       client_secret: 'YOUR_CLIENT_SECRET' },
    json: true };
    request(options, (error, response, body) => {
        if (error){
            res.status(500).send(error);
        } else {
            res.send(body);
        }
    });

});

/* ------------- End Controller Functions ------------- */

app.use('/lodgings', router);
app.use('/login', login);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});