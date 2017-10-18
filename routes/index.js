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
var queryByName = 'SELECT ?uri ?resLabel ?name ?desc ?licenseLabel ?extentLabel ?homepage ?audienceLabel ?scopeLabel ?musicFeatureLabel ?subject ?task ?service FROM <http://data.open.ac.uk/context/musow> WHERE { ?uri <http://purl.org/spar/datacite/hasGeneralResourceType> ?resType ; <http://www.w3.org/2000/01/rdf-schema#label> ?name; <http://www.w3.org/2000/01/rdf-schema#comment> ?desc. OPTIONAL { ?uri <http://purl.org/dc/terms/license> ?license. ?license <http://www.w3.org/2000/01/rdf-schema#label> ?licenseLabel } . OPTIONAL { ?uri <http://purl.org/dc/terms/extent> ?extent . ?extent <http://www.w3.org/2000/01/rdf-schema#label> ?extentLabel } . OPTIONAL { ?uri <http://xmlns.com/foaf/0.1/homepage> ?homepage; <http://purl.org/dc/terms/audience> ?audience . ?audience <http://www.w3.org/2000/01/rdf-schema#label> ?audienceLabel } . OPTIONAL { ?uri <http://www.w3.org/ns/oa#hasScope> ?scope . ?scope <http://www.w3.org/2000/01/rdf-schema#label> ?scopeLabel } . OPTIONAL { ?uri <http://xmlns.com/foaf/0.1/primaryTopic> ?musicFeature . ?musicFeature <http://www.w3.org/2000/01/rdf-schema#label> ?musicFeatureLabel } . OPTIONAL { ?uri <http://dbpedia.org/ontology/category> ?subjectURI . ?subjectURI <http://www.w3.org/2000/01/rdf-schema#label> ?subject . } . OPTIONAL { ?uri <http://data.open.ac.uk/musow/ontology/situation/task> ?taskURI . ?taskURI <http://www.w3.org/2000/01/rdf-schema#label> ?task } . OPTIONAL {?uri <http://schema.org/featureList> ?serviceURI . ?serviceURI <http://www.w3.org/2000/01/rdf-schema#label> ?service } . ?resType <http://www.w3.org/2000/01/rdf-schema#label> ?resLabel . } ORDER BY ?name';

