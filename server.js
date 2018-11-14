var express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    MongoClient = require('mongodb').MongoClient,
    engines = require('consolidate'),
    assert = require('assert'),
    ObjectId = require('mongodb').ObjectID,
    redis = require("redis"),
    redis_host = '',
    redis_key = '',
    url = 'mongodb://c4ts-jmc-mining-dgll:98RKyJBIWmBZwzDSAvKLVXmkmIvc7iEeBZHt1GlDIKKMItlIP4hki2XmPIr7Odno6w7a6JrilKB1uPJlx5MULg==@c4ts-jmc-mining-dgll.documents.azure.com:10255/?ssl=true&replicaSet=globaldb';

app.use(express.static(__dirname + "/public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.engine('html', engines.nunjucks);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');

function errorHandler(err, req, res, next) {
    console.error(err.message);
    console.error(err.stack);
    res.status(500).render("error_template", { error: err });
}

var cacheConnection = redis.createClient(6380, process.env.REDISCACHE_HOSTNAME || redis_host ,
    {
        auth_pass: process.env.REDISCACHE_KEY || redis_key, tls: {
            servername: process.env.REDISCACHE_HOSTNAME || redis_host
        }
    });

cacheConnection.on('connect', () => {
    console.log(`connected to redis`);
});

cacheConnection.on('error', err => {
    console.log(`Error: ${err}`);
});

function flushCache() {
    cacheConnection.flushdb(function (err, succeeded) {
        console.log('Flush Cache : ' + succeeded);
    });
}

var allRecordCacheKey = 'all';
var pageRecordCacheKey = 'page_';
var totalRecordCount = 'totalCount';

MongoClient.connect(process.env.MONGODB_URI || url, function (err, db) {
    assert.equal(null, err);
    console.log('Successfully connected to MongoDB.');

    var records_collection = db.collection('records');

    app.get('/recordscount', function (req, res, next) {
        cacheConnection.get(totalRecordCount, function (err, allrecs) {
            if (allrecs) {
                console.log("Get " + totalRecordCount + " from redis cache");
                console.log(allrecs);
                return res.json(JSON.parse(allrecs));
            }

            records_collection.find({}).count(function (err, records) {
                if (err) throw err;

                if (records.length < 1) { console.log("No records found.") }

                cacheConnection.set(totalRecordCount, JSON.stringify(records), function (err, result) { if (err) console.log(err); });

                res.json(records);
            });
        });
    });

    app.get('/records', function (req, res, next) {

        cacheConnection.get(allRecordCacheKey, function (err, allrecs) {
            if (allrecs) {
                console.log("Get " + allRecordCacheKey + " from redis cache");
                console.log(allrecs);
                return res.json(JSON.parse(allrecs));
            }

            records_collection.find({}).toArray(function (err, records) {
                if (err) throw err;

                if (records.length < 1) {
                    console.log("No records found.");
                }

                cacheConnection.set(
                    allRecordCacheKey, JSON.stringify(records), function (err, result) {
                        if (err) console.log(err);
                    });
                
                res.json(records);
            });
        });
    });

    app.get('/recordsnocache', function (req, res, next) {
        records_collection.find({}).toArray(function (err, records) {
            if (err) throw err;

            if (records.length < 1) {
                console.log("No records found.");
            }

            res.json(records);
        });
    });

    app.get('/records/:page', function (req, res, next) {

        var skipCount = (req.params.page - 1) * 20;

        cacheConnection.get(pageRecordCacheKey + req.params.page, function (err, allrecs) {
            if (allrecs) {
                console.log("Get " + pageRecordCacheKey + req.params.page + "from redis cache");
                return res.json(JSON.parse(allrecs));
            }

            records_collection.find({}).limit(20).skip(skipCount).toArray(function (err, records) {
                if (err) throw err;

                if (records.length < 1) {
                    console.log("No records found.");
                }

                cacheConnection.set(
                    pageRecordCacheKey + req.params.page, JSON.stringify(records), function (err, result) {
                        if (err) console.log(err);
                    });

                res.json(records);
            });
        });
        
    });

    app.post('/records', function (req, res, next) {
        console.log(req.body);
        records_collection.insert(req.body, function (err, doc) {
            if (err) throw err;
            console.log(doc);
            flushCache();
            res.json(doc);
        });
    });

    app.delete('/records/:id', function (req, res, next) {
        var id = req.params.id;
        console.log("delete " + id);
        flushCache();
        records_collection.deleteOne({ '_id': new ObjectId(id) }, function (err, results) {
            console.log(results);
            res.json(results);
        });
    });

    app.put('/records/:id', function (req, res, next) {
        var id = req.params.id;
        records_collection.updateOne(
            { '_id': new ObjectId(id) },
            {
                $set: {
                    'name': req.body.name,
                    'email': req.body.email,
                    'phone': req.body.phone
                }
            }, function (err, results) {
                console.log(results);
                res.json(results);
            });

        flushCache();
    });

    app.use(errorHandler);
    var server = app.listen(process.env.PORT || 3000, function () {
        var port = server.address().port;
        console.log('Express server listening on port %s.', port);
    })
})
