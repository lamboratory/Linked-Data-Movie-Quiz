$(document).ready(function(){
	reloadSuggestion();
	search();
});

function reloadSuggestion() {
	var suggestions = ["Jack Nicholson", "Uma Thurman", "Scarlett Johansson", "Tom Hanks", "Leonardo DiCaprio", "Robert De Niro", "Marlon Brando", "Jessica Alba", "Al Pacino", "Johnny Depp", "Meryl Streep", "Morgan Freeman", "Kate Winslet", "Audrey Hepburn", "Katharine Hepburn", "Julia Roberts"];
	randomize(suggestions, 0);
	$('#sugg').html("example: <a href='' onclick=\"return doSearch('"+suggestions[0]+"');\">"+suggestions[0]+"</a>");
}

// We access the SPARQL endpoint through YQL to avoid the cross-domain issue
function sparqlQuery(q, callback){
	var pref = 'PREFIX movie:<http://data.linkedmdb.org/resource/movie/>'
		+ 'PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>'
		+ 'PREFIX foaf: <http://xmlns.com/foaf/0.1/>'
		+ 'PREFIX dc: <http://purl.org/dc/terms/>';
	var url = 'http://data.linkedmdb.org/sparql?query='+encodeURIComponent(pref+q);
	var yql = 'http://query.yahooapis.com/v1/public/yql?q='+encodeURIComponent('select * from xml where url="'+url+'"')+'&format=json';
	$.ajax({
		url: yql,
		dataType: 'jsonp',
		jsonp: 'callback',
		jsonpCallback: callback
	});
}

function doSearch(name) {
	$('#actor').val(name);
	search();
	return false;
}

function search(){
	var name=$('#actor').val();
	if(name=="") return;
	var q = 'SELECT DISTINCT ?actor ?title ?name WHERE {'
		+ ' ?actor movie:actor_name "'+name+'";'
		+ '	movie:actor_name ?name.'
		+ '	?film movie:actor ?actor;'
		+ '		rdfs:label ?title'
		+ '}';
	aName=name;
	sparqlQuery(q, 'cbSearch');
}

function cbSearch(data){
	try {
		var name=aName;
		var films = [];
		var results = data.query.results.sparql.results.result;
		var count = 0;
		for(var i=0;i<results.length;i++){
			var u = results[i].binding[0].uri;
			var f = results[i].binding[1].literal;
			name = results[i].binding[2].literal;
			if(films[u]==null){
				films[u]='"'+f+'"';
				count++;
			}else{
				films[u]+=', "'+f+'"';
			}
		};
		if(count==1){
			loadData(results[0].binding[0].uri, name);
		}else{
			var t = '';
			for (var k in films) {
				t+='<p>The <a href="" onClick="javascript:return loadData(\''+k+'\',\''+name+'\');"">'+name+'</a> who appeared in '+films[k]+'...</p>';
			}
			$('#personSearch').html('<p>We found several matches for '+name+'. Who do you mean?</p>'+t);
		}
	} catch(e) {
		$('#personSearch').html("<p>Oops, we didn't find anyone with that exact name (or temporary error retrieving the data)... Please try again.</p>");
	}
}

var aUri = null;
var aName = null;
var aInf = [];
function loadData(actorUri, name){
	$('#personSearch').html('<p>Loading data for '+name+'...</p>');
  
	// Get characters and films:
	aInf[actorUri] = [];

	var q = 'SELECT DISTINCT ?title ?char ?dirName ?date ?imdb ?fb WHERE {'
		+ '	?film movie:actor <'+actorUri+'>;'
		+ '		rdfs:label ?title.'
		+ '	OPTIONAL {?film movie:director ?dir. ?dir movie:director_name ?dirName }'
		+ '	OPTIONAL {?film dc:date ?date.}'
		+ '	OPTIONAL {?film foaf:page ?imdb. FILTER regex(str(?imdb), "^http://www.imdb.com/title", "i" )}'
		+ '	OPTIONAL {?film foaf:page ?fb. FILTER regex(str(?fb), "^http://www.freebase.com", "i" )}'
		+ '	OPTIONAL {'
		+ '		<'+actorUri+'> movie:performance ?perf.'
		+ '		?film movie:performance ?perf.'
		+ '		?perf movie:performance_character ?char.'
		+ '	}'
		+ '}';
	aName=name;
	aUri=actorUri;
	sparqlQuery(q, 'cbLoadData');
	return false;
}

