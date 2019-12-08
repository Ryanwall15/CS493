const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const ds = require('./datastore');

const datastore = ds.datastore;

const CARGO = "Cargo"; 

router.use(bodyParser.json());

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

function put_cargo(id, weight, content, expected_delivery) {
    const key = datastore.key([CARGO, parseInt(id,10)]);
    const cargo  = {"weight": weight,
    "content": content, 
    "expected_delivery": expected_delivery
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

router.delete('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).send('Not allowed to delete all cargo').end();
});

router.put('/', function (req, res){
    res.set('Accept', 'GET, POST');
    res.status(405).send('Not allowed to edit (put) all cargo').end();
});

router.put('/:cargo_id', function(req,res) {
    const cargo = get_cargo_unprotectedID(req.params.cargo_id)
    .then( (cargo) => {
        if (cargo[0] == null) {
            res.status(404).json({"Error": "No cargo with this cargo_id exists"});
        } else if (req.body.weight == null || req.body.content == null || req.body.expected_delivery == null) {
           res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}') 
        } else {
            put_cargo(req.params.cargo_id, req.body.weight, req.body.content, req.body.expected_delivery)
            res.status(200).type('json').send(stringifyExample(req.params.cargo_id, cargo[0].weight, cargo[0].content, cargo[0].delivery_date, req.protocol, req.get("host"), req.baseUrl));
        }
    });
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

/* ------------- End Cargo Controller Functions ------------- */

module.exports = router;