import angular from 'angular';
import angularMeteor from 'angular-meteor';
import { Meteor } from 'meteor/meteor';

import template from '../views/tournament_round_robin.html';

import { TournamentCompetitors } from '../models/tournamentCompetitors';
import { Matches } from '../models/matches';
import { Tournaments} from '../models/tournaments';
import { Stages } from '../models/stages';
import { Leagues } from '../models/leagues';

const name = 'RoundRobin';

export default angular.module(name, [
    angularMeteor
])
    .controller("roundRobinController", function($scope, $reactive, $location, $routeParams) {
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournamentCompetitors");
        this.subscribe("matches");
        this.subscribe("tournaments");
        this.subscribe("stages");
        this.subscribe("leagues");

        this.url = "";
        this.tournament = "";
        this.tournamentId = "";
        this.viewRound = "";
        this.viewStage = "";
        this.editScore = false;

        this.autorun(()=> {
            this.url = $routeParams.url;
            this.viewStage = parseInt($routeParams.stageNumber);
            this.tournament = Tournaments.findOne({URL: this.getReactively("url")});
            if(this.tournament){
                this.tournamentId = this.tournament._id;
                if(this.viewStage === this.tournament.currentStage && this.tournament.currentRound === 0){
                    generateInitialRound(this.tournament);
                }
                this.viewRound = this.viewStage === this.tournament.currentStage && this.tournament.currentRound > 0 ? this.tournament.currentRound : 1;
            }
        });


        this.helpers({
            findTournamentCompetitors(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true});
            },
            tournamentCompetitorsCount(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            },
            findMatches() {
                return Matches.find({tournamentId: this.getReactively("tournamentId"),
                    stage: this.getReactively("viewStage"), round: this.getReactively("viewRound")},
                    {sort: {stage: 1, round: 1, roundMatchNumber: 1}});
            },
            countUnfinishedMatches() {
                var t = Tournaments.findOne({URL: this.url});
                if (t)
                    return Matches.find({tournamentId: this.getReactively("tournamentId"),
                        stage: t.currentStage, round: t.currentRound,
                        winnerId : { $exists: false }}).count();
            },
            hasMatches() {
                return (Matches.findOne({tournamentId: this.getReactively("tournamentId"),
                    stage: this.getReactively("viewStage"), round: this.getReactively("viewRound")}) !== undefined);
            },
           getCurrentRound() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                return t === undefined ? null : t.currentRound;
           },
           getCurrentStage() {
               var t = Tournaments.findOne(this.getReactively("tournamentId"));
               return t === undefined ? null : t.currentStage;
           },
           isLastRound() {
               var t = Tournaments.findOne(this.getReactively("tournamentId"));
               var s = t === undefined ? undefined : Stages.findOne({tournamentId: t._id, stageNumber: t.currentStage});
               return s === undefined ? false : this.viewStage === t.currentStage && this.viewRound === s.rounds;
           },
           isLastStage() {
               var t = Tournaments.findOne(this.getReactively("tournamentId"));
               return t === undefined ? false : Stages.findOne({tournamentId: t._id, stageNumber: t.currentStage + 1}) === undefined;
           },
           getAllStageRounds() {
               var stageRounds = [];
               var t = Tournaments.findOne(this.getReactively("tournamentId"));
               if (t) {
                   var stages = Stages.find({
                       tournamentId: this.getReactively("tournamentId"),
                       stageNumber: {$lte: t.currentStage}
                   }, {fields: {stageNumber: 1, rounds: 1}, sort: {stageNumber: 1}}).fetch();
                   if (stages) {
                       for (var i=0; i < stages.length; i++) {
                           var loopbreak = ((i + 1) === t.currentStage) ? t.currentRound : stages[i].rounds;
                           for (var j=1; j <= loopbreak; j++) {
                               stageRounds.push({stage: i + 1, round: j});
                           }
                       }
                   }
               }
               return stageRounds;
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
            },
            canModify() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                return t ? t.organizerId === Meteor.userId() || t._id === Session.get("tournamentCoordinator") : false;
            },
        });

        this.getName = (competitorId) => {
            var competitor = TournamentCompetitors.findOne(competitorId);
            return competitor === undefined ? "***BYE***" :
                (competitor.name + " (" + competitor.wins + "-" + competitor.losses + "-" + competitor.draws + ")");
        };


        this.checkPrevRound = ()=> {
            return this.viewRound > 1 ? true : false;
        };

        this.prevRound = ()=> {
            if (this.viewRound > 1){
                --this.viewRound;
                if (this.editScore) {
                    this.editScore = false;
                }
            }
        };

        this.checkNextRound = ()=> {
            var t = Tournaments.findOne({URL: this.url});
            if (t) {
                if (t.currentStage === this.viewStage) {
                    return this.viewRound < t.currentRound ? true : false;
                }
                else {
                    var s = Stages.findOne({tournamentId: this.tournamentId, stageNumber: this.viewStage});
                    if (s) {
                        return this.viewRound < s.rounds;
                    }
                }
            }
            return false;
        };

        this.nextRound = ()=> {
            var t = Tournaments.findOne({URL: this.url});
            if (t && (this.viewStage < t.currentStage || ( this.viewStage === t.currentStage && this.viewRound < t.currentRound))) {
                ++this.viewRound;
                if (this.editScore) {
                    this.editScore = false;
                }
            }
        };

        this.checkPrevStage = ()=> {
            return this.viewStage > 1 ? true : false;
        };

        this.prevStage = ()=> {
            $location.path("/tournament/" + this.url + "/" + (this.viewStage - 1) + "/multilevel");
        };

        this.checkNextStage = ()=> {
            var t = Tournaments.findOne({URL: this.url});
            if (t) {
                return this.viewStage < t.currentStage;
            }
        };

        this.nextStage = ()=> {
            $location.path("/tournament/" + this.url + "/" + (this.viewStage + 1) + "/multilevel");
        };

        this.goToStage = (stage) => {
            $location.path("/tournament/" + this.url + "/" + stage + "/multilevel");
        };

        this.goToRound = (round) => {
            this.viewRound = round;
            if (this.editScore) {
                this.editScore = false;
            }
        };

        this.currentStageURL = () => {
            var t = Tournaments.findOne(this.tournamentId);
            if (t) {
                return "/tournament/" + this.url + "/" + t.currentStage + "/single_elimination";
            }
        };

        //Edit competitor fields
        this.updateMatch = (match)=> {

            if (this.edittedCompetitor1Score !== null &&
                this.edittedCompetitor2Score !== null &&
                (match.competitor1Score !== this.edittedCompetitor1Score || match.competitor2Score !== this.edittedCompetitor2Score)) {
                match.toggle = !match.toggle;
                Meteor.call('matches.updateResult', match._id, match.competitor1Id,
                    match.competitor2Id, this.edittedCompetitor1Score, this.edittedCompetitor2Score);
                Meteor.call('tournaments.updateDateLastActive', this.tournamentId);
                this.editScore = !this.editScore;
            }
        };

        //Toggle edit options
        this.toggleEdit = (match)=> {
            if (match.competitor2Id !== null) {
                match.toggle = !match.toggle;
                this.edittedCompetitor1Score = match.competitor1Score;
                this.edittedCompetitor2Score = match.competitor2Score;
            }
            this.editScore = !this.editScore;
        };

        this.endTournament = () => {
            bootbox.confirm({
                message: '<h2><strong>Please confirm all results as they are final for the round.<br>' +
                'This will finalize the results of the tournament.</strong></h2>',
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Confirm'
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel'
                    }
                },
                callback: (result) => {
                    if (result) {
                        this.endTournamentFunction();
                    }
                }
            });
        };

        this.endTournamentFunction = () => {
            Meteor.call('tournamentCompetitors.updateResults', this.tournamentId, this.viewStage, this.viewRound);
            Meteor.call('tournament.finishTournament', this.tournamentId);
            $location.path("/tournament/" + this.url + "/standings");
            $scope.$apply();
        };

        //handles pairings beyond round 1
        this.AdvanceRound = () => {
            bootbox.confirm({
                message: '<h2><strong>Please confirm all results as they are final for the round.</strong></h2><br>',
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Confirm'
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel'
                    }
                },
                callback: (result) => {
                    if (result) {
                        var stageRounds = Stages.findOne({
                            tournamentId: this.tournamentId,
                            stageNumber: this.viewStage
                        }).rounds;
                        Meteor.call('tournamentCompetitors.updateResults',
                            this.tournamentId, this.viewStage, this.viewRound);
                        if (stageRounds === this.viewRound) {

                        }
                        else {
                            this.viewRound++;
                            Meteor.call('tournaments.updateCurrentRound', this.tournamentId, this.viewStage, this.viewRound);
                        }
                    }
                }
            })
        };

        this.startNextStage = () => {
            bootbox.confirm({
                message: '<h2><strong>Please confirm all results as they are final for the round.</strong></h2><br>',
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Confirm'
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel'
                    }
                },
                callback: (result) => {
                    if (result) {
                        this.advanceRoundFunction();
                    }
                }
            });
        };

        this.advanceRoundFunction = () => {
            Meteor.call('tournamentCompetitors.updateResults', this.tournamentId, this.viewStage, this.viewRound);
            Meteor.call('tournaments.updateCurrentRound', this.tournamentId, this.viewStage + 1, 0);
            var comps = TournamentCompetitors.find({
                tournamentId: this.tournamentId,
                isActive: true
            }, {sort: {wins: -1, draws: -1}}).fetch();
            for (var i = 0; i < comps.length; i++) {
                comps[i].points = comps[i].wins * 3 + comps[i].draws;
            }
            var sortedCompetitors = comps.sort(function (a, b) {
                return b.points - a.points
            });
            var activeCount = sortedCompetitors.length;
            var stages = Stages.find({tournamentId: this.tournamentId}, {sort: {stageNumber: 1}}).fetch();
            var cutoffNumber = stages[this.viewStage - 1].cutoffCriteria === 'p' ?
                Math.ceil(stages[this.viewStage - 1].cutoffNumber * activeCount) : stages[this.viewStage - 1].cutoffNumber;
            for (; cutoffNumber < activeCount; cutoffNumber++) {
                Meteor.call('tournamentCompetitors.setInactive', sortedCompetitors[cutoffNumber]._id);
            }
            $location.path("/tournament/" + this.url + "/" + (this.viewStage + 1) + "/round_robin");
            $scope.$apply();
        };


        this.tempUpdateAll = () => {
            //below is not properly excluding byes
            var matches = Matches.find({tournamentId: this.tournamentId, stage: this.viewStage, round: this.viewRound, winnerId: {$exists: false}}).fetch();
            for (var i=0; i < matches.length; i++) {
                var match = matches[i];
                var n = Math.floor((Math.random() * 10000) % 3);
                switch (n) {
                    case 0:
                        Meteor.call('matches.updateResult', match._id, match.competitor1Id,
                            match.competitor2Id, 1, 0);
                        break;
                    case 1:
                        Meteor.call('matches.updateResult', match._id, match.competitor1Id,
                            match.competitor2Id, 0, 1);
                        break;
                    default:
                        Meteor.call('matches.updateResult', match._id, match.competitor1Id,
                            match.competitor2Id, 1, 1);
                }
            }
        };

    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/tournament/:url/:stageNumber/round_robin', {
            templateUrl: template
        });
}