function cbLoadData(data){
	var name=aName;
	var actorUri=aUri;
	var results = data.query.results.sparql.results.result;
	for(var i=0;i<results.length;i++){
		var actorInfo = {};
		for(var j=0; j<results[i].binding.length; j++) {
			if(results[i].binding[j].name=="imdb"||results[i].binding[j].name=="fb")
				actorInfo[results[i].binding[j].name] = results[i].binding[j].uri;
			else
				actorInfo[results[i].binding[j].name] = results[i].binding[j].literal;
		}
		aInf[actorUri].push(actorInfo);
	}

	clearQuestions();
	var yearQuestioned = {};
	var year = (new Date()).getFullYear();
	for(info in aInf[actorUri]) {
		if(aInf[actorUri][info].title!=null && aInf[actorUri][info].date!=null) {
			if(yearQuestioned[aInf[actorUri][info].title])
				continue;
			yearQuestioned[aInf[actorUri][info].title] = true;
			var answers = [];

			var a1 = aInf[actorUri][info].date.substr(0, 4);
			var a2,a3,a4;
			var r1 = 1 + Math.floor(Math.random()*5);
			var r2 = 1 + Math.floor(Math.random()*5);
			var r3 = 1 + Math.floor(Math.random()*5);
			if(Math.random()>0.5)
				a2=a1+r1;
			else
				a2=a1-r1;
			if(a2>a1 && a2>year)
				a2=a1-1;

			if(Math.random()>0.5)
				a3=a2+r2;
			else
				a3=a2-r2;
			if(a3>a1 && a3>year)
				a3=a2-1;
			if(a3==a1){
				a3=a1-1;
				if(a3==a2)
					a3=a2-1;
			}

			if(Math.random()>0.5)
				a4=a3+r3;
			else
				a4=a3-r3;
			if(a4>a1 && a4>year)
				a4=a3-1;
			if(a4==a1||a4==a2){
				a4=a1-1;
				if(a4==a2||a4==a3){
					a4=a2-1;
					if(a4==a3)
						a4=a3-1;
				}
			}
			answers.push(a1,a2,a3,a4);
			var position = randomize(answers, 0);

			storeQuestion("y",
				{
					question: "What year was "+aInf[actorUri][info].title+" released? ",
					answers: answers,
					imdb: aInf[actorUri][info].imdb,
					fb: aInf[actorUri][info].fb,
					correct: position
				});
		}
	}
	randomizeBuckets();
	loadQuestion();
	$('#asking').html('Asking questions about <b>'+name+'</b>. Change');
	$('#personSearch').html('<p></p>');
	reloadSuggestion();
	if(total==0)
		$("#points").html("Your score: No answers yet...");
	loadOthers(actorUri, name);
}

