//System Imports
import angular from 'angular';
import angularMeteor from 'angular-meteor';
import ngRoute from 'angular-route';

import { Meteor } from 'meteor/meteor';

//Application Controller Imports
import { name as Login } from '../imports/controllers/login';
import { name as Navigation } from '../imports/controllers/navigation';
import { name as Dashboard } from '../imports/controllers/dashboard';
import { name as About } from '../imports/controllers/about';
import { name as verify } from '../imports/controllers/verify';
import { name as resetPwd } from '../imports/controllers/reset-password';
import { name as QuickfireTournament } from '../imports/controllers/quickfire_tournament';
import { name as Help } from '../imports/controllers/help';

//Tournaments Controller Imports
import { name as Tournament_CreateTournament } from '../imports/controllers/tournament_createTournament';
import { name as Tournament_TournamentSummary } from '../imports/controllers/tournament_tournamentSummary';
import { name as Tournament_SingleElimination } from '../imports/controllers/tournament_single_elimination';
import { name as Tournament_DoubleElimination } from '../imports/controllers/tournament_double_elimination';
import { name as Tournament_RoundRobin } from '../imports/controllers/tournament_round_robin';
import { name as Tournament_Multilevel } from '../imports/controllers/tournament_multilevel';
import { name as Tournament_Standings } from '../imports/controllers/tournament_standings';

//Leagues Controller Imports
import { name as League_Dashboard } from '../imports/controllers/league_dashboard';
import { name as League_CreateTournament } from '../imports/controllers/league_createTournament';
import { name as League_TournamentSummary } from '../imports/controllers/league_tournamentSummary';

//Model Imports
import { Stages } from '../imports/models/stages';
import { Tournaments } from '../imports/models/tournaments';
import { Leagues } from '../imports/models/leagues';

angular.module('tome', [
    //Application Injectors
    angularMeteor,
    Navigation,
    ngRoute,
    Login,
    Dashboard,
    About,
    verify,
    resetPwd,
    QuickfireTournament,
    Help,
    //Tournament Injectors
    Tournament_CreateTournament,
    Tournament_TournamentSummary,
    Tournament_Standings,
    Tournament_SingleElimination,
    Tournament_DoubleElimination,
    Tournament_Multilevel,
    Tournament_RoundRobin,
    //League Injectors
    League_Dashboard,
    League_CreateTournament,
    League_TournamentSummary,
    'accounts.ui'
])
    .config(config)
    .run(run);

function config($locationProvider, $routeProvider){
    'ngInject';
    $locationProvider.html5Mode(true);
    $routeProvider.otherwise('/login');
}

