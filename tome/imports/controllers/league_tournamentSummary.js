import angular from 'angular';
import angularMeteor from 'angular-meteor';
import { Session } from 'meteor/session';

//Templates
import template from '../views/league_tournamentSummary.html';

import { Tournaments } from '../models/tournaments';
import { Stages } from '../models/stages';
import { Leagues } from '../models/leagues';
import { LeagueCompetitors } from "../models/leagueCompetitors";
import { TournamentCompetitors } from "../models/tournamentCompetitors";

const name = 'league_tournamentSummary';

export default angular.module(name, [
    angularMeteor,
])
    .controller("league_tournamentSummaryController", function($scope, $reactive, $location, $route, $routeParams){
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournaments");
        this.subscribe("leagues");
        this.subscribe("leagueCompetitors");
        this.subscribe("tournamentCompetitors");
        this.subscribe("stages");

        this.url = "";
        this.tournament = "";
        this.tournamentId = "";
        this.league = "";
        this.leagueId = "";

        this.stages = "";

        this.viewComp = false;

        this.emailWarning = false;
        this.editWarning = false;
        this.compWarning = false;
        this.emailOutput = "";
        this.compOutput = "";
        this.competitorLoaded = false;
        this.editCompetitor = false;
        this.coordinatorPasswordEntered = "";
        this.badCoordinatorPassword = false;

        this.autorun(()=> {
            this.url = $routeParams.url;

            this.tournament =  Tournaments.findOne({URL: this.getReactively("url")});

            if(this.tournament){
                this.league = Leagues.findOne({_id: this.getReactively("tournament.leagueId")});
                if(this.league){
                    this.leagueId = this.league._id;
                }
                Session.clear("rereouted");
                Session.clear("reloaded");
            }

            this.tournamentHandle = this.subscribe("tournaments", ()=> [], {
                onReady() {
                    var self = this;
                    var tournament = Tournaments.findOne({URL: self.getReactively("url")});
                    if (tournament) {
                        self.tournamentId = tournament._id;
                        self.stageHandle = self.subscribe("stages", ()=> [], {
                            onStart() {},
                            onReady(){
                                var self = this;
                                self.stages = Stages.find({tournamentId: self.tournamentId});
                                self.stageHandle.stop();
                            },
                            onStop(error) {
                                if (error) {
                                    console.log(error);
                                }
                            }
                        });
                    }
                    self.tournamentHandle.stop();
                }
            });
        });

        this.helpers({
            findTournament(){
                return Tournaments.findOne({URL: this.getReactively('url')});
            },
            findStages(){
                return Stages.find({tournamentId: this.getReactively('tournamentId')});
            },
            stagesCount(){
                return Stages.find({tournamentId: this.getReactively('tournamentId')}).count();
            },
            findLeagueCompetitors(){
                return LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true});
            },
            leagueCompetitorsCount(){
                return LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true}).count();
            },
            hasLeagueCompetitors() { //used for spinner if necessary
                return (LeagueCompetitors.findOne({leagueId: this.getReactively("leagueId"), isActive: true}) !== undefined);
            },
            tournamentCompetitorsCount(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            },
            hasTournamentCompetitors() { //used for spinner if necessary
                return (TournamentCompetitors.findOne({tournamentId: this.getReactively("tournamentId"), isActive: true}) !== undefined);
            },
            tournamentHasStarted() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                return t && t.currentRound === 0 && t.currentStage === 1;
            },
            tournamentCurrentStage() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                return (t && (t.currentStage > 1 || (t.currentStage === 1 && t.currentRound > 0))) ? t.currentStage : 0;
            },
            isOrganizer() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                return t ? t.organizerId === Meteor.userId() : false;
            }
        });

        this.isCoordinator = () => {
            var t = Tournaments.findOne(this.getReactively("tournamentId"));
            return t && Session.get("tournamentCoordinator") ? t._id === Session.get("tournamentCoordinator") : false;
        };

        this.loginCoordinator = () => {
            var t = Tournaments.findOne(this.getReactively("tournamentId"));
            if (t && this.coordinatorPasswordEntered === t.coordinatorPassword) {
                Session.setPersistent("tournamentCoordinator", this.tournamentId);
                this.badCoordinatorPassword = false;
            }
            else {
                this.badCoordinatorPassword = true;
            }
        };

        this.checkStageType = ()=> {
            return Stages.findOne({tournamentId: this.getReactively('tournamentId'), type: 'Multilevel'}) ? true : false;
        };

        this.checkStageCriteria = ()=> {
            return Stages.find({tournamentId: this.getReactively('tournamentId')}).count() > 1 ? true : false;
        };

        this.outputTypeCriteria = (stage)=> {
            var output = "";
            if(stage.type === "Multilevel"){
                output = stage.rounds;
            }
            return output;
        };

        this.outputStageCriteria = (stage)=> {
            var output = "";
            if(stage.cutoffCriteria === null){
                output = "None";
            }
            else if(stage.cutoffCriteria === 'n'){
                output = stage.cutoffNumber + " players";
            }
            else{
                output = stage.cutoffNumber * 100 + '%';
            }
            return output;
        };

        this.dashboard = ()=>{
            $location.path("/dashboard");
        };

        this.viewCompetitors = ()=> {
            this.viewComp = true;
        };

        this.hideCompetitors = ()=> {
            this.viewComp = false;
        };

        this.generateTournament = () => {
            var currentStage = Tournaments.findOne(this.tournamentId).currentStage;
            var stageType = Stages.findOne({tournamentId: this.tournamentId, stageNumber: currentStage}).type;

            switch (stageType) {
                case 'Single Elimination':
                    $location.path('/tournament/' + this.url + '/' + currentStage + '/single_elimination');
                    break;
                case 'Double Elimination':
                    $location.path('/tournament/' + this.url + '/' + currentStage + '/double_elimination');
                    break;
                case 'Round Robin':
                    $location.path('/tournament/' + this.url + '/' + currentStage + '/round_robin');
                    break;
                case 'Multilevel':
                    $location.path('/tournament/' + this.url + '/' + currentStage + '/multilevel');
                    break;
                default:
                    console.log("Generate league tournament routing failure");
            }
        };

        this.checkTournamentStarted = ()=> {
            var tournament = Tournaments.findOne({URL: this.getReactively('url')});
            if(tournament){
                return tournament.currentRound > 0 ? true : false;
            }
        };

        this.goToStage = (stage) => {
            $location.path("/tournament/" + this.url + "/" + stage + "/multilevel");
        };

        this.findEnrolledCompetitor = (comp)=> {
            var tournamentComp = TournamentCompetitors.findOne({tournamentId: this.getReactively("tournamentId"),
                name: comp.name, isActive: true});
            return tournamentComp ? true : false;
        };

        this.updateTournamentCompetitor = (enrolled, comp)=> {
            var tournament = Tournaments.findOne({URL: this.getReactively('url')});
            var competitorsCount = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            var maxCompetitorCount = Tournaments.findOne({URL: this.getReactively('url')}).maxCompetitors;
            var compArray = [];
            if(tournament) {
                if (!enrolled && competitorsCount < maxCompetitorCount) {
                    var competitor = {
                        name: comp.name,
                        leagueCompetitorId: comp._id,
                        ELO: comp.ELO !== null ? comp.ELO : 1600
                    };
                    comp.enrolled = !comp.enrolled;
                    compArray.push(competitor);
                    Meteor.call("tournamentCompetitors.insert", tournament._id, compArray, this.leagueId);
                }
                else if(enrolled){
                    Meteor.call("tournamentCompetitors.removeLeagueCompetitor", tournament._id, comp._id);
                    if(comp.enrolled === undefined){
                        comp.enrolled = false;
                    }
                    else{
                        comp.enrolled = !comp.enrolled;
                    }
                }
            }
        };

        this.maxCompReached = ()=> {
            var competitorsCount = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            var maxCompetitorCount = Tournaments.findOne({URL: this.getReactively('url')}).maxCompetitors;
            return competitorsCount === maxCompetitorCount ? true : false;
        };
    })
    .component(name, {
        templateUrl: template,
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/league/tournament/:url', {
            templateUrl: template,
        });
}