import angular from 'angular';
import angularMeteor from 'angular-meteor';

//Templates
import template from '../views/tournament_tournamentSummary.html';

import { Tournaments } from '../models/tournaments';
import { Stages } from '../models/stages';
import { TournamentCompetitors } from '../models/tournamentCompetitors';

const name = 'tournament_tournamentSummary';

export default angular.module(name, [
    angularMeteor,
])
    .controller("tournament_tournamentSummaryController", function($scope, $reactive, $location, $routeParams){
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournaments");
        this.subscribe("tournamentCompetitors");
        this.subscribe("stages");

        this.url = "";
        this.tournamentId = "";

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

        //File variable declaration
        var csvFile, compList, updatedCompList, incorrectCompList, compListOverMax;

        this.autorun(()=> {
            this.url = $routeParams.url;

            this.tournament =  Tournaments.findOne({URL: this.getReactively("url")});

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
            findTournamentCompetitors(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true});
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

        //Add individual competitor
        this.addCompetitor = ()=> {
            var compSet = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true});
            var compArray = [];
            var competitor = {};
            var flag = false;

            var tournament = Tournaments.findOne({URL: this.getReactively('url')});
            var maxCompetitors = tournament.maxCompetitors;
            var currCompCount = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();


            if (this.compName && this.compEmail) {
                competitor = {
                    name: this.compName,
                    email: this.compEmail
                };
                compSet.forEach((val) => {
                    if (competitor.email === val.email) {
                        flag = true;
                    }
                });
            }
            if (competitor.name !== undefined && competitor.name !== null && competitor.name !== ""
                && competitor.email !== undefined && competitor.email !== null && competitor.email !== "") {
                if(currCompCount < maxCompetitors) {
                    if (this.tournamentId && competitor && !flag) {
                        this.competitorLoaded = true;
                        compArray.push(competitor);
                        Meteor.call('tournamentCompetitors.insert', this.tournamentId, compArray);
                        this.compName = "";
                        this.compEmail = "";
                    }
                    else {
                        this.emailWarning = true;
                        this.emailOutput += competitor.email + '\n';
                        this.compName = "";
                        this.compEmail = "";
                    }
                }
                else {
                    this.compWarning = true;
                    this.compOutput += competitor.email + '\n';
                    this.compName = "";
                    this.compEmail = "";
                }
            }
        };

        //Retrieve CSV file from the view scope
        $scope.handleFiles = (files)=> {
            if(files) {
                this.getAsText(files[0]);
            }
        };

        //Gets file as blob
        this.getAsText = (fileToRead)=> {
            var reader = new FileReader();
            reader.readAsText(fileToRead);
            reader.onload = this.loadHandler;
            reader.onerror = this.errorHandler;
        };

        this.loadHandler = (event)=> {
            csvFile = event.target.result;
            this.processData(csvFile);
        };

        this.errorHandler = (evt)=> {
            if(evt.target.error.name == "NotReadableError"){
                alert("Cannot read file.")
            }
        };

        //File reader
        this.processData = (csv)=> {
            var compSet = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true});
            var allTextLines = csv.split(/\r\n|\n/);
            var flag = false;
            var competitor = {};

            var tournament = Tournaments.findOne({URL: this.getReactively('url')});
            var maxCompetitors = tournament.maxCompetitors;
            var currCompCount = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();

            compList = [];
            incorrectCompList = [];
            compListOverMax = [];

            for (var i = 0; i < allTextLines.length; i++) {
                var data = allTextLines[i].split(',');
                if(data.length && !checkBlank(data)){
                    competitor = {
                        name: data[0],
                        email: data[1]
                    };
                    compSet.forEach((val)=>{
                        if(competitor.email === val.email){
                            incorrectCompList.push(competitor);
                            flag = true;
                        }
                    });
                    if(!flag){
                        if(currCompCount < maxCompetitors){
                            compList.push(competitor);
                        }
                        else{
                            compListOverMax.push(competitor);
                        }
                    }
                    else{
                        flag = false;
                    }
                }
            }

            function checkBlank(str){
                return (!str || /^\s*$/.test(str))
            }
        };

        //Upload data from file reader
        this.uploadCompFile = ()=> {
            var tournament = Tournaments.findOne({URL: this.getReactively('url')});
            var maxCompetitors = tournament.maxCompetitors;
            var currCompCount = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            var count = 0;

            updatedCompList = [];

            if(incorrectCompList.length){
                this.emailWarning = true;
                for(var i = 0; i < incorrectCompList.length; i++){
                    this.emailOutput += incorrectCompList[i].email + '\n';
                }
            }
            if(tournament._id && compList) {
                if(compListOverMax.length > 0){
                    this.compWarning = true;
                    for(var i = 0; i < compListOverMax.length; i++){
                        this.compOutput += compListOverMax[i].email + '\n';
                    }
                }
                else{
                    this.competitorLoaded = true;
                    for(var i = 0; i < compList.length && currCompCount < maxCompetitors; i++){
                        updatedCompList.push(compList[i]);
                        count++;
                        currCompCount++;
                    }
                    if(updatedCompList.length < compList.length){
                        compListOverMax = [];
                        for(var i = count; i < compList.length; i++){
                            compListOverMax.push(compList[i]);
                        }
                        Meteor.call('tournamentCompetitors.insert', tournament._id, updatedCompList);
                        Meteor.call('tournaments.updateActiveCompetitors', tournament._id);
                        this.compWarning = true;
                        for(var i = 0; i < compListOverMax.length; i++){
                            this.compOutput += compListOverMax[i].email + '\n';
                        }
                    }
                    else{
                        Meteor.call('tournamentCompetitors.insert', tournament._id, compList);
                        Meteor.call('tournaments.updateActiveCompetitors', tournament._id);
                    }
                }
            }
            compList = "";
            csvFile = "";
            var input = $("#compFileUpload");
            input.replaceWith(input.val('').clone(true));
        };

        //Edit competitor fields
        this.editComp = (comp)=> {
            var compSet = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true});
            var flag = false;
            this.editWarning = false;
            if(this.compEditName !== undefined && this.compEditName !== null
                && this.compEditName !== "" && this.compEditEmail !== undefined
                && this.compEditEmail !== null && this.compEditEmail !== "") {
                compSet.forEach((val) => {
                    if (this.compEditEmail === val.email) {
                        if (this.compEditEmail !== comp.email) {
                            flag = true;
                        }
                    }
                });
                if (!flag) {
                    this.emailWarning = false;
                    this.emailOutput = "";
                    comp.toggle = !comp.toggle;
                    Meteor.call("tournamentCompetitors.updateValues", comp._id, this.compEditName, this.compEditEmail);
                }
                else {
                    this.emailWarning = true;
                    this.emailOutput += this.compEditEmail + '\n';
                    this.compEditName = comp.name;
                    this.compEditEmail = comp.email;
                }
            }
            else{
                this.editWarning = true;
            }
            this.editCompetitor = false;
        };

        //Toggle edit options
        this.toggleEdit = (comp)=> {
            if(!this.editCompetitor){
                this.editCompetitor = true;
            }
            else{
                this.editCompetitor = false;
            }
            comp.toggle = !comp.toggle;
            this.editWarning = false;
            this.emailWarning = false;
            this.emailOutput = "";
            this.compEditName = comp.name;
            this.compEditEmail = comp.email;
        };

        this.removeCompetitor = (id)=> {
            bootbox.confirm({
                message: '<h2><strong>Are you sure you want to delete this competitor?</strong></h2>',
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Confirm'
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel'
                    }
                },
                callback: (result)=> {
                    if(result){
                        this.competitorLoaded = false;
                        Meteor.call("tournamentCompetitors.remove", id);
                        Meteor.call('tournaments.updateActiveCompetitors', this.tournamentId);
                    }
                }
            });
        };

        this.generateTournament = () => {
            var currentStage = Tournaments.findOne(this.tournamentId).currentStage;
            var stageType = Stages.findOne({tournamentId: this.tournamentId, stageNumber: currentStage}).type;
            switch (stageType) {
                case 'Single Elimination':
                    $location.path('/tournament/' + this.url + '/' + currentStage + '/single_elimination');
                    break;
                case 'Double Elimination':
                    $location.path('tournament/' + this.url + '/' + currentStage + '/double_elimination');
                    break;
                case 'Round Robin':
                    $location.path('tournament/' + this.url + '/' + currentStage + '/round_robin');
                    break;
                case 'Multilevel':
                    $location.path('tournament/' + this.url + '/' + currentStage + '/multilevel');
                    break;
                default:
                    console.log("Generate tournament routing failure");
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
    })
    .component(name, {
        templateUrl: template,
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/tournament/:url', {
            templateUrl: template,
        });
}