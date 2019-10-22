const express = require('express');
const app = express();

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');

const datastore = new Datastore();

const BOATS = "Boats"; 
const SLIPS = "Slips"; 

const router = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}


//function stringifyExample(idValue, lengthValue){ return '{ "id": "' + idValue  + '", "length": ' + lengthValue + '}'; }
/* Stringify Example given to us in Piazza Post. */ 
function stringifyExample(idValue, nameValue, typeValue, lengthValue) {
    return '{ "id": "' + idValue + '", "name": "' + nameValue + '", "type": "' + typeValue + '", "length": ' + lengthValue + '}';
}

function stringifyExample1(idValue, numberValue) {
    return '{ "id": "' + idValue + '", "number": "' + numberValue + '" }'; 
}

/* ------------- Begin Boat Model Functions ------------- */
//These Functions interatct with our Database that we currently have setup
//This code was provided in Week 3 Lecture, modified as needed
//Some functions need to catch errors according to assignment description.

//Function that will create a new boat in the database  
function post_boats(name, type, length){
    var key = datastore.key(BOATS); 
    const new_boats = {"name": name, "type": type, "length": length}; 
    return datastore.save({"key":key, "data":new_boats}).then(() => {return key}); 
}

//Function that will get the list of all boats
function get_boats(){
	const q = datastore.createQuery(BOATS);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
		});
}

//Will get a single boat based on ID
function get_boat(id){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.get(key); 
}

//Update function for boats
//Postman has us using patch instead of put
function patch_boats(id, name, type, length){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    const boats = {"name": name, "type": type, "length": length};
    return datastore.update({"key":key, "data":boats}).then(() => {return key});
}

//Delete a boat given its ID
function delete_boats(id){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Slip Model Functions ------ */
function post_slip(number){
    var key = datastore.key(SLIPS); 
    const new_slip = {"number": number, "current_boat": null, "arrival_date": null}; 
    return datastore.save({"key":key, "data":new_slip}).then(() => {return key}); 
}

function get_slips(){
	const q = datastore.createQuery(SLIPS);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
		});
}

function get_slip(id){
    const key = datastore.key([SLIPS, parseInt(id,10)]);
    return datastore.get(key); 
}

function delete_slip(id) {
    const key = datastore.key([SLIPS, parseInt(id,10)]);
    return datastore.delete(key);   
}

/* ------------- End Slip Model Functions -------- */

/* ------------- Begin Boat Controller Functions ------------- */
  
router.get('/boats', function(req, res){
    const boats = get_boats()
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.get('/boats/:id', function(req, res){
    const boat = get_boat(req.params.id)
	.then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            res.status(200).json(boat);  
        }    
    })
});

//We need to check if one of the fields is left blank. If it is throw an error(404)
router.post('/boats', function(req, res){
    if (req.body.name == null || req.body.type == null || req.body.length == null) {
        res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}')
    }
    else {
        post_boats(req.body.name, req.body.type, req.body.length)
        .then( key => {
            res.status(201).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length))
        })
        //.then(res.status(201).type('json').send(stringifyExample(req.body.name, req.body.type, req.body.length)))
    }
}); 

router.patch('/boats/:id', function(req, res){
    //put_boats(req.params.id, req.body.name, req.body.type, req.body.length)
    //.then(res.status(200).end());
    if (req.body.name == null || req.body.type == null || req.body.length == null) {
        res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}')
    }
    else {
        patch_boats(req.params.id, req.body.name, req.body.type, req.body.length)
        .then( key => {
            const boat = get_boat(key.id).then ( boat => {
                res.status(200).json(boat); 
            });
        });
    }
});

router.delete('/boats/:id', function(req, res){
    const boat = get_boat(req.params.id)
	.then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            delete_boats(req.params.id).then(res.status(204).end());  
        }    
    });
});
/* ------------- End Boat Controller Functions ------------- */


/* ------------- Begin Slip Controller Functions ------ */ 
router.get('/slips', function(req, res){
    const slips = get_slips()
	.then( (slips) => {
        res.status(200).json(slips);
    });
});

router.get('/slips/:id', function(req, res){
    const slip = get_slip(req.params.id)
	.then( (slip) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No slip with this slip_id exists"});
        }
        else {
            res.status(200).json(slip);  
        }    
    })
});

router.post('/slips', function(req, res){
    if (req.body.number == null ) {
        res.status(400).send('{"Error": "The request object is missing the required number"}')
    }
    else {
        post_slip(req.body.number)
        .then( key => {
            res.status(201).send(stringifyExample1(key.id, req.body.number))
        })
        //.then(res.status(201).type('json').send(stringifyExample(req.body.name, req.body.type, req.body.length)))
    }
}); 

router.delete('/slips/:id', function(req, res){
    const slip = get_slip(req.params.id)
	.then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No slip with this slip_id exists"});
        }
        else {
            delete_slip(req.params.id).then(res.status(204).end());  
        }    
    });
});
/* ------------- End Slip Controller Functions -------- */


/* ------------- End Controller Functions ------------- */

app.use('/', router); 

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});