function run($rootScope, $location){
    'ngInject';
    Tracker.autorun(()=> {
        var tournamentType = new RegExp("/tournament/[a-zA-Z0-9]{8}/[0-9]+/(single_elimination|round_robin|multilevel|double_elimination)");
        if(!Meteor.userId() && $location.url() === "/about"){
            $location.path("/about");
        }
        else if(!Meteor.userId() && $location.url() === "/help"){
            $location.path("/help");
        }
        else if(!Meteor.userId() && $location.url() === "/quickfire_tournament"){
            $location.path("/quickfire_tournament");
        }
        else if (!Meteor.userId() && ($location.url().startsWith("/verify-email") || $location.url().startsWith("/reset-password"))) {
            $location.path($location.url());
        }
        else if (Meteor.userId() && $location.url() === "/login"){
            $location.path("/dashboard");
        }
        else if (Meteor.userId() && $location.url() === "/createTournament"){
            $location.path("/createTournament");
        }
        else if ($location.url().startsWith("/tournament/") || $location.url().startsWith("/league")) {
            if (tournamentType.test($location.url())) {
                var partsOfUrl = $location.url().split('/');
                var urlStageType, urlStageNumber, urlTournamentURL;
                if(partsOfUrl[1] === "league"){
                    urlTournamentURL = partsOfUrl[3]; //tournamentURL
                    urlStageNumber = partsOfUrl[4]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[5]; //tournament type (if present)
                }
                else{
                    urlTournamentURL = partsOfUrl[2]; //tournamentURL
                    urlStageNumber = partsOfUrl[3]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[4]; //tournament type (if present)
                }
                if (isNaN(parseInt(urlStageNumber))) {
                    $location.path("/tournament/" + urlTournamentURL);
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
                var tournament = Tournaments.findOne({URL: urlTournamentURL});
                if (tournament) {
                    var stage = Stages.findOne({tournamentId: tournament._id, stageNumber: parseInt(urlStageNumber)});
                    if (stage) {
                        switch (stage.type) {
                            case 'Single Elimination':
                                if (urlStageType !== 'single_elimination') {
                                    $location.path("/tournament/" + urlTournamentURL + "/" + urlStageNumber + "/single_elimination");
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Double Elimination':
                                if (urlStageType !== 'double_elimination') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/double_elimination');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Round Robin':
                                if (urlStageType !== 'round_robin') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/round_robin');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Multilevel':
                                if (urlStageType !== 'multilevel') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/multilevel');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            default:
                                console.log("Routing failure in client main");
                        }
                    }
                    else {
                        //$location.path("/tournament/" + urlTournamentURL);
                        $location.path("/login");
                        if(!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    }
                }
            }
        }
        else if(!Meteor.userId()){
            $location.path('/login');
        }
        else if (Meteor.userId() && $location.url()){
            $location.path($location.url());
        }
    });

    $rootScope.$on("$routeChangeStart", function(event, next, prev){
        var tournamentType = new RegExp("/tournament/[a-zA-Z0-9]{8}/.+/(single_elimination|round_robin|multilevel|double_elimination)");
        if(!Meteor.userId() && $location.url() === "/about"){
            $location.path("/about");
        }
        else if(!Meteor.userId() && $location.url() === "/help"){
            $location.path("/help");
        }
        else if(!Meteor.userId() && $location.url() === "/quickfire_tournament"){
            $location.path("/quickfire_tournament");
        }
        else if (!Meteor.userId() && ($location.url().startsWith("/verify-email") || $location.url().startsWith("/reset-password"))) {
            $location.path($location.url());
        }
        else if (Meteor.userId() && $location.url() === "/login"){
            $location.path("/dashboard");
        }
        else if (Meteor.userId() && $location.url() === "/createTournament"){
            $location.path("/createTournament");
        }
        else if ($location.url().startsWith("/tournament/") || $location.url().startsWith("/league")){
            if (tournamentType.test($location.url())) {
                var partsOfUrl = $location.url().split('/');
                var urlStageType, urlStageNumber, urlTournamentURL;
                if(partsOfUrl[1] === "league"){
                    urlTournamentURL = partsOfUrl[3]; //tournamentURL
                    urlStageNumber = partsOfUrl[4]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[5]; //tournament type (if present)
                }
                else{
                    urlTournamentURL = partsOfUrl[2]; //tournamentURL
                    urlStageNumber = partsOfUrl[3]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[4]; //tournament type (if present)
                }
                if (isNaN(parseInt(urlStageNumber))) {
                    if(partsOfUrl[1] === "tournament") {
                        $location.path("/tournament/" + urlTournamentURL);
                    }
                    else{
                        $location.path("/league/tournament/" + urlTournamentURL);
                    }
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
                var tournament = Tournaments.findOne({URL: urlTournamentURL});
                if (tournament) {
                    var stage = Stages.findOne({tournamentId: tournament._id, stageNumber: parseInt(urlStageNumber)});
                    if (stage) {
                        switch (stage.type) {
                            case 'Single Elimination':
                                if (urlStageType !== 'single_elimination') {
                                    if(partsOfUrl[1] === "tournament") {
                                        $location.path("/tournament/" + urlTournamentURL + "/" + urlStageNumber + "/single_elimination");
                                    }
                                    else{
                                        $location.path("/league/tournament/" + urlTournamentURL + "/" + urlStageNumber + "/single_elimination");
                                    }
                                    if(!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Double Elimination':
                                if (urlStageType !== 'double_elimination') {
                                    if(partsOfUrl[1] === "tournament") {
                                        $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/double_elimination');
                                    }
                                    else{
                                        $location.path('/league/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/double_elimination');
                                    }
                                    if(!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Round Robin':
                                if (urlStageType !== 'round_robin') {
                                    if(partsOfUrl[1] === "tournament") {
                                        $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/round_robin');
                                    }
                                    else{
                                        $location.path('/league/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/round_robin');
                                    }
                                    if(!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Multilevel':
                                if (urlStageType !== 'multilevel') {
                                    if(partsOfUrl[1] === "tournament") {
                                        $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/multilevel');
                                    }
                                    else{
                                        $location.path('/league/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/multilevel');
                                    }

                                    if(!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            default:
                                console.log("Routing failure in client main");
                        }
                    }
                    else {
                        if(partsOfUrl[1] === "tournament") {
                            $location.path('/tournament/' + urlTournamentURL);
                        }
                        else{
                            $location.path('league/tournament/' + urlTournamentURL);
                        }
                        if(!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    }
                }
            }
        }
        else if(!Meteor.userId()){
            $location.path('/login');
        }
        else if (Meteor.userId() && $location.url()){
            $location.path($location.url());
        }
    });
}
Accounts.onEmailVerificationLink(function(token,done) { 
    Accounts.verifyEmail(token, done);
});

/*function run($rootScope, $location, $reactive){
    'ngInject';
    $reactive(this).attach($rootScope);

    this.URL = "";
    this.subscribe("tournaments");
    this.subscribe("leagues");

    Tracker.autorun(()=> {
        var tournamentType = new RegExp("/tournament/[a-zA-Z0-9]{8}/[0-9]+/(single_elimination|round_robin|multilevel|double_elimination)");
        console.log("autorun: " + $location.url());
        if(!Meteor.userId() && $location.url() === "/about"){
            $location.path("/about");
            console.log("about page reached");
        }
        else if(!Meteor.userId() && $location.url() === "/help"){
            $location.path("/help");
            console.log("help page reached");
        }
        else if(!Meteor.userId() && $location.url() === "/quickfire_tournament"){
            $location.path("/quickfire_tournament");
            console.log("quickfire reached");
        }
        else if (!Meteor.userId() && ($location.url().startsWith("/verify-email") || $location.url().startsWith("/reset-password"))) {
            console.log("No user Id, location starts with verifyemail/resetpassword");
            $location.path($location.url());
        }
        else if (Meteor.userId() && $location.url() === "/login"){
            console.log("user logged in, sent to login, redirect to dashboard");
            $location.path("/dashboard");
        }
        else if (Meteor.userId() && $location.url() === "/createTournament"){
            $location.path("/createTournament");
            console.log("create tournament reached");
        }
        else if ($location.url().startsWith("/tournament/") || $location.url().startsWith("/league")) {
            var partsOfUrl = $location.url().split('/');
            /!*
            OPTIONS:
                1: /league/URL
                2: /league/URL/createTournament
                3: /league/tournament/URL
                4: /tournament/URL
                5: /tournament/URL/stageNumber/stageType
                6: /tournament/URL/standings
             *!/
            // cases 1 & 2
            /!*if (partsOfUrl[1] === "league" && partsOfUrl[2] !== "tournament") {
                var league = Leagues.findOne({URL: partsOfUrl[2]});
                console.log("inside league dashboard");
                console.log(league);

                if (!league) {
                    console.log("redirected from league dashboard to main dashboard, no league found");
                    $location.path("/dashboard");
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
            }
            // case 3
            else if (partsOfUrl[1] === "league" && partsOfUrl[2] === "tournament") {
                console.log("inside league with tournament")
                var tournament = Tournaments.findOne({URL: partsOfUrl[3]});
                console.log(tournament);
                if (!tournament) {
                    console.log(tournament);
                    console.log(Session.get("reloaded"));
                    if (Session.get("reloaded")) {
                        Session.clear("reloaded");
                        Session.clear("rerouted");
                        $location.path("/dashboard");
                    }
                    else {
                        console.log("test");
                        console.log("pathname" + $location.pathname);
                        Session.clear("rerouted");
                        Session.setPersistent("reloaded", true);
                        $location.path($location.pathname);
                    }

                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
                else if (!tournament.leagueId) {
                    console.log("no tournament league id");
                    $location.path("/tournament/" + partsOfUrl[3]);
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
            }
            else*!/ if (tournamentType.test($location.url())) {
                var partsOfUrl = $location.url().split('/');
                var urlStageType, urlStageNumber, urlTournamentURL;
                if(partsOfUrl[1] === "league"){
                    urlTournamentURL = partsOfUrl[3]; //tournamentURL
                    urlStageNumber = partsOfUrl[4]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[5]; //tournament type (if present)
                }
                else{
                    urlTournamentURL = partsOfUrl[2]; //tournamentURL
                    urlStageNumber = partsOfUrl[3]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[4]; //tournament type (if present)
                }
                if (isNaN(parseInt(urlStageNumber))) {
                    $location.path("/tournament/" + urlTournamentURL);
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
                var tournament = Tournaments.findOne({URL: urlTournamentURL});
                console.log(tournament);
                if (tournament) {
                    var stage = Stages.findOne({tournamentId: tournament._id, stageNumber: parseInt(urlStageNumber)});
                    console.log(stage);
                    if (stage) {
                        switch (stage.type) {
                            case 'Single Elimination':
                                if (urlStageType !== 'single_elimination') {
                                    $location.path("/tournament/" + urlTournamentURL + "/" + urlStageNumber + "/single_elimination");
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Double Elimination':
                                if (urlStageType !== 'double_elimination') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/double_elimination');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Round Robin':
                                if (urlStageType !== 'round_robin') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/round_robin');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Multilevel':
                                if (urlStageType !== 'multilevel') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/multilevel');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            default:
                                console.log("Routing failure in client main");
                        }
                    }
                    else {
                        console.log("check");
                        $location.path("/login");
                        if(!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    }
                }
            }
        }
        else if(!Meteor.userId()){
            console.log("no user Id");
            $location.path('/login');
        }
        else if (Meteor.userId() && $location.url()){
            console.log($location.url());
            $location.path($location.url());
        }

    });

    $rootScope.$on("$routeChangeStart", function(event, next, prev){
        var tournamentType = new RegExp("/tournament/[a-zA-Z0-9]{8}/.+/(single_elimination|round_robin|multilevel|double_elimination)");
        console.log("onchange: " + $location.url());
        if(!Meteor.userId() && $location.url() === "/about"){
            $location.path("/about");
            console.log("onchange about page reached");
        }
        else if(!Meteor.userId() && $location.url() === "/help"){
            $location.path("/help");
            console.log("onchange help page reached");
        }
        else if(!Meteor.userId() && $location.url() === "/quickfire_tournament"){
            $location.path("/quickfire_tournament");
            console.log("onchange quickfire reached");
        }
        else if (!Meteor.userId() && ($location.url().startsWith("/verify-email") || $location.url().startsWith("/reset-password"))) {
            console.log("onchange No user Id, location starts with verifyemail/resetpassword");
            $location.path($location.url());
        }
        else if (Meteor.userId() && $location.url() === "/login"){
            console.log("onchange user logged in, sent to login, redirect to dashboard");
            $location.path("/dashboard");
        }
        else if (Meteor.userId() && $location.url() === "/createTournament"){
            $location.path("/createTournament");
            console.log("onchange create tournament reached");
        }
        else if ($location.url().startsWith("/tournament/") || $location.url().startsWith("/league")) {
            var partsOfUrl = $location.url().split('/');
            /!*
             OPTIONS:
             1: /league/URL
             2: /league/URL/createTournament
             3: /league/tournament/URL
             4: /tournament/URL
             5: /tournament/URL/stageNumber/stageType
             *!/
            // cases 1 & 2
            /!*if (partsOfUrl[1] === "league" && partsOfUrl[2] !== "tournament") {
                var league = Leagues.findOne({URL: partsOfUrl[2]});
                console.log("onchange inside league dashboard");
                console.log(league);
                if (!league) {
                    console.log("onchange redirected from league dashboard to main dashboard, no league found");
                    $location.path("/dashboard");
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
            }
            // case 3
            else if (partsOfUrl[1] === "league" && partsOfUrl[2] === "tournament") {
                console.log("onchange inside league with tournament")
                var tournament = Tournaments.findOne({URL: partsOfUrl[3]});
                console.log(tournament);
                if (!tournament) {
                    console.log(tournament);
                    console.log(Session.get("reloaded"));
                    if (Session.get("reloaded")) {
                        Session.clear("reloaded");
                        Session.clear("rerouted");
                        $location.path("/dashboard");
                    }
                    else {
                        Session.clear("reloaded");
                        Session.setPersistent("reloaded", true);
                        $location.path($location.pathname);
                    }
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
                else if (!tournament.leagueId) {
                    console.log("onchange no tournament league id");
                    $location.path("/tournament/" + partsOfUrl[3]);
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
            }
            else *!/if (tournamentType.test($location.url())) {
                var partsOfUrl = $location.url().split('/');
                var urlStageType, urlStageNumber, urlTournamentURL;
                if(partsOfUrl[1] === "league"){
                    urlTournamentURL = partsOfUrl[3]; //tournamentURL
                    urlStageNumber = partsOfUrl[4]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[5]; //tournament type (if present)
                }
                else{
                    urlTournamentURL = partsOfUrl[2]; //tournamentURL
                    urlStageNumber = partsOfUrl[3]; //stage number(if present) or "standings"
                    urlStageType = partsOfUrl[4]; //tournament type (if present)
                }
                if (isNaN(parseInt(urlStageNumber))) {
                    $location.path("/tournament/" + urlTournamentURL);
                    if(!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                }
                var tournament = Tournaments.findOne({URL: urlTournamentURL});
                console.log(tournament);
                if (tournament) {
                    var stage = Stages.findOne({tournamentId: tournament._id, stageNumber: parseInt(urlStageNumber)});
                    if (stage) {
                        switch (stage.type) {
                            case 'Single Elimination':
                                if (urlStageType !== 'single_elimination') {
                                    $location.path("/tournament/" + urlTournamentURL + "/" + urlStageNumber + "/single_elimination");
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Double Elimination':
                                if (urlStageType !== 'double_elimination') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/double_elimination');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Round Robin':
                                if (urlStageType !== 'round_robin') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/round_robin');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            case 'Multilevel':
                                if (urlStageType !== 'multilevel') {
                                    $location.path('/tournament/' + urlTournamentURL + "/" + urlStageNumber + '/multilevel');
                                    if (!$rootScope.$$phase) {
                                        $rootScope.$apply();
                                    }
                                }
                                break;
                            default:
                                console.log("Routing failure in client main");
                        }
                    }
                    else {
                        $location.path("/login");
                        if(!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    }
                }
            }
        }
        else if(!Meteor.userId()){
            console.log("onchage no user id");
            $location.path('/login');
        }
        else if (Meteor.userId() && $location.url()){
            console.log("onchange with user id");
            console.log($location.url());
            $location.path($location.url());
        }
    });
}*/
