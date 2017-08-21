import angular from 'angular';
import angularMeteor from 'angular-meteor';

import { Meteor } from 'meteor/meteor';

import template from '../views/tournament_single_elimination.html';

import { TournamentCompetitors } from '../models/tournamentCompetitors';
import { Matches } from '../models/matches';
import { Tournaments } from '../models/tournaments';
import { Stages } from '../models/stages';
import { Leagues } from '../models/leagues';

const name = 'single_elimination';

export default angular.module(name, [
    angularMeteor
])
    .controller("singleEliminationController", function($scope, $reactive, $location, $routeParams) {
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournamentCompetitors");
        this.subscribe("matches");
        this.subscribe("tournaments");
        this.subscribe("stages");
        this.subscribe("leagues");

        this.url = "";
        this.tournamentId = "";
        this.currStage = "";
        this.currRound = "";
        this.tournament = "";
        this.competitorsArray = [];
        this.matches = "";

        var compLength = "";

        var lengthOneFlag = false;

        this.autorun(()=> {
            this.url = $routeParams.url;

            this.tournament = Tournaments.findOne({URL: this.getReactively("url")});
            if(this.tournament){
                this.tournamentId = this.tournament._id;
                this.currStage = this.tournament.currentStage;
                this.currRound = this.tournament.currentRound;
                this.competitorsArray = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}, {_id: 1}).fetch();
                if(this.tournament.generatedFrom === "quickfireTournament") {
                    if(this.tournament.currentRound === 0 && this.competitorsArray.length === Session.get("qCompetitorLength")){
                        this.currStage = this.tournament.currentStage;
                        this.currRound = 1;
                        if(this.competitorsArray.length !== 0){
                            generateInitialRound(this.tournament, this.competitorsArray);
                        }
                    }
                    else{
                        this.currStage = this.tournament.currentStage;
                        this.currRound = this.tournament.currentRound;
                    }
                }
                else if(this.tournament.currentRound === 0){
                    this.currStage = this.tournament.currentStage;
                    this.currRound = 1;
                    if(this.competitorsArray.length !== 0){
                        generateInitialRound(this.tournament, this.competitorsArray);
                    }
                }
                else{
                    this.currStage = this.tournament.currentStage;
                    this.currRound = this.tournament.currentRound;
                }

                compLength =  Matches.find({
                    tournamentId: this.tournament._id, stage: this.tournament.currentStage,
                    round: this.tournament.currentRound
                }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();

                if(compLength.length === 1){
                    lengthOneFlag = true;
                }
            }
        });

        this.helpers({
            findTournamentCompetitors(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true});
            },
            tournamentCompetitorsCount(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            },
            findMatches(){
                return Matches.find({tournamentId: this.getReactively("tournamentId"), stage: this.getReactively("currStage"), round: this.getReactively("currRound")}, {sort: {roundMatchNumber: 1}});
            },
            findTournament(){
                return Tournaments.find({url: this.getReactively("url")});
            },
            countUnfinishedMatches() {
                return Matches.find({tournamentId: this.getReactively("tournamentId"), winnerId : { $exists: false }}).count();
            },
            hasMatches() { //used for spinner if necessary
               return (Matches.findOne({tournamentId: this.getReactively("tournamentId"), stage: this.getReactively("currStage"), round: this.getReactively("currRound")}) !== undefined);
            },
            isLastRound() {
                var t = Tournaments.findOne(this.getReactively("tournamentId"));
                var s = t === undefined ? undefined : Stages.findOne({tournamentId: t._id, stageNumber: t.currentStage});
                return s === undefined ? false : this.currStage === t.currentStage && this.currRound === s.rounds;
            },
            getAllStageRounds() {
                var stageRounds = [];
                var t = Tournaments.findOne({URL: this.url});
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

        this.fillData = ()=> {
            var matches = Matches.find({tournamentId: this.tournamentId, stage: this.currStage, round: this.currRound}, {winnerId: {$exists: false}}).fetch();
            for (var i=0; i < matches.length; i++) {
                var match = matches[i];
                var n = Math.floor((Math.random() * 10000) % 2);

                switch (n) {
                    case 0:
                        Meteor.call('matches.updateResult', match._id, match.competitor1Id,
                            match.competitor2Id, 1, 0);
                        break;
                    default:
                        Meteor.call('matches.updateResult', match._id, match.competitor1Id,
                            match.competitor2Id, 0, 1);
                        break;
                }

            }
        };

        this.getName = (competitorId) => {
            var competitor = TournamentCompetitors.findOne(competitorId);
            return competitor === undefined ? '***BYE***' : competitor.name;
        };

        this.selectMatchWinner = (competitorId, match)=> {
            var tournament = Tournaments.findOne(this.getReactively("tournamentId"));
            if (tournament && (tournament.organizerId === Meteor.userId()
                || tournament._id === Session.get("tournamentCoordinator"))) {

                if (competitorId !== null) {
                    var competitor = TournamentCompetitors.findOne(competitorId);
                    //var tournament = Tournaments.findOne({URL: this.url});
                    var result1 = 0;
                    var result2 = 0;

                    if (competitorId === match.competitor1Id) {
                        result1 = 1;
                    }
                    else {
                        result2 = 1;
                    }

                    if (tournament) {
                        var matchSet = Matches.find({
                            tournamentId: tournament._id, stage: tournament.currentStage,
                            round: tournament.currentRound
                        }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();

                        if (this.currRound === tournament.currentRound && !tournament.isFinished) {
                            // && (matchSet.length === 0 || matchSet.length >= 1) && !lengthOneFlag) {
                            bootbox.confirm({
                                message: '<h2><strong>The winner of this match is ' + competitor.name + '?</strong></h2>',
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
                                        Meteor.call("matches.updateResult", match._id, match.competitor1Id, match.competitor2Id, result1, result2);
                                        if (matchSet.length === 1) {
                                            lengthOneFlag = true;
                                        }
                                    }
                                }
                            });
                        }
                    }
                }
            }
        };

        this.displayWinner = ()=> {
            var tournament = Tournaments.findOne({URL: this.url});
            if(tournament) {
                var matchSet = Matches.find({
                    tournamentId: tournament._id, stage: tournament.currentStage,
                    round: tournament.currentRound
                }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();
                if (this.currRound === tournament.currentRound && matchSet.length === 1) {
                    return true;
                }
            }
        };

        this.startNextRound = ()=> {
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
                        var tournament = Tournaments.findOne({URL: this.url});
                        var nextRound = this.currRound + 1;;
                        var matchSet = Matches.find({tournamentId: tournament._id, stage: this.currStage,
                            round: this.currRound}, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();
                        var matches = [];

                        for(var i = 0; i < matchSet.length; i += 2){
                            matches.push({
                                competitor1Id: matchSet[i].winnerId,
                                competitor2Id: matchSet[i + 1].winnerId === null ? null : matchSet[i + 1].winnerId
                            });
                        }

                        Meteor.call('matches.insert', tournament._id, tournament.currentStage, nextRound, matches);
                        Meteor.call('tournaments.updateCurrentRound', tournament._id, tournament.currentStage, nextRound);
                        Meteor.call('tournamentCompetitors.updateResults', tournament._id, this.currStage, this.currRound);

                        this.currRound = nextRound;
                    }
                }
            });
        };

        this.checkPrevRound = ()=> {
            return this.currRound > 1 ? true : false;
        };

        this.prevRound = ()=> {
            if (this.currRound > 1){
                --this.currRound;
            }
        };

        this.checkNextRound = ()=> {
            var t = Tournaments.findOne({URL: this.url});
            if (t) {
                if (t.currentStage === this.currStage) {
                    return this.currRound < t.currentRound ? true : false;
                }
                else {
                    var s = Stages.findOne({tournamentId: this.tournamentId, stageNumber: this.currStage});
                    if (s) {
                        return this.currRound < s.rounds;
                    }
                }
            }
            return false;
        };

        this.nextRound = ()=> {
            var t = Tournaments.findOne({URL: this.url});
            if (t && (this.currStage < t.currentStage || ( this.currStage === t.currentStage && this.currRound < t.currentRound))) {
                ++this.currRound;
            }
        };

        this.checkPrevStage = ()=> {
            return this.currStage > 1 ? true : false;
        };

        this.prevStage = ()=> {
            $location.path("/tournament/" + this.url + "/" + (this.currStage - 1) + "/multilevel");
        };

        this.checkNextStage = ()=> {
            var t = Tournaments.findOne({URL: this.url});
            if (t) {
                return this.currStage < t.currentStage;
            }
        };

        this.nextStage = ()=> {
            $location.path("/tournament/" + this.url + "/" + (this.currStage + 1) + "/multilevel");
        };

        this.goToStage = (stage) => {
            $location.path("/tournament/" + this.url + "/" + stage + "/multilevel");
        };

        this.goToRound = (round) => {
            this.currRound = round;
        };

        this.currentStageURL = () => {
            var t = Tournaments.findOne(this.tournamentId);
            if (t) {
                return "/tournament/" + this.url + "/" + t.currentStage + "/single_elimination";
            }
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
            Meteor.call('tournamentCompetitors.updateResults', this.tournamentId, this.currStage, this.currRound);
            Meteor.call('tournament.finishTournament', this.tournamentId);
            $location.path("/tournament/" + this.url + "/standings");
            $scope.$apply();
        };



    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/tournament/:url/:stageNumber/single_elimination', {
            templateUrl: template
        });
}

