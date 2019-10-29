const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOAT = "Boat"; 
const LOAD = "Load"; 

const LODGING = "Lodging";
const GUEST = "Guest";

router.use(bodyParser.json());


//Function to pass Postman tests 
function stringifyExample(idValue, nameValue, typeValue, lengthValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "name": "' + nameValue + '",\n "type": "' + typeValue + '",\n "length": ' + lengthValue + ',\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

/*function stringifyExample1(protocolVal, hostVal){ 
    return '{ "self": "' + protocolVal  + '", ' + hostVal + '}'; 
}*/

/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length){
    var key = datastore.key(BOAT);
	const new_boat = {"name": name, 
    "type": type, 
    "length": length, 
    "loads": []
    };
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_boats(req){
    var q = datastore.createQuery(BOAT).limit(3);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.items = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + entities[1].endCursor;
            }
			return results;
		});
}  

function get_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]); 
    return datastore.get(key); 
}

//Get load from boats 
function get_boats_loads(req, id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.get(key)
    .then( (boats) => {
        const boat = boats[0];
        const load_keys = boat.loads.map( (g_id) => {
            return datastore.key([LOAD, parseInt(g_id,10)]);
        });
        return datastore.get(load_keys);
    })
    .then((loads) => {
        loads = loads[0].map(ds.fromDatastore);
        return loads;
    });
}

//Update boat function
function put_boat(id, name, type, length){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.update({"key":key, "data":boat}).then(() => {return key});
}

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
}

//Also implement this for putting loads on a boat 
function put_reservation(bid, cid){
    const b_key = datastore.key([BOAT, parseInt(bid,10)]);
    return datastore.get(b_key)
    .then( (boat) => {
        if( typeof(boat[0].loads) === 'undefined'){
            boat[0].loads = [];
        }
        boat[0].loads.push(cid);
        return datastore.save({"key":b_key, "data":boat[0]});
    });

}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.get('/', function(req, res){
    const boats = get_boats(req)
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

//stringifyExample(idValue, nameValue, typeValue, lengthValue, protocolVal, hostVal, baseVal)
router.get('/:boat_id', function(req, res) {
    const boat = get_boat(req.params.boat_id)
    .then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            res.status(200).type('json').send(stringifyExample(req.params.boat_id, boat[0].name, boat[0].type, boat[0].length, req.protocol, req.get("host"), req.baseUrl));
            //res.status(200).json(boat);  
        }
    })
});

//Function to get cargo from boats
//Still need to get this to work 
router.get('/:boat_id/loads', function(req, res){
    const boats = get_boats_loads(req, req.params.boat_id)
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.post('/', function(req, res){
    if (req.body.name == null || req.body.type == null || req.body.length == null) {
        res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}')
    }
    else {
        post_boat(req.body.name, req.body.type, req.body.length)
        .then( key => {
            res.status(201).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol, req.get("host"), req.baseUrl));
            //console.log(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol, req.get("host"), req.baseUrl)); 
        })
    }
});

router.put('/:boat_id', function(req,res) {
    const boat = get_boat(req.params.boat_id)
    .then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        } else if (req.body.name == null || req.body.type == null || req.body.length == null) {
           res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}') 
        } else {
            put_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length)
            res.status(200).json(boat); 
        }
    });
}); 

//Implement this function with putting loads on the boat 
router.put('/:bid/loads/:cid', function(req, res){
    put_reservation(req.params.bid, req.params.cid)
    .then(res.status(200).end());
});


//When we delete a boat we need to unload the load on the boat 
router.delete('/:boat_id', function(req, res){
    const boat = get_boat(req.params.boat_id)
	.then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            delete_boat(req.params.id).then(res.status(204).end());  
        }    
    });
});

/* ------------- End Boat Controller Functions ------------- */

module.exports = router;