function generateQuestions(actorUri, name) {
	var actorDirectors = [];
	for(info in aInf[actorUri]) {
		if(aInf[actorUri][info].dirName) {
			var t = aInf[actorUri][info].title;
			actorDirectors[t]=(actorDirectors[t]!=undefined?actorDirectors[t]+", ":"")+aInf[actorUri][info].dirName;
		}
		if(aInf[actorUri][info].char!=null)
			actorCharacters.push(aInf[actorUri][info].char);
	}
	for(film in actorDirectors)
		directors.push(actorDirectors[film]);

	var charQuestioned = {};
	var filmQuestioned = {};
	for(info in aInf[actorUri]) {
		if(aInf[actorUri][info].title!=null && aInf[actorUri][info].char!=null) {
			if(charQuestioned[aInf[actorUri][info].title])
				continue;
			charQuestioned[aInf[actorUri][info].title] = true;
			var answers = [aInf[actorUri][info].char];
			var character = getRandom(filmCharacters[aInf[actorUri][info].title],answers);
			answers.push(character==undefined?getRandom(characters, answers):character);
			answers.push(getRandom(characters, answers));
			answers.push(getRandom(actorCharacters, answers));
			var position = randomize(answers, 0);
			storeQuestion("c",
				{
					question: "What was "+name+"'s character in "+aInf[actorUri][info].title+"?",
					answers: answers,
					imdb: aInf[actorUri][info].imdb,
					fb: aInf[actorUri][info].fb,
					correct: position
				});
		}
		if(aInf[actorUri][info].title!=null && actorDirectors[aInf[actorUri][info].title]!=null) {
			var answers = [actorDirectors[aInf[actorUri][info].title]];
			answers.push(getRandom(directors, answers));
			answers.push(getRandom(directors, answers));
			answers.push(getRandom(directors, answers));
			var position = randomize(answers, 0);
			storeQuestion("d",
				{
					question: "Who directed "+aInf[actorUri][info].title+"?",
					answers: answers,
					imdb: aInf[actorUri][info].imdb,
					fb: aInf[actorUri][info].fb,
					correct: position
				});
		}
		if(aInf[actorUri][info].title!=null) {
			if(filmQuestioned[aInf[actorUri][info].title])
				continue;
			filmQuestioned[aInf[actorUri][info].title] = true;
			var answers = [getRandom(actors,filmActors[aInf[actorUri][info].title])];
			var other1 = getRandom(filmActors[aInf[actorUri][info].title], [name]);
			var other2 = getRandom(filmActors[aInf[actorUri][info].title], [name, other1]);
			var other3 = getRandom(filmActors[aInf[actorUri][info].title], [name, other1, other2]);
			if(other1!=undefined&&other2!=undefined&&other3!=undefined){
				answers.push(other1,other2,other3);
				var position = randomize(answers, 0);
				storeQuestion("a",
					{
						question: "Who didn't appear in "+aInf[actorUri][info].title+"?",
						answers: answers,
						imdb: aInf[actorUri][info].imdb,
						fb: aInf[actorUri][info].fb,
						correct: position
					});
			}
		}
	}
	randomizeBuckets();
}

function getRandom(arr, except) {
	var arr2 = [];
	for(var i=0; i<arr.length; i++)
		if(except.indexOf(arr[i])<0)
			arr2.push(arr[i]);
	return arr2[Math.floor(Math.random()*arr2.length)];
}
var characters = [];
var actorCharacters = [];
var filmCharacters = [];
var filmActors = [];
var directors = [];
var actors = [];
function loadOthers(actorUri, name){
	// Get other actors and characters from the films:
	var q = 'SELECT DISTINCT ?title ?name ?char WHERE {'
		+ '	?film movie:actor <'+actorUri+'>;'
		+ '		rdfs:label ?title;'
		+ '		movie:performance ?perf.'
		+ '	?actor movie:performance ?perf;'
		+ '		movie:actor_name ?name.'
		+ '	?perf movie:performance_character ?char.'
		+ '}';
	aName=name;
	aUri=actorUri;
	sparqlQuery(q, 'cbLoadOthers');
}

function cbLoadOthers(data){
	var name=aName;
	var actorUri=aUri;
	var results = data.query.results.sparql.results.result;
	for(var i=0;i<results.length;i++){
		if(results[i].binding[2].literal!=null){
			characters.push(results[i].binding[2].literal);
			if(filmCharacters[results[i].binding[0].literal]==undefined)
				filmCharacters[results[i].binding[0].literal] = [];
			filmCharacters[results[i].binding[0].literal].push(results[i].binding[2].literal);
		}
		if(filmActors[results[i].binding[0].literal]==undefined)
			filmActors[results[i].binding[0].literal] = [];
		filmActors[results[i].binding[0].literal].push(results[i].binding[1].literal);
		actors.push(results[i].binding[1].literal);
	}
	generateQuestions(actorUri, name);
}

