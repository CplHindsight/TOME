import angular from 'angular';
import angularMeteor from 'angular-meteor';

//Templates
import template from '../views/quickfire_tournament.html';

import { Tournaments } from '../models/tournaments';
import { Stages } from '../models/stages';
import { TournamentCompetitors } from "../models/tournamentCompetitors";

const name = 'quickfire';

export default angular.module(name, [
    angularMeteor
])
    .controller("quickfireController", function($scope, $reactive, $location){
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournaments");
        this.subscribe("stages");
        this.subscribe("tournamentCompetitors");

        this.helpers({

        });

        this.tournament = {
            name: null,
            maxCompetitors: 0,
            URL: urlGenerator(),
            leagueId: null,
            organizerId: null,
            coordinatorPassword: null,
            stages: [],
            generatedFrom: "quickfireTournament"
        };

        this.stageArray=[
            {
                type: null,
                rounds: 1,
                cutoffCriteria:null,
                cutoffNumber:null,
                stageNumber:1
            }
        ];

        this.submitQuickfire = ()=> {
            this.tournament.stages = [];
            this.tournament.stages.push(this.stageArray[0]);
            this.competitors = [];

            this.tournament.maxCompetitors = parseInt(this.tournament.maxCompetitors);

            var flag = false;
            var count = 0;
            var stageType = this.tournament.stages[0].type;

            while(!flag){
                if(Tournaments.findOne({URL: this.tournament.URL}) !== undefined){
                    this.tournament.URL = urlGenerator();
                }
                else{
                    flag = true;
                }
            }

            while(count < this.tournament.maxCompetitors){
                this.competitors.push({name: (count + 1).toString(), isActive: true});
                count++;
            }

            if(this.tournament.maxCompetitors >= 8 && stageType !== undefined && stageType !== null) {
                Session.setPersistent("qCompetitorLength", this.competitors.length);

                Meteor.call('tournaments.insert', this.tournament, (err, result) => {
                    Meteor.call("stages.insert", result, this.tournament.stages);
                    Meteor.call("tournamentCompetitors.insert", result, this.competitors);
                });

                switch (stageType) {
                    case 'Single Elimination':
                        $location.path('/tournament/' + this.tournament.URL + '/' + this.tournament.stages[0].stageNumber
                            + '/single_elimination');
                        break;
                    case 'Double Elimination':
                        $location.path('tournament/' + this.tournament.URL + '/' + this.tournament.stages[0].stageNumber
                            + '/double_elimination');
                        break;
                    default:
                        console.log("Generate quickfire tournament routing failure");
                }
            }
        };
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/quickfire_tournament', {
            templateUrl: template,
        });
}

function urlGenerator(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 8; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}