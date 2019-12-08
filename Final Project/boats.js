const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const ds = require('./datastore');

const datastore = ds.datastore;

const BOATS = "Boats"; 
const CARGO = "Cargo"; 

router.use(bodyParser.json());

//Function to pass Postman tests 
function stringifyExample(idValue, nameValue, typeValue, lengthValue, ownerValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "name": "' + nameValue + '",\n "type": "' + typeValue + '",\n "length": ' + lengthValue + ',\n "owner": "' + ownerValue + '",\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

function stringifyExample1(idValue, nameValue, typeValue, lengthValue, protocolVal, hostVal, baseVal) {
    return '{ "id": "' + idValue + '",\n "name": "' + nameValue + '",\n "type": "' + typeValue + '",\n "length": ' + lengthValue + ',\n "self": "' + protocolVal + "://" + hostVal + baseVal + "/" + idValue + '"\n}';
}

/* ------------- Begin Boat Model Functions ------------- */
function post_boat(name, type, length, owner){
    var key = datastore.key(BOATS);
	const new_boat = {
    "name": name, 
    "type": type, 
    "length": length, 
    "owner":owner,
    "cargo": [], 
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
            results.items = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
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

function get_boat_unprotectedID(id){
    const key = datastore.key([BOATS, parseInt(id,10)]); 
    return datastore.get(key); 
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

//Update boat function
function put_boat(id, name, type, length){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    const boat = {"name": name, "type": type, "length": length};
    return datastore.update({"key":key, "data":boat}).then(() => {return key});
}

function delete_boat(id){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.delete(key);
} 

//Get cargo from boats 
function get_boats_cargo(req, id){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.get(key)
    .then( (boats) => {
        const boat = boats[0];
        const cargo_keys = boat.cargo.map( (g_id) => {
            return datastore.key([CARGO, parseInt(g_id,10)]);
        });
        return datastore.get(cargo_keys);
    })
    .then((cargos) => {
        cargos = cargos[0].map(ds.fromDatastore);
        return cargos;
    });
}

//Adding cargo to boat
function put_boatCargo(bid, cid){
    const b_key = datastore.key([BOATS, parseInt(bid,10)]);
    return datastore.get(b_key)
    .then( (boats) => {
        if( typeof(boats[0].cargo) === 'undefined'){
            boats[0].cargo = [];
        }
        boats[0].cargo.push(cid);
        return datastore.save({"key":b_key, "data":boats[0]});
    });
} 

function put_cargoCarrier(bid, cid) {
    const c_key = datastore.key([CARGO, parseInt(cid, 10)]); 
    return datastore.get(c_key)
    .then( (cargo) => {
        if( typeof(cargo[0].carrier) === 'undefined') {
            cargo[0].carrier = []; 
        }
        cargo[0].carrier.push(bid); 
        return datastore.save({"key":c_key, "data":cargo[0]}); 
    });
}
/* ------------- End Boat Model Functions ------------- */

/* ------------- Begin Boat Controller Functions ------------- */ 
router.get('/', function(req, res){
    const boats = get_boats_unprotected(req)
	.then( (boats) => {
        for (var i = 0; i<boats.items.length; i++) {
           boats.items[i].self =  req.protocol + "://" + req.get('host') + req.baseUrl + '/' + boats.items[i].id;  
        } 
        res.status(200).json(boats);
    });
}); 

router.get('/:boat_id', function(req, res) {
    const boat = get_boat_unprotectedID(req.params.boat_id)
    .then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            boat[0].self = req.protocol + "://" + req.get('host') + req.baseUrl + '/' + req.params.boat_id;
            //res.status(200).type('json').send(stringifyExample1(req.params.boat_id, boat[0].name, boat[0].type, boat[0].length, req.protocol, req.get("host"), req.baseUrl));
            res.status(200).json(boat);  
        }
    })
});

router.get('/:boat_id/cargo', function(req, res){
    const boats = get_boats_cargo(req, req.params.boat_id)
	.then( (boats) => {
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
                res.status(201).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.body.owner, req.protocol, req.get("host"), req.baseUrl));
            });
    }  
});

//Will eventually have to check proper ownership
router.put('/:boat_id', function(req,res) {
    const boat = get_boat_unprotectedID(req.params.boat_id)
    .then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        } else if (req.body.name == null || req.body.type == null || req.body.length == null) {
           res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}') 
        } else {
            put_boat(req.params.boat_id, req.body.name, req.body.type, req.body.length)
            res.status(200).type('json').send(stringifyExample(req.params.boat_id, boat[0].name, boat[0].type, boat[0].length, req.protocol, req.get("host"), req.baseUrl));
        }
    });
});

//Will eventually have to check proper ownership
router.delete('/:boat_id', function(req, res){
    const boat = get_boat_unprotectedID(req.params.boat_id)
	.then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            delete_boat(req.params.boat_id).then(res.status(204).end());  
        }    
    });
});

//Implement this function with putting cargo on the boat 
router.put('/:bid/cargo/:cid', function(req, res){
    if (req.params.bid == null || req.params.cid == null) {
        res.status(404).send('{"Error": No boat with this boat_id exists, and/or no cargo with this cargo_id exits."}')
    }
    else {
    put_boatCargo(req.params.bid, req.params.cid)
    put_cargoCarrier(req.params.bid, req.params.cid)
    .then(res.status(200).end());
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
/* ------------- End Boat Controller Functions ------------- */


module.exports = router;