var lastQuestion = null;
var correct = 0;
var total = 0;
var questions = [];
function clearQuestions() {
	characters = [];
	actorCharacters = [];
	filmCharacters = [];
	filmActors = [];
	directors = [];
	actors = [];
	questions = [];
}

function storeQuestion(type, question) {
	if(questions[type]==undefined) {
		questions[type] = [];
	}
	questions[type].push(question);
}
function getQuestion() {
	var qs = questions;
	var qTypes = [];
	for(i in qs) {
		if(qs[i].length>0) {
			qTypes.push(i);
		}
	}
	if(qTypes.length==0) {
		$('#personSearch').html('<p>Hey, there are no more questions left, try searching a different actor or actress...</p>');
		return null;
	}
	return qs[qTypes[Math.floor(Math.random()*qTypes.length)]].pop();
}

function loadQuestion() {
	if(lastQuestion!=null)
		answer(-1);
	var q = getQuestion();
	if(q==null) return;
	var questionHtml = '<article class="unanswered question" style="display: none;"><div><b>Q'+(total+1)+'</b> - '+q.question+'</div><ul>';
	$.each(q.answers, function(idx, value) {
		questionHtml += '<li onclick="answer('+idx+')">'+filter(value)+'</li>';
	});
	questionHtml += '</ul></article>';
	$('#currentQuestion').html(questionHtml);
	$('.unanswered').first().show('slow');
	lastQuestion = q;
}
function answer(idx) {
	if(lastQuestion==null) return;
	if(idx==lastQuestion.correct) correct++;
	total++;
	$(".questions").html($("#currentQuestion").html()+$(".questions").html());
	$("#currentQuestion").html("");
	$(".unanswered").first().addClass(idx==lastQuestion.correct ? "ok" : "ko");
	$($(".unanswered").first().find("li")[lastQuestion.correct]).addClass("answerOk");
	if(idx!=lastQuestion.correct) {
		try {
			$($(".unanswered").first().find("li")[idx]).addClass("answerKo");
		} catch(e) {}
	}
	$("li").each(function(idx, value) { $(value).removeAttr("onclick"); });
	var resultHtml = "<p><b>"+(idx==lastQuestion.correct ? "Correct" : "Wrong")+"!</b>";
	if(lastQuestion.imdb!=undefined)
			resultHtml += ' Check the movie in <a href="'+lastQuestion.imdb+'" target="_blank">IMDB</a>.';
	if(lastQuestion.fb!=undefined)
			resultHtml += ' Check the movie in <a href="'+lastQuestion.fb+'" target="_blank">Freebase</a>.';
	resultHtml += "</p>";
	$(".unanswered").html($('.unanswered').html()+resultHtml).removeClass("unanswered").addClass("answered");

	$("#points").html("Your score: <b>"+correct+"</b> correct answer"+(correct!=1?"s":"")+" out of <b>"+total+"</b> question"+(total!=1?"s":""));
	lastQuestion = null;
	if(idx!=-1)
		setTimeout("loadQuestion()", 1000);
}

function randomize(array, position) {
	var i=array.length;
	while(i--){
		var j=Math.floor(Math.random()*(i+1));
		var tmp=array[i];
		array[i]=array[j];
		array[j]=tmp;
		if(i==position) position = j;
		else if(j==position) position = i;
	}
	return position;
}
function randomizeBuckets() {
	for(i in questions)
		randomize(questions[i],0);
}
function filter(val) {
	if(val==undefined)
		return "The Lamb Brothers";
	return val;
}
