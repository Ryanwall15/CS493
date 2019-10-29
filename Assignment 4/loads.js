const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();

const ds = require('./datastore');

const datastore = ds.datastore;

const GUEST = "Guest";
const LOAD = "Load"; 

router.use(bodyParser.json());

function stringifyExample(idValue, weightValue, contentValue, deliveryValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "weight": "' + weightValue + '",\n "content": "' + contentValue + '",\n "delivery date": "' + deliveryValue + '",\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}
/* ------------- Begin Load Model Functions ------------- */
function post_load(weight, content, delivery_date){
    var key = datastore.key(LOAD);
	const new_load = {"weight": weight,
    "content": content,
    "carrier": [], 
    "delivery_date": delivery_date
    };
	return datastore.save({"key":key, "data":new_load}).then(() => {return key});
}

function get_loads(req){
    var q = datastore.createQuery(LOAD).limit(3);
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

function get_load(id){
    const key = datastore.key([LOAD, parseInt(id,10)]); 
    return datastore.get(key); 
}

function put_load(id, weight, content, delivery_date) {
    const key = datastore.key([LOAD, parseInt(id,10)]);
    const load  = {"weight": weight,
    "content": content, 
    "delivery_date": delivery_date
    };
    return datastore.update({"key":key, "data":load}).then(() => {return key});
}

function delete_load(id){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    return datastore.delete(key);
}

/* ------------- End Load Model Functions ------------- */

/* ------------- Begin Load Controller Functions ------------- */

router.get('/', function(req, res){
    const loads = get_loads(req)
	.then( (loads) => {
        res.status(200).json(loads);
    });
});

router.get('/:load_id', function(req, res) {
    const load = get_load(req.params.load_id)
    .then( (load) => {
        if (load[0] == null) {
            res.status(404).json({"Error": "No load with this load_id exists"});
        }
        else {
            res.status(200).type('json').send(stringifyExample(req.params.load_id, load[0].weight, load[0].content, load[0].delivery_date, req.protocol, req.get("host"), req.baseUrl));
        }
    })
});

router.post('/', function(req, res){
    console.log(req.body);
    if (req.body.weight == null || req.body.content == null || req.body.delivery_date == null) {
        res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}')
    }
    else {
    post_load(req.body.weight, req.body.content, req.body.delivery_date)
    .then( key => {
        res.status(201).send(stringifyExample(key.id, req.body.weight, req.body.content, req.body.delivery_date, req.protocol, req.get("host"), req.baseUrl));
        });
    }
});

router.put('/:load_id', function(req,res) {
    const load = get_load(req.params.load_id)
    .then( (load) => {
        if (load[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        } else if (req.body.weight == null || req.body.content == null || req.body.delivery_date == null) {
           res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}') 
        } else {
            put_load(req.params.load_id, req.body.weight, req.body.content, req.body.delivery_date)
            res.status(200).type('json').send(stringifyExample(req.params.load_id, load[0].weight, load[0].content, load[0].delivery_date, req.protocol, req.get("host"), req.baseUrl));
        }
    });
});

router.delete('/:load_id', function(req, res){
    delete_load(req.params.load_id).then(res.status(200).end())
});

/* ------------- End Load Controller Functions ------------- */

module.exports = router;