function generateInitialRound (event, competitorArray){
    var tournament = event;
    var totalCount = competitorArray.length;

    var matches = [];

    if(totalCount > 2){
        var tUpper, tLower;
        var iMax = Math.ceil(Math.log2(totalCount));
        var n = Math.pow(2, iMax);
        Meteor.call('stages.updateRounds', tournament._id, tournament.currentStage, iMax);

        var firstHalf = [];
        var secondHalf = [];
        var matchSet = [];

        var tournamentArray = [];

        firstHalf.push(0);
        secondHalf.push(1);

        firstHalf.push(n-2);
        secondHalf.push(n-1);

        for(var i = 2; i < iMax; i++){
            for(var j = 0; j < Math.pow(2, i - 2); j++){
                tUpper = ((1 + 2*j)*n)/Math.pow(2, i);
                tLower = n - tUpper - 2;
                firstHalf.push(tUpper);
                firstHalf.push(tLower);
                secondHalf.push(tUpper + 1);
                secondHalf.push(tLower + 1);
            }
        }

        secondHalf.reverse();

        for(var i = 0; i < firstHalf.length; i++){
            matchSet.push(firstHalf[i]);
        }
        for(var i = 0; i < secondHalf.length; i++){
            matchSet.push(secondHalf[i]);
        }
        for(var i = 0; i < matchSet.length; i++){
            tournamentArray.push(null)
        }
        for(var i = 0; i < totalCount; i++){
            tournamentArray[matchSet[i]] = competitorArray[i];
        }

        for(var i = 0; i < n; i += 2){
            matches.push({
                competitor1Id: tournamentArray[i]._id,
                competitor2Id: tournamentArray[i + 1] === null ? null : tournamentArray[i + 1]._id
            })
        }
    }
    else if (totalCount === 2){
        matches.push({
            competitor1Id: competitorArray[0]._id,
            competitor2Id: competitorArray[1] === null ? null : competitorArray[1]._id
        });
    }

    Meteor.call('matches.insert', tournament._id, tournament.currentStage, 1, matches);
    Meteor.call('tournaments.updateCurrentRound', tournament._id, tournament.currentStage, 1);
}
