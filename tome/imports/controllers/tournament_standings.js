import angular from 'angular';
import angularMeteor from 'angular-meteor';
import { Meteor } from 'meteor/meteor';

import template from '../views/tournament_standings.html';

import { TournamentCompetitors } from '../models/tournamentCompetitors';
import { Tournaments} from '../models/tournaments';
import { Leagues } from '../models/leagues';

const name = 'Standings';

export default angular.module(name, [
    angularMeteor
])
    .controller("standingsController", function($scope, $reactive, $routeParams) {
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournamentCompetitors");
        this.subscribe("tournaments");
        this.subscribe("stages");
        this.subscribe("leagues");

        this.url = "";
        // this.tournament = "";
        this.tournamentId = "";
        this.viewRound = "";
        this.viewStage = "";

        this.autorun(()=> {
            this.url = $routeParams.url;
            this.tournamentHandle = this.subscribe("tournaments", () => [], {
                onReady() {
                    var self = this;
                    var tournament = Tournaments.findOne({URL: self.url});
                    //console.log(tournament);
                    if (tournament) {
                        self.tournamentId = tournament._id;
                        self.competitorsHandle = self.subscribe("tournamentCompetitors");
                    }
                    self.viewRound = tournament.currentRound === 0 ? 1 : tournament.currentRound;
                    self.viewStage = tournament.currentStage;
                    self.tournamentHandle.stop();
                }
            })
        });

        this.helpers({
            findTournamentCompetitors(){
                var comps = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId")}, {sort: {wins: -1, draws: -1}}).fetch();
                for (var i=0; i < comps.length; i++) {
                    comps[i].points = comps[i].wins * 3 + comps[i].draws;
                }
                comps.sort(function(a, b) {return b.points - a.points});
                return comps;
            //subscribe to this on server side, as aggregate is a server side function only
            //     return TournamentCompetitors.aggregate([
            //         {$match: {tournamentId: this.tournamentId}},
            //         {$project: {
            //             wins: 1,
            //             losses: 1,
            //             draws: 1,
            //             points: {
            //                 $sum: ["$draws", {$multiply: ["$wins", 3]}]}}},
            //         {$sort:{"$points": -1, "$wins": -1}}
            //     ]);
            },
            tournamentCompetitorsCount(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            },
            getCurrentRound() {
                var t = Tournaments.findOne({URL: this.url});
                return t === undefined ? null : t.currentRound;
            },
            getCurrentStage() {
                var t = Tournaments.findOne({URL: this.url});
                return t === undefined ? null : t.currentStage;
            },
            hasCompetitors() {
                return TournamentCompetitors.findOne({tournamentId: this.getReactively("tournamentId"), isActive: true}) !== undefined;
            },
            isFinished() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                return t ? t.isFinished : false;
            },
            leagueURL () {
                var url = "";
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                if (t && t.leagueId !== null) {
                    var l = Leagues.findOne(t.leagueId);
                    if (l) {
                        url = l.URL;
                    }
                }
                return url;
            },
            isLeague() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                return t? t.leagueId !== null : false;
            }
        });

        this.currentStageURL = () => {
            var t = Tournaments.findOne(this.tournamentId);
            if (t) {
                return "/tournament/" + this.url + "/" + t.currentStage + "/single_elimination";
            }
        };
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/tournament/:url/standings', {
            templateUrl: template
        });
}
