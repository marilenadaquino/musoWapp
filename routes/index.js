var express = require('express');
var router = express.Router();
var fs = require('fs');
var rdf = require('rdflib');
var SparqlClient = require('sparql-client-2');
var uuidv4 = require('uuid/v4');


// namespaces
var RDF = rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#")
var RDFS = rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#")
var DCITE = rdf.Namespace("http://purl.org/spar/datacite/")

var SPARQL = SparqlClient.SPARQL;
var endpoint = 'http://data.open.ac.uk/sparql';
// SPARQL Queries
const queryByName = 
	'SELECT ?uri ?resLabel ?name ?desc ?homepage ?subject ?audience' +
		' FROM <http://data.open.ac.uk/context/musow>  ' +
		' WHERE {  ' +
		' 	?uri <http://purl.org/spar/datacite/hasGeneralResourceType> ?resType ; ' +
		' 	<http://www.w3.org/2000/01/rdf-schema#label> ?name;  ' +
		' 	<http://www.w3.org/2000/01/rdf-schema#comment> ?desc ;  ' +
		' 	<http://xmlns.com/foaf/0.1/homepage> ?homepage .  ' +
		' 	OPTIONAL { ?uri <http://dbpedia.org/ontology/category> ?subjectURI . ?subjectURI <http://www.w3.org/2000/01/rdf-schema#label> ?subject . } .  ' +
		'   OPTIONAL { ?uri <http://purl.org/dc/terms/audience> ?typeaudience . ?typeaudience <http://www.w3.org/2000/01/rdf-schema#label> ?audience .} . ' +
		' 	?resType <http://www.w3.org/2000/01/rdf-schema#label> ?resLabel .}  ' +
		' ORDER BY ?name';

var queryCountResources = 'SELECT (COUNT(?resource) as ?count) ?type FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://purl.org/spar/datacite/hasGeneralResourceType> ?typeURI . ?typeURI <http://www.w3.org/2000/01/rdf-schema#label> ?type . } GROUP BY ?type ?count ORDER BY DESC (?count) ?type'
var queryCountSubject = 'SELECT  (COUNT(?resource) as ?count) ?type FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://dbpedia.org/ontology/category> ?typeURI . ?typeURI <http://www.w3.org/2000/01/rdf-schema#label> ?type . } GROUP BY ?type ?count ORDER BY DESC (?count) ?type '
var queryAudience = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT (count(DISTINCT ?resource) AS ?count) ?audience WHERE { ?resource <http://purl.org/dc/terms/audience> ?typeaudience . ?typeaudience rdfs:label ?audience } group by ?audience order by DESC (?count)'
var queryCountFormat = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT ?format ?formatLabel (count(DISTINCT ?resource) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://purl.org/spar/datacite/hasGeneralResourceType> ?resourceType ; <http://data.open.ac.uk/musow/ontology/scope/format> ?format . ?format rdfs:label ?formatLabel . } group by ?format ?formatLabel ?count order by DESC(?count) LIMIT 10'
var queryCountLicense = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?licenseLabel (count(DISTINCT ?resource) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://purl.org/spar/datacite/hasGeneralResourceType> ?resourceType ; <http://purl.org/dc/terms/license> ?license . ?license rdfs:label ?licenseLabel } group by ?licenseLabel ?count order by DESC(?count) '
var queryCountScale = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?label (COUNT(?project) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?project <http://purl.org/dc/terms/extent> ?size . ?size rdfs:label ?label . } GROUP BY ?label ORDER BY ?label'
var queryCountTopic = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT  ?topicLabel (count(DISTINCT ?resource) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://www.w3.org/ns/oa#hasScope> ?topic . ?topic rdfs:label ?topicLabel . ?resourceType rdfs:label ?resourceLabel . } group by ?topicLabel?count order by DESC (?count)'
var queryCountFeature = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT  ?topicLabel (count(DISTINCT ?resource) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://xmlns.com/foaf/0.1/primaryTopic> ?topic . ?topic rdfs:label ?topicLabel . ?resourceType rdfs:label ?resourceLabel . } group by ?topicLabel?count order by DESC (?count)'

var resourcesList = []; 

var resourcesCount = []; 
var resourcesSubject = [];
var resourcesAudience =[]; var audienceOnly = []; var countAudienceOnly = [];
var resourcesFormat = []; var formatOnly = []; var countFormatOnly = [];
var resourcesLicense = []; var licenseOnly = []; var countLicenseOnly = [];
var resourcesScale = []; var scaleOnly = []; var countScaleOnly = [];
// var resourcesScopeAndType = [];
var resourcesTopic = [];
var resourcesFeature = []; var featureOnly = []; var countFeatureOnly = [];
var onlyNameAndURI = [];

var client = new SparqlClient(endpoint, {
  defaultParameters: { format: 'json' }
}).register({ms: 'http://data.open.ac.uk/musow/'})

function myfilter(array, test){
	    var passedTest =[];
	    for (var i = 0; i < array.length; i++) {
	       if(test( array[i])) {
	       	return array[i];
	       }
	    } return null;
	}

// browse.pug
// Count of resources grouped by type
client.query(queryCountResources).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesCount.push({
				"ID": uuidv4(),
				"TYPE": results.results.bindings[i].type.value,
				"NUMBER": results.results.bindings[i].count.value
			});
		};
		console.log(resourcesCount.length)
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});

// Count of resources grouped by subject (symbolic, metadata, media)
client.query(queryCountSubject).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesSubject.push({
				"ID": uuidv4(),
				"TYPE": results.results.bindings[i].type.value,
				"NUMBER": results.results.bindings[i].count.value
			});
		};
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});

