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
function get_lodging_guests(req, id){
    const key = datastore.key([LODGING, parseInt(id,10)]);
    return datastore.get(key)
    .then( (lodgings) => {
        const lodging = lodgings[0];
        const guest_keys = lodging.guests.map( (g_id) => {
            return datastore.key([GUEST, parseInt(g_id,10)]);
        });
        return datastore.get(guest_keys);
    })
    .then((guests) => {
        guests = guests[0].map(ds.fromDatastore);
        return guests;
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

function put_reservation(lid, gid){
    const l_key = datastore.key([LODGING, parseInt(lid,10)]);
    return datastore.get(l_key)
    .then( (lodging) => {
        if( typeof(lodging[0].guests) === 'undefined'){
            lodging[0].guests = [];
        }
        lodging[0].guests.push(gid);
        return datastore.save({"key":l_key, "data":lodging[0]});
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

router.get('/:id', function(req, res) {
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

//Function to get cargo from boats
router.get('/:id/guests', function(req, res){
    const lodgings = get_lodging_guests(req, req.params.id)
	.then( (lodgings) => {
        res.status(200).json(lodgings);
    });
});

router.post('/', function(req, res){
    if (req.body.name == null || req.body.type == null || req.body.length == null) {
        res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}')
    }
    post_boat(req.body.name, req.body.type, req.body.length)
    .then( key => {
            res.status(201).send(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol, req.get("host"), req.baseUrl));
            //console.log(stringifyExample(key.id, req.body.name, req.body.type, req.body.length, req.protocol, req.get("host"), req.baseUrl)); 
        })
});

router.put('/:id', function(req,res) {
    const boat = get_boat(req.params.id)
    .then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        } else if (req.body.name == null || req.body.type == null || req.body.length == null) {
           res.status(400).send('{"Error": "The request object is missing at least one of the required attributes"}') 
        } else {
            put_boat(req.params.id, req.body.name, req.body.type, req.body.length)
            res.status(200).json(boat); 
        }
    });
}); 

router.put('/:lid/guests/:gid', function(req, res){
    put_reservation(req.params.lid, req.params.gid)
    .then(res.status(200).end());
});


//When we delete a boat we need to unload the load on the boat 
router.delete('/:id', function(req, res){
    const boat = get_boat(req.params.id)
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