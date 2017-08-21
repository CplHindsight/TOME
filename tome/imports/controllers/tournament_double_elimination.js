import angular from 'angular';
import angularMeteor from 'angular-meteor';

import { Meteor } from 'meteor/meteor';

import template from '../views/tournament_double_elimination.html';

import { TournamentCompetitors } from '../models/tournamentCompetitors';
import { Matches } from '../models/matches';
import { Tournaments } from '../models/tournaments';
import { Stages } from '../models/stages';
import { TempDoubleMatches } from "../models/dblElim_tempMatches";
import { Leagues } from '../models/leagues';

const name = 'double_elimination';

export default angular.module(name, [
    angularMeteor
])
    .controller("doubleEliminationController", function($scope, $reactive, $location, $routeParams){
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("tournamentCompetitors");
        this.subscribe("matches");
        this.subscribe("tournaments");
        this.subscribe("tempDoubleMatches");
        this.subscribe("leagues");
        this.subscribe("stages");

        this.url = "";
        this.tournamentId = "";
        this.currStage = "";
        this.currRound = "";
        this.tournament = "";
        this.competitorsArray = [];
        this.matches = "";

        this.upperBracketView = true;
        this.lowerBracketView = false;

        this.autorun(()=> {
            this.url = $routeParams.url;

            this.tournament = Tournaments.findOne({URL: this.getReactively("url")});
            if(this.tournament){
                this.tournamentId = this.tournament._id;
                this.currStage = this.tournament.currentStage;
                this.currRound = this.tournament.currentRound;
                this.competitorsArray = TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}, {_id: 1}).fetch();
                if(this.tournament.generatedFrom === "quickfireTournament"){
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
            }
        });

        this.helpers({
            findTournamentCompetitors(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true});
            },
            tournamentCompetitorsCount(){
                return TournamentCompetitors.find({tournamentId: this.getReactively("tournamentId"), isActive: true}).count();
            },
            findUpperMatches(){
                return Matches.find({tournamentId: this.getReactively("tournamentId"), stage: this.getReactively("currStage"), round: this.getReactively("currRound"), isLower: {$exists: false}}, {sort: {roundMatchNumber: 1}});
            },
            findLowerMatches(){
                return Matches.find({tournamentId: this.getReactively("tournamentId"), stage: this.getReactively("currStage"), round: this.getReactively("currRound"), isLower: {$exists: true}}, {sort: {roundMatchNumber: 1}});
            },
            findUpperTemporaryMatches(){
                return TempDoubleMatches.find({tournamentId: this.getReactively("tournamentId"), stage: this.getReactively("currStage"), round: this.getReactively("currRound") + 1}, {sort: {roundMatchNumber: 1}}).count() > 0;
            },
            findTournament(){
                return Tournaments.find({url: this.getReactively("url")});
            },
            //need to check for winner not false and loser < 2
            countUnfinishedMatches(){
                return Matches.find({tournamentId: this.getReactively("tournamentId"), winnerId: {$exists: false}}).count();
            },
            hasMatches(){ //used for spinner if necessary
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
            if(competitorId === null){
                return '***BYE***';
            }
            var competitor = TournamentCompetitors.findOne(competitorId);
            return competitor === undefined ? '***BYE***' : competitor.name;
        };

        this.selectMatchWinner = (competitorId, match)=> {
            var tournament = Tournaments.findOne(this.getReactively("tournamentId"));
            if (tournament && (tournament.organizerId === Meteor.userId()
                || tournament._id === Session.get("tournamentCoordinator"))) {
                if (competitorId !== null) {
                    var competitor = TournamentCompetitors.findOne(competitorId);
                    var tournament = Tournaments.findOne({URL: this.url});
                    var result1 = 0;
                    var result2 = 0;

                    if (competitorId === match.competitor1Id) {
                        result1 = 1;
                    }
                    else {
                        result2 = 1;
                    }

                    if (tournament) {
                        if (this.currRound === tournament.currentRound && !tournament.isFinished) {
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
                                    }
                                }
                            });
                        }
                    }
                }
            }
        };

        this.switchBracketView = (val)=> {
            if(val === 0){
                this.upperBracketView = true;
                this.lowerBracketView = false;
            }
            else{
                this.upperBracketView = false;
                this.lowerBracketView = true;
            }
        };

        this.showUpperBrackets = ()=> {
            return this.currRound > 1 ? false : true;
        };

        this.showLowerBrackets = ()=> {
            var tournament = Tournaments.findOne({URL: this.url});

            if(tournament) {
                var lowerBracketMatches = Matches.find({
                    tournamentId: tournament._id, stage: this.currStage,
                    round: this.currRound, isLower: {$exists: true}
                }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();

                return lowerBracketMatches.length > 0 ? false : true;
            }
        };

        //check to ensure this does not need losers included to determine last round
        this.displayWinner = ()=> {
            var tournament = Tournaments.findOne({URL: this.url});
            if(tournament) {
                var winningCompetitors = Matches.find({
                    tournamentId: tournament._id, stage: tournament.currentStage,
                    round: tournament.currentRound
                }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();
                if (this.currRound === tournament.currentRound && winningCompetitors.length === 1) {
                    return true;
                }
            }
        };

        //Not sure if start upper and start lower are needed yet
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
                        var nextRound = this.currRound + 1;

                        var lowerMatchesWon = "";
                        var upperMatchesLost = "";
                        var matches = [];

                        this.upperBracketView = true;
                        this.lowerBracketView = false;

                        //Determine the list of upper matches that were successfully won
                        var upperMatchesWon = Matches.find({tournamentId: tournament._id, stage: this.currStage,
                            round: this.currRound, isLower: {$exists: false}}, {sort: {roundMatchNumber: 1}}).fetch();

                        if(upperMatchesWon.length > 1) {
                            //Matches the winners of the upper bracket for the next round
                            for (var i = 0; i < upperMatchesWon.length; i += 2) {
                                matches.push({
                                    competitor1Id: upperMatchesWon[i].winnerId === null ? null : upperMatchesWon[i].winnerId,
                                    competitor2Id: upperMatchesWon[i + 1].winnerId === null ? null : upperMatchesWon[i + 1].winnerId
                                });
                            }

                            if (this.currRound < 2) {
                                //Determines the first round of the lower bracket
                                for (var i = 0; i < upperMatchesWon.length; i += 2) {
                                    if (upperMatchesWon[i].loserId === null) {
                                        matches.push({
                                            competitor1Id: upperMatchesWon[i + 1].loserId,
                                            competitor2Id: upperMatchesWon[i].loserId,
                                            isLower: true
                                        });
                                    }
                                    else {
                                        matches.push({
                                            competitor1Id: upperMatchesWon[i].loserId,
                                            competitor2Id: upperMatchesWon[i + 1].loserId,
                                            isLower: true
                                        });
                                    }
                                }
                            }
                            else {
                                //Determine the winners of the round of the lower bracket
                                lowerMatchesWon = Matches.find({
                                    tournamentId: tournament._id, stage: this.currStage,
                                    round: this.currRound, isLower: {$exists: true}
                                }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();
                                //Determine the losers of the round of the upper bracket
                                upperMatchesLost = Matches.find({
                                    tournamentId: tournament._id, stage: this.currStage,
                                    round: this.currRound, isLower: {$exists: false}
                                }, {loserId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();

                                //Creates matches if the # of rounds in the upper bracket match the # of
                                //rounds in the lower bracket (this condition deals with determining if
                                //there is a half round or not)
                                if(lowerMatchesWon.length === matches.length) {
                                    //Determines the pairings of the upper bracket losers with the lower bracket winners
                                    for (var i = 0; i < lowerMatchesWon.length; i++) {
                                        matches.push({
                                            competitor1Id: upperMatchesLost[i].loserId === null ? null : upperMatchesLost[i].loserId,
                                            competitor2Id: lowerMatchesWon[i].winnerId === null ? null : lowerMatchesWon[i].winnerId,
                                            isLower: true
                                        });
                                    }
                                }
                                else{
                                    //This method call inserts the upper bracket to a collection to hold
                                    //the upper bracket stages for the round after the half round in the lower
                                    //bracket. Half rounds are determined when the lower bracket has double the
                                    //amount of matches to that of the upper bracket
                                    Meteor.call("tempDoubleMatches.insert", tournament._id, tournament.currentStage, nextRound + 1, matches);
                                    matches = [];
                                    for (var i = 0; i < lowerMatchesWon.length; i++) {
                                        matches.push({
                                            competitor1Id: upperMatchesLost[i].loserId === null ? null : upperMatchesLost[i].loserId,
                                            competitor2Id: lowerMatchesWon[i].winnerId === null ? null : lowerMatchesWon[i].winnerId,
                                            isLower: true
                                        });
                                    }
                                }
                            }
                        }
                        //Determines that there was no upper bracket matches after a half round
                        else if (upperMatchesWon.length === 0){
                            //Adds the matches from the collection holding the upper bracket during the temporary round
                            //back into the main matches array set
                            matches = TempDoubleMatches.find({tournamentId: tournament._id, stage: this.currStage,
                                round: this.currRound + 1}, {_id: 0}, {sort: {roundMatchNumber: 1}}).fetch();

                            //Determine the winners of the round of the lower bracket
                            lowerMatchesWon = Matches.find({
                                tournamentId: tournament._id, stage: this.currStage,
                                round: this.currRound, isLower: {$exists: true}
                            }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();

                            //If there is more than one round left in the lower bracket
                            if(lowerMatchesWon.length > 1) {
                                //Pairs the lower match winners after a half round
                                for (var i = 0; i < lowerMatchesWon.length; i += 2) {
                                    matches.push({
                                        competitor1Id: lowerMatchesWon[i].winnerId === null ? null : lowerMatchesWon[i].winnerId,
                                        competitor2Id: lowerMatchesWon[i + 1].winnerId === null ? null : lowerMatchesWon[i + 1].winnerId,
                                        isLower: true
                                    });
                                }
                            }
                            else{
                                var tempMatchesArray;
                                tempMatchesArray = matches;
                                matches = [];
                                //If there is only one round left in the lower bracket, determine the final round
                                for(var i = 0; i < lowerMatchesWon.length; i++){
                                    matches.push({
                                        competitor1Id: tempMatchesArray[i].winnerId === null ? null : tempMatchesArray[i].winnerId,
                                        competitor2Id: lowerMatchesWon[i].winnerId === null ? null : lowerMatchesWon[i].winnerId
                                    });
                                }
                            }
                        }
                        //If there is only one winner in the upper bracket
                        else{
                            lowerMatchesWon = Matches.find({
                                tournamentId: tournament._id, stage: this.currStage,
                                round: this.currRound, isLower: {$exists: true}
                            }, {winnerId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();
                            upperMatchesLost = Matches.find({
                                tournamentId: tournament._id, stage: this.currStage,
                                round: this.currRound, isLower: {$exists: false}
                            }, {loserId: 1, _id: 0}, {sort: {roundMatchNumber: 1}}).fetch();

                            //If there is one winner left in lower bracket
                            if(lowerMatchesWon.length === 1) {
                                //If there is one loser left in upper bracket
                                if(upperMatchesLost.length === 1){
                                    //If the loser is not null
                                    if(upperMatchesLost[0].loserId !== null){
                                        for(var i = 0; i < upperMatchesWon.length; i++){
                                            matches.push({
                                                competitor1Id: upperMatchesWon[i].winnerId === null ? null : upperMatchesWon[i].winnerId,
                                                competitor2Id: null
                                            });
                                        }
                                        //Insert final match of upper bracket into the temporary collection
                                        Meteor.call("tempDoubleMatches.insert", tournament._id, tournament.currentStage, nextRound + 1, matches);
                                        matches = [];
                                        //Match the final lower bracket match
                                        for(var i = 0; i < lowerMatchesWon.length; i++){
                                            matches.push({
                                                competitor1Id: upperMatchesLost[i].loserId === null ? null : upperMatchesLost[i].loserId,
                                                competitor2Id: lowerMatchesWon[i].winnerId === null ? null : lowerMatchesWon[i].winnerId,
                                                isLower: true
                                            });
                                        }
                                    }
                                }
                            }
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
            if(this.currRound > 1){
                this.currRound -= 1;
            }
            this.upperBracketView = true;
            this.lowerBracketView = false;
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
            this.upperBracketView = true;
            this.lowerBracketView = false;
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
            this.upperBracketView = true;
            this.lowerBracketView = false;
        };

        this.currentStageURL = () => {
            var t = Tournaments.findOne(this.tournamentId);
            if (t) {
                return "/tournament/" + this.url + "/" + t.currentStage + "/multilevel";
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
        .when('/tournament/:url/:stageNumber/double_elimination', {
            templateUrl: template
        });
}
function generateInitialRound(event, competitorArray){
    var tournament = event;
    var totalCount = competitorArray.length;
    var matches = [];

    if(totalCount > 2) {
        var tUpper, tLower;
        var iMax = Math.ceil(Math.log2(totalCount));
        var n = Math.pow(2, iMax);
        Meteor.call('stages.updateRounds', tournament._id, tournament.currentStage, iMax * 2);

        var firstHalf = [];
        var secondHalf = [];
        var matchSet = [];


        var tournamentArray = [];

        firstHalf.push(0);
        secondHalf.push(1);

        firstHalf.push(n - 2);
        secondHalf.push(n - 1);

        for (var i = 2; i < iMax; i++) {
            for (var j = 0; j < Math.pow(2, i - 2); j++) {
                tUpper = ((1 + 2 * j) * n) / Math.pow(2, i);
                tLower = n - tUpper - 2;
                firstHalf.push(tUpper);
                firstHalf.push(tLower);
                secondHalf.push(tUpper + 1);
                secondHalf.push(tLower + 1);
            }
        }

        secondHalf.reverse();

        for (var i = 0; i < firstHalf.length; i++) {
            matchSet.push(firstHalf[i]);
        }
        for (var i = 0; i < secondHalf.length; i++) {
            matchSet.push(secondHalf[i]);
        }
        for (var i = 0; i < matchSet.length; i++) {
            tournamentArray.push(null)
        }

        for (var i = 0; i < totalCount; i++) {
            tournamentArray[matchSet[i]] = competitorArray[i];
        }

        for (var i = 0; i < n; i += 2) {
            matches.push({
                competitor1Id: tournamentArray[i]._id,
                competitor2Id: tournamentArray[i + 1] === null ? null : tournamentArray[i + 1]._id
            })
        }
    }
    else if(totalCount === 2){
        matches.push({
            competitor1Id: competitorArray[0]._id,
            competitor2Id: competitorArray[1] === null ? null : competitorArray[1]._id
        });
    }

    Meteor.call('matches.insert', tournament._id, tournament.currentStage, 1, matches);
    Meteor.call('tournaments.updateCurrentRound', tournament._id, tournament.currentStage, 1);
}
