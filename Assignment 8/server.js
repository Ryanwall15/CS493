const express = require('express');
const app = express();

const {Datastore} = require('@google-cloud/datastore');
const bodyParser = require('body-parser');
const datastore = new Datastore();

const BOATS = "Boats"; 

const router = express.Router();

app.use(bodyParser.json());

function fromDatastore(item){
    item.id = item[Datastore.KEY].id;
    return item;
}

function stringifyExample(idValue, nameValue, typeValue, lengthValue) {
    return '{ "id": "' + idValue + '", "name": "' + nameValue + '", "type": "' + typeValue + '", "length": ' + lengthValue + '}';
}

//Function that will get the list of all boats
function post_boats(name, type, length){
    var key = datastore.key(BOATS); 
    const new_boats = {"name": name, "type": type, "length": length}; 
    return datastore.save({"key":key, "data":new_boats}).then(() => {return key}); 
}

function get_boats(){
	const q = datastore.createQuery(BOATS);
	return datastore.runQuery(q).then( (entities) => {
			return entities[0].map(fromDatastore);
		});
}

function get_boat(id){
    const key = datastore.key([BOATS, parseInt(id,10)]);
    return datastore.get(key); 
}

router.get('/boats', function(req, res){
    const boats = get_boats()
	.then( (boats) => {
        res.status(200).json(boats);
    });
});

router.get('/boats/:boat_id', function(req, res){
    const boat = get_boat(req.params.boat_id)
	.then( (boat) => {
        if (boat[0] == null) {
            res.status(404).json({"Error": "No boat with this boat_id exists"});
        }
        else {
            res.status(200).json(boat);  
        }    
    })
});

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

/* app.get('/', (req, res) => {
  res.send('Hello from App Engine!');
});*/

app.use('/', router); 

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}...`);
});