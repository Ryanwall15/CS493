const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const app = express();

const ds = require('./datastore');

const datastore = ds.datastore;

router.use(bodyParser.json());

const USERS = "Users";
const BOATS = "Boats";

const jwt = require('express-jwt');
const jwksRsa = require('jwks-rsa');

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

/* ------------- Begin User Model Functions ------------- */
function get_users(){
    //console.log("In get users");
	const q = datastore.createQuery(USERS);
	return datastore.runQuery(q).then( (entities) => {
        //console.log("In get users"); 
			return entities[0].map(ds.fromDatastore);
		});
}

//Get boats that were created by a specific owner 
function get_boats(owner) {
    const q = datastore.createQuery(BOATS);
    return datastore.runQuery(q).then( (entities) => {
        return entities[0].map(ds.fromDatastore).filter( item => item.owner === owner );
    }); 
}

function get_individual_user(id){
    const key = datastore.key([USERS, parseInt(id,10)]); 
    return datastore.get(key); 
}
/* ------------- End User Model Functions ------------- */

/* ------------- Begin User Controller Functions ------------- */
router.get('/', function(req, res){
    const user = get_users()
	.then( (user) => {
        res.status(200).json(user);
    });
});

router.get('/:user_id', function(req, res){
    const user = get_individual_user(req.params.id)
	.then( (user) => {
        if (user[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            //res.status(200).type('json').send(stringifyExample1(req.params.boat_id, boat[0].name, boat[0].type, boat[0].length, req.protocol, req.get("host"), req.baseUrl));
            res.status(200).json(user);  
        }
    })
});

router.get('/:user_id/boats', checkJwt, function(req, res){
    if(!checkJwt) {
        console.log(req.user.sub);
        res.status(401).end(); 
    } else {
    console.log(req.user.sub);        
    const boats = get_boats(req.user.sub) 
	.then( (boats) => {
        res.status(200).json(boats);
    });
    }
}); 
/* ------------- End User Controller Functions ------------- */ 

module.exports = router;