// Count of resources grouped by target audience
client.query(queryAudience).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesAudience.push({
				"ID": uuidv4(),
				"AUDIENCE": results.results.bindings[i].audience.value,
				"NUMBER": results.results.bindings[i].count.value
			});
			audienceOnly.push("'"+results.results.bindings[i].audience.value.replace(/ /g,'-')+"'");
			countAudienceOnly.push(results.results.bindings[i].count.value);	
		};
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});

// Count of resources grouped by format
client.query(queryCountFormat).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesFormat.push({
				"ID": uuidv4(),
				"FORMAT": results.results.bindings[i].formatLabel.value,
				"NUMBER": results.results.bindings[i].count.value
			});
			formatOnly.push("'"+results.results.bindings[i].formatLabel.value.replace(/ /g,'-')+"'");
			countFormatOnly.push(results.results.bindings[i].count.value);	
		};
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});

// Count of resources grouped by license
client.query(queryCountLicense).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesLicense.push({
				"ID": uuidv4(),
				"LICENSE": results.results.bindings[i].licenseLabel.value,
				"NUMBER": results.results.bindings[i].count.value
			});
			licenseOnly.push("'"+results.results.bindings[i].licenseLabel.value.replace(/ /g,'-')+"'");
			countLicenseOnly.push(results.results.bindings[i].count.value);
		};
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});

// Count of resources grouped by scale
client.query(queryCountScale).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesScale.push({
				"ID": uuidv4(),
				"SCALE": results.results.bindings[i].label.value,
				"NUMBER": results.results.bindings[i].count.value
			});
			scaleOnly.push("'"+results.results.bindings[i].label.value.replace(/ /g,'')+"'");
			countScaleOnly.push(results.results.bindings[i].count.value);	
		};
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});

// Count of resources gropued by topic
client.query(queryCountTopic).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesTopic.push({
				"ID": uuidv4(),
				"TOPIC": results.results.bindings[i].topicLabel.value,
				"NUMBER": results.results.bindings[i].count.value
			});
		};
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});

// Count of resources grouped by feature
client.query(queryCountFeature).execute()
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			resourcesFeature.push({
				"ID": uuidv4(),
				"FEATURE": results.results.bindings[i].topicLabel.value,
				"NUMBER": results.results.bindings[i].count.value
			});
			featureOnly.push("'"+results.results.bindings[i].topicLabel.value+"'");
			countFeatureOnly.push(results.results.bindings[i].count.value);
		};
	}).catch(function (error) {
		console.log('ops, something went wrong')
	});


