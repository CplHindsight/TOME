import angular from 'angular';
import angularMeteor from 'angular-meteor';

import { Meteor } from 'meteor/meteor';

import template from '../views/help.html';

const name = "help";

export default angular.module(name, [
    angularMeteor
])
    .controller("helpController", function($scope, $reactive, $location){
        'ngInject';
        $reactive(this).attach($scope);

        this.showTournamentHelp = false;
        this.showLeagueHelp = false;
        this.tournamentType = false;
        this.createTournament = false;
        this.tournamentCompetitors = false;
        this.tournamentCoordinators = false;
        this.tournamentStandings = false;
        this.createLeague = false;
        this.leagueCompetitors = false;
        this.leagueTournaments = false;
        this.leagueStandings = false;

        this.autorun(()=> {
            this.showTournamentHelp = true;
            this.tournamentType = true;
        });

        this.helpers(()=> {

        });

        this.selectType = (val)=> {
            switch(val){
                case 't':
                    this.showTournamentHelp = this.switchHelpSections();
                    break;
                case 'l':
                    this.showLeagueHelp = this.switchHelpSections();
                    break;
            }
        };

        this.selectInfo = (val)=> {
            switch (val){
                case 'a':
                    this.tournamentType = this.switchSubCategories();
                    break;
                case 'b':
                    this.createTournament = this.switchSubCategories();
                    break;
                case 'c':
                    this.tournamentCompetitors = this.switchSubCategories();
                    break;
                case 'd':
                    this.tournamentCoordinators = this.switchSubCategories();
                    break;
                case 'e':
                    this.tournamentStandings = this.switchSubCategories();
                    break;
                case 'f':
                    this.createLeague = this.switchSubCategories();
                    break;
                case 'g':
                    this.leagueCompetitors = this.switchSubCategories();
                    break;
                case 'h':
                    this.leagueTournaments = this.switchSubCategories();
                    break;
                case 'i':
                    this.leagueStandings = this.switchSubCategories();
                    break;
            }
        };

        this.switchHelpSections = ()=> {
            this.showTournamentHelp = false;
            this.showLeagueHelp = false;
            this.tournamentType = false;
            this.createTournament = false;
            this.tournamentCompetitors = false;
            this.tournamentCoordinators = false;
            this.createLeague = false;
            this.leagueCompetitors = false;
            this.leagueTournaments = false;
            return true;
        };

        this.switchSubCategories = ()=> {
            this.tournamentType = false;
            this.createTournament = false;
            this.tournamentCompetitors = false;
            this.tournamentCoordinators = false;
            this.tournamentStandings = false;
            this.createLeague = false;
            this.leagueCompetitors = false;
            this.leagueTournaments = false;
            this.leagueStandings = false;
            return true;
        };
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/help', {
            templateUrl: template
        });
}