function generateInitialRound(tournament) {
    //Create each set of rounds here, set it to an object and then loop through the round based on if the round is selected through pagination
    if (Matches.findOne({tournamentId: tournament._id, stage: tournament.currentStage}) === undefined) {
        var competitorIds = TournamentCompetitors.find({tournamentId: tournament._id, isActive: true}, {_id: 1}).fetch();
        var competitorCount = competitorIds.length;
        var totalRounds = Math.ceil(competitorCount / 2) * 2;

        var fixedPlayerId = null;
        if (competitorCount % 2 == 0) {
            fixedPlayerId = competitorIds.pop()._id;
            competitorCount--;
        }
        Meteor.call("stages.updateRounds", tournament._id, tournament.currentStage, competitorCount);
        for (var round = 1; round < totalRounds; round++) { //number of rounds
            var matches = [];
            for (var i = 0; i < Math.floor(competitorCount / 2); i++) {
                matches.push({
                    competitor1Id: competitorIds[i]._id,
                    competitor2Id: competitorIds[competitorCount - 2 - i]._id
                });
            }
            matches.push({
                competitor1Id: competitorIds[competitorCount - 1]._id,
                competitor2Id: fixedPlayerId
            });
            //do insert
            Meteor.call('matches.insert', tournament._id, tournament.currentStage, round, matches);
            //clear matches
            //reposition players
            competitorIds.unshift(competitorIds.pop());
            //loop again
        }

        Meteor.call('tournaments.updateCurrentRound', tournament._id, tournament.currentStage, 1);
    }
}

