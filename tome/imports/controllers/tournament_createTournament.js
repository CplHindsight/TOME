import angular from 'angular';
import angularMeteor from 'angular-meteor';

import { Meteor } from 'meteor/meteor';

//Templates
import template from '../views/tournament_createTournament.html';
import { Tournaments } from '../models/tournaments';
import { Stages } from '../models/stages';

const name = 'createTournament';

export default angular.module("createTournament", [
    angularMeteor,
])
    .controller("createTournamentController", function($scope, $reactive, $location){
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournaments");
        this.subscribe("stages");

        this.stageNum = 0;
        this.typeFlag = 0;
        this.roundsFlag = 0;
        this.numFlag = 0;
        this.freeze = 0;
        this.showOther = false;
        this.incompleteWarning = false;

        this.stageArray=[
            {
                type: null,
                rounds: 1,
                cutoffCriteria:null,
                cutoffNumber:null,
                stageNumber:1
            },
            {
                type: null,
                rounds: 1,
                cutoffCriteria:null,
                cutoffNumber:null,
                stageNumber:2
            },
            {
                type: null,
                rounds: 1,
                cutoffCriteria:null,
                cutoffNumber:null,
                stageNumber:3
            }];


        this.tournament = {
            name: null,
            maxCompetitors: 2,
            URL: urlGenerator(),
            leagueId: null,
            organizerId: Meteor.userId(),
            coordinatorPassword: urlGenerator(),
            stages: [],
            generatedFrom: "createTournament"
        };

        this.reset = ()=>{
            this.stageNum = 0;
            this.typeFlag = 0;
            this.roundsFlag = 0;
            this.numFlag = 0;
            this.freeze = 0;
            this.optFlag = 0;
            this.showOther = false;
            this.incompleteWarning = false;
            this.stageArray=[
                {
                    type: null,
                    rounds: 1,
                    cutoffCriteria:null,
                    cutoffNumber:null,
                    stageNumber:1
                },
                {
                    type: null,
                    rounds: 1,
                    cutoffCriteria:null,
                    cutoffNumber:null,
                    stageNumber:2
                },
                {
                    type: null,
                    rounds: 1,
                    cutoffCriteria:null,
                    cutoffNumber:null,
                    stageNumber:3
                }];


            this.tournament = {
                name: null,
                maxCompetitors: 2,
                URL: urlGenerator(),
                leagueId: null,
                organizerId: Meteor.userId(),
                coordinatorPassword: urlGenerator(),
                stages: [],
                generatedFrom: "createTournament"
            };
        };

        this.nextStage = ()=>{
            this.typeFlag = 0;
            this.roundsFlag = 0;
            this.optFlag = 0;
            this.numFlag = 0;
            if (this.stageArray[this.stageNum].type === null){
                this.typeFlag = 1;
            }
            if (this.stageArray[this.stageNum].rounds < 1 && (this.stageArray[this.stageNum].type === 'Multilevel')){
                this.roundsFlag = 1;
            }
            if (this.stageArray[this.stageNum].type !== 'Single Elimination' && this.stageArray[this.stageNum].type !== 'Double Elimination' && this.stageArray[this.stageNum].cutoffCriteria === null){
                this.optFlag = 1;
            }
            if (this.stageArray[this.stageNum].cutoffCriteria === "o" && (this.stageArray[this.stageNum].cutoffNumber < 2 || this.stageArray[this.stageNum].cutoffNumber > this.tournament.maxCompetitors) ){
                this.numFlag = 1;
            }


            if (!(this.typeFlag || this.roundsFlag || this.optFlag || this.numFlag)){
                this.stageNum = this.stageNum + 1;
                this.freeze = 1;
            }

        };

        this.prevStage = ()=>{
            this.typeFlag = 0;
            this.roundsFlag = 0;
            this.optFlag = 0;
            this.numFlag = 0;
            if (this.stageArray[this.stageNum].type === null){
                this.typeFlag = 1;
            }
            if (this.stageArray[this.stageNum].rounds < 1 && (this.stageArray[this.stageNum].type === 'Multilevel')){
                this.roundsFlag = 1;
            }
            if (this.stageArray[this.stageNum].type !== 'Single Elimination' && this.stageArray[this.stageNum].type !== 'Double Elimination' && this.stageArray[this.stageNum].cutoffCriteria === null){
                this.optFlag = 1;
            }
            if (this.stageArray[this.stageNum].cutoffCriteria === "o" && (this.stageArray[this.stageNum].cutoffNumber < 2 || this.stageArray[this.stageNum].cutoffNumber > this.tournament.maxCompetitors) ){
                this.numFlag = 1;
            }
            if (!(this.typeFlag || this.roundsFlag || this.optFlag || this.numFlag)){
                this.stageNum = this.stageNum - 1;
                this.freeze = 1;
            }
            if (this.stageNum === 0){
                this.freeze = 0;
            }

        };

        this.submit = ()=>{
            var flag = false;
            this.current = 0;
            this.tournament.stages = [];
            while (this.current < 3 && this.stageArray[this.current].type !== null) {

                switch (this.stageArray[this.current].cutoffCriteria) {
                    case 'n':
                        this.stageArray[this.current].cutoffCriteria = 'p';
                        this.stageArray[this.current].cutoffNumber = 1;
                        break;
                    case 'p':
                        this.stageArray[this.current].cutoffNumber = 0.5;
                        break;
                    case 'o':
                        this.stageArray[this.current].cutoffCriteria = 'n';
                        break;
                    case null:
                        this.stageArray[this.current].cutoffNumber = null;

                }

                this.tournament.stages.push(this.stageArray[this.current]);
                this.current = this.current + 1;
            }

            while(!flag){
                if(Tournaments.findOne({URL: this.tournament.URL}) !== undefined){
                    this.tournament.URL = urlGenerator();
                }
                else{
                    flag = true;
                }
            }

            if(this.tournament.name !== null){
                this.tournament.name.trim();
            }

            if(this.tournament.name !== "" && this.tournament.name !== null
                && this.tournament.name !== undefined && this.tournament.maxCompetitors <= 4096
                && this.tournament.maxCompetitors >= 2 && this.tournament.stages.length > 0){
                Meteor.call('tournaments.insert', this.tournament, (err, result)=> {
                    Meteor.call("stages.insert", result, this.tournament.stages);
                    if (this.tournament.leagueId) {
                        Meteor.call('tournaments.updateDateLastActive', this.tournament.leagueId);
                    }
                });
                $location.path("/tournament/" + this.tournament.URL);
                this.incompleteWarning = false;
            }
           else{
                this.incompleteWarning = true;
            }
        };

        this.dashboard = ()=>{
            $location.path("/dashboard");
        };

        function urlGenerator(){
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for( var i=0; i < 8; i++ )
                text += possible.charAt(Math.floor(Math.random() * possible.length));

            return text;
        }
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/createTournament', {
            templateUrl: template,
        });
}