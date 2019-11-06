const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;
const json2html = require('json-to-html');
const Joi = require('@hapi/joi'); 

const BOAT = "Boat"; 

router.use(bodyParser.json());


//Function to pass Postman tests 
function stringifyExample(idValue, nameValue, typeValue, lengthValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "name": "' + nameValue + '",\n "type": "' + typeValue + '",\n "length": ' + lengthValue + ',\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

/*function stringifyExample1(protocolVal, hostVal){ 
    return '{ "self": "' + protocolVal  + '", ' + hostVal + '}'; 
}*/

//Function to check if we were not passed in a name, type, length
//From the URL: https://stackoverflow.com/questions/47502236/check-many-req-body-values-nodejs-api 
// checks to see if all props in the list are available and non-null
// list can either be an array or a | separated string
function checkProps(obj, list) {
    if (typeof list === "string") {
        list = list.split("|");
    }
    for (prop of list) {
        let val = obj[prop];
        if (val === null || val === undefined) {
            return false;
        }
    }
    return true;
}

//Define a schema to validate data
//Used the following resources to use Joi Data Validation
//https://hapi.dev/family/joi/?v=16.1.7
//https://blog.softwaremill.com/javascript-data-validation-with-joi-99cdffb5dd57
const alphaNum = Joi.string().alphanum(); 
const integer = Joi.number().integer(); 
const nameSchema = alphaNum.min(5).max(30);  
const typeSchema = alphaNum.min(5).max(30);
const lengthSchema = integer.min(1).max(1000);

const schema = Joi.object().keys({
    name: nameSchema.required(),
    type: typeSchema.required(), 
    length: lengthSchema.required()
});

const editSchema = Joi.object().keys({
    name: nameSchema, 
    type: typeSchema, 
    length: lengthSchema
}).or('name', 'type', 'length');  

/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length){
    var key = datastore.key(BOAT);
	const new_boat = {"name": name, 
    "type": type, 
    "length": length
    };
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_boats(){
	const q = datastore.createQuery(BOAT);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(ds.fromDatastore);
		});
}

function get_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]); 
    return datastore.get(key); 
}

//Update boat function
function put_boat(id, name, type, length){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.save({"key":key, "data":boat}).then(() => {return key});
}

function patch_boat(id, name, type, length){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.save({"key":key, "data":boat}).then(() => {return key});
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

//Optional get all boats for this assignment
router.get('/', function(req, res){
    const boats = get_boats()
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

//Found the try/catch method with the URL below
//https://reactjs.org/docs/error-boundaries.html
//This will allow me to still get 404 errors as before
router.get('/:boat_id', function(req, res) {
    const boat = get_boat(req.params.boat_id)
    .then( (boat) => {
        const accepts = req.accepts(['application/json', 'text/html']);
        if(!accepts){
            res.status(406).send('Not Acceptable');
        }
        else if (accepts === 'application/json'){
            try {
                res.status(200).type('json').send(stringifyExample(req.params.boat_id, boat[0].name, boat[0].type, boat[0].length, req.protocol, req.get("host"), req.baseUrl)); 
            } catch {
                res.status(404).json({"Error": "No boat with this boat_id exists"});
            }
        }
        else if (accepts === 'text/html'){
            //res.status(200).type('json').send(json2html(stringifyExample(req.params.boat_id, boat[0].name, boat[0].type, boat[0].length, req.protocol, req.get("host"), req.baseUrl)).slice(1,-1));
            res.status(200).send(json2html(boat).slice(1,-1));
        } 
        else { res.status(500).send('Content type got messed up!'); }
    }); 
});

router.post('/', function(req, res){
    if(req.get('content-type') !== 'application/json'){
        res.status(406).send('Server only accepts application/json data.')
    }
    else { 
    schema.validateAsync(req.body, {abortEarly: false})
        .then(validatedUser => {
            post_boat(req.body.name, req.body.type, req.body.length)
                .then( key => {
                    res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
                    res.status(201).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol, req.get("host"), req.baseUrl));
                });
        }) 
        .catch(validationError => {
            res.status(400).send('Invalid Request').end(); 
        }) 
    }  
}); 

router.delete('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).send('Not allowed to delete all boats').end();
});

router.put('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).send('Not allowed to edit (put) all boats').end();
});

//Able to use skeleton code from lecture
//Had the res.location in post but we need to use that here in our put function
router.put('/:boat_id', function(req,res) {
    if (!checkProps(req.body, "name|type|length")) {
        res.status(400).send('Missing required attributes').end();
    }
    else {
    const boat = get_boat(req.params.boat_id)    
    .then( (boat) => {
        put_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length)
        .then( (key) => {
            res.location(req.protocol + "://" + req.get('host') + req.baseUrl + '/' + key.id);
            res.status(303).send('Location Header Updated').end(); 
        }); 
    });
    }
});

router.patch('/:boat_id', function(req,res) {
    if (!checkProps(req.body, "name")) {
        const boat = get_boat(req.params.boat_id)
        .then( (boat) => {
            try {
                patch_boat(req.params.boat_id, boat[0].name, req.body.type, req.body.length)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('Something went wrong with the data').end();
            }
        }); 
    }
    else if (!checkProps(req.body, "type")) {
        const boat = get_boat(req.params.boat_id)
        .then( (boat) => {
            try {
                patch_boat(req.params.boat_id, req.body.name, boat[0].type, req.body.length)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('Something went wrong with the data').end();
            }
        }); 
    }
    else if (!checkProps(req.body, "length")) {
        const boat = get_boat(req.params.boat_id)
        .then( (boat) => {
            try {
                patch_boat(req.params.boat_id, req.body.name, req.body.type, boat[0].length)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('Something went wrong with the data').end();
            }
        }); 
    }
    else {
        const boat = get_boat(req.params.boat_id)
        .then( (boat) => {
            try {
                patch_boat(req.params.boat_id, req.body.name, req.body.type, boat[0].length)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('No boat with this id exsits').end();
            }
        });
    }     
});

/* Tried to implement Joi data validation on PATCH
router.patch('/:boat_id', function(req,res) {
    const boat = get_boat(req.params.boat_id)
    editSchema.validateAsync(req.body, {abortEarly: false})
        .then(validatedChanges => {
            const boatID = req.params.id;  
            patch_boat(boatID, req.body.name, req.body.type, req.body.length)
                .then( key => {
                    res.status(200).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol, req.get("host"), req.baseUrl));
                }); 
        })
        .catch(validationError => {
            res.status(400).send('Something went wrong'); 
        })
}); */ 

router.delete('/:boat_id', function(req, res){
    delete_boat(req.params.boat_id).then(res.status(204).end())
}); 

/* ------------- End Boat Controller Functions ------------- */

module.exports = router;