var queryCountResources = 'SELECT (COUNT(?resource) as ?count) ?type FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://purl.org/spar/datacite/hasGeneralResourceType> ?typeURI . ?typeURI <http://www.w3.org/2000/01/rdf-schema#label> ?type . } GROUP BY ?type ?count ORDER BY DESC (?count) ?type'
var queryCountSubject = 'SELECT  (COUNT(?resource) as ?count) ?type FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://dbpedia.org/ontology/category> ?typeURI . ?typeURI <http://www.w3.org/2000/01/rdf-schema#label> ?type . } GROUP BY ?type ?count ORDER BY DESC (?count) ?type '
var queryAudience = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT (count(DISTINCT ?resource) AS ?count) ?audience WHERE { ?resource <http://purl.org/dc/terms/audience> ?typeaudience . ?typeaudience rdfs:label ?audience } group by ?audience order by DESC (?count)'
var queryCountFormat = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT ?format ?formatLabel (count(DISTINCT ?resource) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://purl.org/spar/datacite/hasGeneralResourceType> ?resourceType ; <http://data.open.ac.uk/musow/ontology/scope/format> ?format . ?format rdfs:label ?formatLabel . } group by ?format ?formatLabel ?count order by DESC(?count) LIMIT 10'
var queryCountLicense = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?licenseLabel (count(DISTINCT ?resource) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://purl.org/spar/datacite/hasGeneralResourceType> ?resourceType ; <http://purl.org/dc/terms/license> ?license . ?license rdfs:label ?licenseLabel } group by ?licenseLabel ?count order by DESC(?count) '
var queryCountScale = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT ?label (COUNT(?project) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?project <http://purl.org/dc/terms/extent> ?size . ?size rdfs:label ?label . } GROUP BY ?label ORDER BY ?label'
// var queryScopeAndType = 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> SELECT DISTINCT ?resourceLabel ?topicLabel (count(DISTINCT ?resource) AS ?count) FROM <http://data.open.ac.uk/context/musow> WHERE { ?resource <http://purl.org/spar/datacite/hasGeneralResourceType> ?resourceType ; <http://www.w3.org/ns/oa#hasScope> ?topic . ?resourceType rdfs:label ?resourceLabel . ?topic rdfs:label ?topicLabel . } group by ?resourceLabel ?topicLabel ?count order by ?resourceLabel DESC(?count)'
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
})

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
 			for (var j=0; j<results.results.bindings[i].desc.length; j++) {
  				var descs = results.results.bindings[i].desc[j].value;
 			};
 			for (var j=0; j<results.results.bindings[i].licenseLabel.length; j++) {
  				var licenses = results.results.bindings[i].licenseLabel[j].value;
 			};
 			for (var j=0; j<results.results.bindings[i].extentLabel.length; j++) {
  				var extents = results.results.bindings[i].extentLabel[j].value;
 			};
 			for (var j=0; j<results.results.bindings[i].homepage.length; j++) {
  				var homes = results.results.bindings[i].homepage[j].value;
 			};
			for (var j=0; j<results.results.bindings[i].audienceLabel.length; j++) {
  				var audiences = results.results.bindings[i].audienceLabel;
			};
			for (var j=0; j<results.results.bindings[i].scopeLabel.length; j++) {
  				var scopes = results.results.bindings[i].scopeLabel;
			};
			for (var j=0; j<results.results.bindings[i].musicFeatureLabel.length; j++) {
  				var musicFeatures = results.results.bindings[i].musicFeatureLabel;
			};

			for (var j=0; j<results.results.bindings[i].subject.length; j++) {
  				var subjects = results.results.bindings[i].subject[j].value;
			};
			for (var j=0; j<results.results.bindings[i].task.length; j++) {
  				var tasks = results.results.bindings[i].task;
			};
			for (var j=0; j<results.results.bindings[i].service.length; j++) {
  				var services = results.results.bindings[i].service;
			};

			resourcesList.push({
				"ID": results.results.bindings[i].uri.value.split(/[\/]+/).pop(),
				"URI": results.results.bindings[i].uri.value,
				"NAME": names,
				"TYPE": types,
				"DESC": descs,
				"LICENSE": licenses,
				"EXTENT": extents,
				"HOMEPAGE": homes,
				"AUDIENCE": audiences,
				"SCOPE": scopes,
				"MUSICFEATURE": musicFeatures,
				"SUBJECT": subjects,
				"TASK": tasks,
				"SERVICE": services
			});
			onlyNameAndURI.push({
				"URI": results.results.bindings[i].uri.value,
				"DESC": descs,
				"NAME": names
			});
		};
		console.log(resourcesList.length)
	}).catch(function (error) {
		console.log('ops, something went wrong - queryByName')
	});



/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'musoW' });
});

router.get('/browse', function(req, res, next) {
  res.render('browse', { title: 'browse' , onlyNameAndURI, resourcesList , 
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
	console.log(resourcesList);
  res.render('resources', { title: 'resources by name', onlyNameAndURI, resourcesList , resourcesCount, resourcesSubject});
});

router.get('/resources-type', function(req, res, next) {
	console.log(resourcesList);
  res.render('resources-type', { title: 'resources by type', onlyNameAndURI, resourcesList , resourcesCount, resourcesSubject});
});

router.get('/resources-subject', function(req, res, next) {
	console.log(resourcesList);
  res.render('resources-subject', { title: 'resources by subject', onlyNameAndURI, resourcesList , resourcesCount, resourcesSubject});
});

router.get('/resources/:id', function(req, res, next) {
	var id = req.params.id;	
	var x = myfilter(resourcesList, function(item) { // filter the array of objects, return only the selected resource
		return item.ID == id;}); 
	res.render('resource', { title: x.NAME, resourcesList, id, x, onlyNameAndURI});
});

// other pages
// explore.pug TBD
router.get('/explore', function(req, res, next) {
  res.render('explore', { title: 'explore', resourcesList , onlyNameAndURI});
});

// contribute.pug
router.get('/contribute', function(req, res, next) {
  res.render('contribute', { title: 'contribute to', resourcesList , onlyNameAndURI});
});

module.exports = router;