// resources.pug
// List of resources by name
client.query(queryByName).execute({format: {resource: 'uri'}})
	.then(function (results) {
		for (var i=0; i<results.results.bindings.length; i++) {
			for (var j=0; j<results.results.bindings[i].name.length; j++) {
  				var names = results.results.bindings[i].name[j].value;
 			};
 			for (var j=0; j<results.results.bindings[i].resLabel.length; j++) {
  				var types = results.results.bindings[i].resLabel[j].value;
 			};
 			for (var j=0; j<results.results.bindings[i].homepage.length; j++) {
  				var homes = results.results.bindings[i].homepage[j].value;
 			};
 			for (var j=0; j<results.results.bindings[i].desc.length; j++) {
  				var descs = results.results.bindings[i].desc[j].value;
 			};
			for (var j=0; j<results.results.bindings[i].subject.length; j++) {
  				var subjects = results.results.bindings[i].subject[j].value;
			};
			for (var j=0; j<results.results.bindings[i].audience.length; j++) {
  				var audience = results.results.bindings[i].audience[j].value;
			};
			onlyNameAndURI.push({
				"ID": results.results.bindings[i].uri.value.split(/[\/]+/).pop(),
				"URI": results.results.bindings[i].uri.value,
				"DESC": descs,
				"TYPE": types,
				"HOMEPAGE": homes,
				"SUBJECT": subjects,
				"NAME": names,
				"AUDIENCE": audience
			});
		};
		// console.dir(arguments, {depth: null});
	}).catch(function (error) {
		console.log('ops, something went wrong - queryByName')
	});



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'musoW' });
});

router.get('/browse', function(req, res, next) {
  res.render('browse', { title: 'browse' , onlyNameAndURI , 
  							resourcesCount , 
  							resourcesSubject, 
  							resourcesAudience , 
  							audienceOnly , 
  							countAudienceOnly , 
  							formatOnly , 
  							countFormatOnly ,
  							resourcesLicense ,
  							scaleOnly ,
  							countScaleOnly ,
  							resourcesTopic ,
  							featureOnly ,
  							countFeatureOnly,
  							licenseOnly,
  							countLicenseOnly});
});

router.get('/resources', function(req, res, next) {
	console.log(onlyNameAndURI)
  res.render('resources', { title: 'resources by name', onlyNameAndURI});
});

router.get('/resources-type', function(req, res, next) {
  res.render('resources-type', { title: 'resources by type', onlyNameAndURI, resourcesCount});
});

router.get('/resources-subject', function(req, res, next) {
  res.render('resources-subject', { title: 'resources by subject', onlyNameAndURI, resourcesSubject});
});

