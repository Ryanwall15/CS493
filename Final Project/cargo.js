const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const ds = require('./datastore');

const datastore = ds.datastore;

const CARGO = "Cargo";
const BOATS = "Boats";  

router.use(bodyParser.json());

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

function stringifyExample1(idValue, weightValue, contentValue, deliveryValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "weight": "' + weightValue + '",\n "content": "' + contentValue + '",\n "delivery date": "' + deliveryValue + '",\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

/* ------------- Begin Cargo Model Functions ------------- */
function post_cargo(weight, content, expected_delivery){
    var key = datastore.key(CARGO);
	const new_cargo = {
    "weight": weight, 
    "content": content, 
    "expected_delivery": expected_delivery, 
    "carrier": []
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
            results.items = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}

function get_cargo_unprotectedID(id){
    const key = datastore.key([CARGO, parseInt(id,10)]); 
    return datastore.get(key); 
}

function put_cargo(id, weight, content, expected_delivery, carrier) {
    const key = datastore.key([CARGO, parseInt(id,10)]);
    const cargo  = {"weight": weight,
    "content": content, 
    "expected_delivery": expected_delivery, 
    "carrier": carrier
    };
    return datastore.update({"key":key, "data":cargo}).then(() => {return key});
}

function patch_cargo(id, weight, content, expected_delivery, carrier) {
    const key = datastore.key([CARGO, parseInt(id,10)]);
    const cargo  = {"weight": weight,
    "content": content, 
    "expected_delivery": expected_delivery, 
    "carrier": carrier
    };
    return datastore.update({"key":key, "data":cargo}).then(() => {return key});
}

function delete_cargo(id){
    const key = datastore.key([CARGO, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Cargo Model Functions ------------- */ 

/* ------------- Begin Cargo Controller Functions ------------- */ 
router.get('/', function(req, res){
    const cargo = get_cargo(req)
	.then( (cargo) => {
        for (var i = 0; i<cargo.items.length; i++) {
           cargo.items[i].self =  req.protocol + "://" + req.get('host') + req.baseUrl + '/' + cargo.items[i].id;  
        }
        res.status(200).json(cargo);
    });
});

router.post('/', function(req, res){
    //console.log(req.body);
    if(req.get('content-type') !== 'application/json'){
        res.status(406).send('Server only accepts application/json data.')
    }
    else if (req.body.weight == null || req.body.content == null || req.body.expected_delivery == null) {
        res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}')
    }
    else {
    post_cargo(req.body.weight, req.body.content, req.body.expected_delivery)
    .then( key => {
        res.status(201).send(stringifyExample1(key.id, req.body.weight, req.body.content, req.body.expected_delivery, req.protocol, req.get("host"), req.baseUrl));
        });
    }
});

router.put('/:cargo_id', function(req,res) {
    if(req.get('content-type') !== 'application/json'){
        res.status(406).send('Server only accepts application/json data.')
    } else {
    const cargo = get_cargo_unprotectedID(req.params.cargo_id)
    .then( (cargo) => {
        if (cargo[0] == null) {
            res.status(404).json({"Error": "No cargo with this cargo_id exists"});
        } else if (req.body.weight == null || req.body.content == null || req.body.expected_delivery == null) {
           res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}') 
        } else {
            put_cargo(req.params.cargo_id, req.body.weight, req.body.content, req.body.expected_delivery, cargo[0].carrier)
            res.status(200).type('json').send(stringifyExample1(req.params.cargo_id, cargo[0].weight, cargo[0].content, cargo[0].expected_delivery, req.protocol, req.get("host"), req.baseUrl));
        }
    });
    }
});

router.patch('/:cargo_id', function(req,res) {
    if(req.get('content-type') !== 'application/json'){
        res.status(406).send('Server only accepts application/json data.')
    }
    else if (!checkProps(req.body, "weight")) {
        const cargo = get_cargo_unprotectedID(req.params.cargo_id)
        .then( (cargo) => { 
            try {
               patch_cargo(req.params.cargo_id, cargo[0].weight, req.body.content, req.body.expected_delivery, cargo[0].carrier)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('Something went wrong with the data').end();
            }
        }); 
    }
    else if (!checkProps(req.body, "content")) {
        const cargo = get_cargo_unprotectedID(req.params.cargo_id)
        .then( (cargo) => {
            try {
                patch_cargo(req.params.cargo_id, req.body.weight, cargo[0].content, req.body.expected_delivery, cargo[0].carrier)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('Something went wrong with the data').end();
            }
        }); 
    }
    else if (!checkProps(req.body, "expected_delivery")) {
        const cargo = get_cargo_unprotectedID(req.params.cargo_id)
        .then( (cargo) => {
            try {
                patch_cargo(req.params.cargo_id, req.body.weight, req.body.content, cargo[0].expected_delivery, cargo[0].carrier)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('Something went wrong with the data').end();
            }
        }); 
    }
    else {
        const cargo = get_cargo_unprotectedID(req.params.cargo_id)
        .then( (cargo) => {
            try {
                patch_cargo(req.params.cargo_id, req.body.weight, req.body.content, req.body.expected_delivery, cargo[0].carrier)
                .then(res.status(200).end()); 
            } catch {
                res.status(404).send('No boat with this id exsits').end();
            }
        });
    }     
});

router.delete('/:cargo_id', function(req, res){
    const cargo = get_cargo_unprotectedID(req.params.cargo_id)
	.then( (cargo) => {
        if (cargo[0] == null) {
            res.status(404).json({"Error": "No cargo with this cargo_id exists"});
        }
        else {
            delete_cargo(req.params.cargo_id).then(res.status(204).end());  
        }    
    });
});

router.delete('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).send('Not allowed to delete all cargo').end();
});

router.put('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).send('Not allowed to edit (put) all cargo').end();
});

/* ------------- End Cargo Controller Functions ------------- */

module.exports = router;