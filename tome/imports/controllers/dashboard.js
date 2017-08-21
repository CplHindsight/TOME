import angular from 'angular';
import angularMeteor from 'angular-meteor';

import { Meteor } from 'meteor/meteor';

import { Tournaments } from '../models/tournaments';
import { Leagues } from '../models/leagues';

//Templates
import template from '../views/dashboard.html';

const name = 'dashboard';

export default angular.module(name, [
    angularMeteor
])
    .controller("dashboardController", function($scope, $reactive, $location){
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournaments");
        this.subscribe("leagues");

        this.isLeague = false;
        this.leagueError = false;
        this.leagueName = "";
        this.organizerId = "";

        this.autorun(()=> {
            this.organizerId = Meteor.userId();
        });

        this.helpers({
            Tournaments(){
                return Tournaments.find({organizerId: Meteor.userId(), generatedFrom: "createTournament"}, {sort: {dateLastActive: -1}});
            },
            findOneLeague(){
                return Leagues.findOne({organizerId: this.getReactively("organizerId")});
            }
        });

        this.checkLeague = ()=> {
            var self = this;
            self.leagueFlag = Leagues.findOne({organizerId: Meteor.userId()});
            if(!self.leagueFlag){
                this.isLeague = true;
            }
            else{
                this.leagueError = true;
            }
        };

        this.createLeague = ()=> {
            var url = urlGenerator();
            var flag = false;

            while(!flag){
                if(Leagues.findOne({URL: url}) !== undefined){
                    url = urlGenerator();
                }
                else{
                    flag = true;
                }
            }
            if(this.leagueName !== null && this.leagueName !== undefined && this.leagueName !== ""){
                this.league = {
                    name: this.leagueName,
                    URL: url,
                    organizerId: Meteor.userId()
                };
                Meteor.call('leagues.insert', this.league);
                $location.path("/league/" + this.league.URL);
            }
        };

        this.deleteLeague = (leagueId)=> {
            bootbox.confirm({
                message: '<h2><strong>Are you sure you want to delete this league?</strong></h2>',
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
                        Meteor.call("leagues.delete", leagueId);
                        this.leagueError = false;
                    }
                }
            });
        };

        this.deleteTournament = (tournamentId)=> {
            bootbox.confirm({
                message: '<h2><strong>Are you sure you want to delete this tournament?</strong></h2>',
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
                        Meteor.call("tournaments.deleteTournament", tournamentId);
                    }
                }
            });
        };

    })
    .component(name, {
        templateUrl: template
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/dashboard', {
            templateUrl: template
        });
}

function formatString(name){
    return name.replace(/\s/g, "_");
}

function urlGenerator(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}