router.get('/resources/:id', function(req, res, next) {
	const id = req.params.id;
	var data = [];
	// var x = [];
	// var x = myfilter(resourcesList, function(item) { // filter the array of objects, return only the selected resource
	// 	return item.ID == id;}); 
	var queryResource = 'SELECT * FROM <http://data.open.ac.uk/context/musow> ' +
						'WHERE { ' +
							'?uri <http://purl.org/spar/datacite/hasGeneralResourceType> ?resType ; ' +
							' <http://www.w3.org/2000/01/rdf-schema#label> ?name; ' +
							' <http://www.w3.org/2000/01/rdf-schema#comment> ?desc ; ' +
							' <http://xmlns.com/foaf/0.1/homepage> ?homepage . ' +
							' OPTIONAL { ?uri <http://purl.org/dc/terms/license> ?license. ?license <http://www.w3.org/2000/01/rdf-schema#label> ?licenseLabel } . ' +
							' OPTIONAL { ?uri <http://purl.org/dc/terms/extent> ?extent . ?extent <http://www.w3.org/2000/01/rdf-schema#label> ?extentLabel } . ' +
							' OPTIONAL { ?uri <http://purl.org/dc/terms/audience> ?audience . ?audience <http://www.w3.org/2000/01/rdf-schema#label> ?audienceLabel } . ' +
							' OPTIONAL { ?uri <http://www.w3.org/ns/oa#hasScope> ?scope . ?scope <http://www.w3.org/2000/01/rdf-schema#label> ?scopeLabel } . ' +
							' OPTIONAL { ?uri <http://xmlns.com/foaf/0.1/primaryTopic> ?musicFeature . ?musicFeature <http://www.w3.org/2000/01/rdf-schema#label> ?musicFeatureLabel } . ' +
							' OPTIONAL { ?uri <http://dbpedia.org/ontology/category> ?subjectURI . ?subjectURI <http://www.w3.org/2000/01/rdf-schema#label> ?subject . } . ' +
							' OPTIONAL { ?uri <http://data.open.ac.uk/musow/ontology/situation/task> ?taskURI . ?taskURI <http://www.w3.org/2000/01/rdf-schema#label> ?task } . ' +
							' OPTIONAL {?uri <http://schema.org/featureList> ?serviceURI . ?serviceURI <http://www.w3.org/2000/01/rdf-schema#label> ?service } . ' +
							' ?resType <http://www.w3.org/2000/01/rdf-schema#label> ?resLabel .} ORDER BY ?name';
	var client = new SparqlClient(endpoint, { defaultParameters: { format: 'json' } }).register({ms: 'http://data.open.ac.uk/musow/'});
	 
	client.query(queryResource)
	  .bind('uri', {ms: id})
	  .execute({format: {resource: 'name' }})
	  .then(function (results) {
	  	for (var i=0; i<results.results.bindings.length; i++) {
		  		if (results.results.bindings[i].scopeLabel.length > 0) {
		  			var scope = results.results.bindings[i].scopeLabel[0].value
		  		} else { var scope = 'not applicable'};
		  		if (results.results.bindings[i].extentLabel.length > 0) {
		  			var extent = results.results.bindings[i].extentLabel[0].value
		  		} else { var extent = 'not applicable'};
		  		if (results.results.bindings[i].musicFeatureLabel.length > 0) {
		  			var musicFeature = [];
		  			for (var j=0; j<results.results.bindings[i].musicFeatureLabel.length; j++) {
		  				musicFeature.push(results.results.bindings[i].musicFeatureLabel[j].value);
		  			} 
		  		} else { var musicFeature = 'none'};
		  		if (results.results.bindings[i].task.length > 0) {
		  			var task = [];
		  			for (var j=0; j<results.results.bindings[i].task.length; j++) {
		  				task.push(results.results.bindings[i].task[j].value);
		  			} 
		  		} else { var task = 'none'};
		  		if (results.results.bindings[i].service.length > 0) {
		  			var service = [];
		  			for (var j=0; j<results.results.bindings[i].service.length; j++) {
		  				service.push(results.results.bindings[i].service[j].value);
		  			} 
		  		} else { var audience = 'none'};
		  		if (results.results.bindings[i].audienceLabel.length > 0) {
		  			var audience = [];
		  			for (var j=0; j<results.results.bindings[i].audienceLabel.length; j++) {
		  				audience.push(results.results.bindings[i].audienceLabel[j].value);
		  			} 
		  		} else { var audience = 'none'};
	    	data.push( {
	    		"ID": id, 
	    		"NAME": results.results.bindings[i].name.value,
	    		"URI": 'http://data.open.ac.uk/musow/'+id,
				"TYPE": results.results.bindings[i].resLabel[0].value,
				"HOMEPAGE": results.results.bindings[i].homepage[0].value,
				"DESC": results.results.bindings[i].desc[0].value,
				"LICENSE": results.results.bindings[i].licenseLabel[0].value,
				"EXTENT": extent,
				"AUDIENCE": audience,
				"SCOPE": scope,
				"MUSICFEATURE": musicFeature,
				"SUBJECT": results.results.bindings[i].subject[0].value,
				"TASK": task,
				"SERVICE": service
	    	} );
	    	console.log(data);
	    };	
	    res.render('resource', { title: data[0].NAME, data, onlyNameAndURI});
		}).catch(function (error) {
		console.log('ops, something went wrong - queryResource')
	});
});

// other pages
// explore.pug TBD
router.get('/explore', function(req, res, next) {
  res.render('explore', { title: 'explore', onlyNameAndURI});
});

// contribute.pug
router.get('/contribute', function(req, res, next) {
  res.render('contribute', { title: 'contribute to'});
});

module.exports = router;


