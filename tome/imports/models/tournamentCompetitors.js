import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Tournaments } from './tournaments';
import { Matches } from './matches';

export const TournamentCompetitors = new Mongo.Collection('tournamentCompetitors');

if(Meteor.isServer){
    Meteor.publish('tournamentCompetitors', ()=> {
        return TournamentCompetitors.find();
    });
}

Meteor.methods({
    'tournamentCompetitors.insert' (tournamentId, competitorArray, leagueId=null) {
        if(this.isSimulation){

        }
        else if (competitorArray.length > 0) {
            check(tournamentId, String);
            if(competitorArray.length > 0) {
                //var leagueId = Tournaments.findOne(tournamentId, {leagueId: 1, _id: 0}).leagueId;
                for (var i = 0; i < competitorArray.length; i++) {
                    check(competitorArray[i].name, String);
                    if (leagueId !== null) {
                        check(competitorArray[i].leagueCompetitorId, String);
                    }
                    competitorArray[i].tournamentId = tournamentId;
                    competitorArray[i].wins = 0;
                    competitorArray[i].losses = 0;
                    competitorArray[i].draws = 0;
                    competitorArray[i].rankingCriteria = 0;
                    competitorArray[i].isActive = true;
                }

                /*var tournament = Tournaments.findOne({tournamentId: tournamentId});

                if (tournament.organizerId !== null && !Meteor.userId()) {
                    throw new Meteor.Error("Not Authorized");
                }*/

                //Meteor.call('tournaments.updateDateLastActive', tournamentId, leagueId);

                TournamentCompetitors.batchInsert(competitorArray, (err, result) => {
                    if (err) {
                        return;
                    }
                    var tournamentCompetitorIds = result; //need to see what is returned here with batchInsert
                });

                Meteor.call('tournaments.updateDateLastActive', tournamentId, leagueId);
            }
        }
    },
    'tournamentCompetitors.updateValues' (id, name, email) {
        TournamentCompetitors.update(id, {$set: {name: name, email: email}});
    },
    'tournamentCompetitors.setInactive' (id) {
        TournamentCompetitors.update(id, {$set: {isActive: false}});
    },
    //
    // 'tournamentCompetitors.update' (id, param, value){
    //     //https://stackoverflow.com/questions/14564188/how-to-dynamically-update-set-a-sub-attribute-of-a-collection-in-meteor
    //     TournamentCompetitors.update( id, {$set: {[param]: value}});
    // },
    //
    'tournamentCompetitors.updateResults' (tournamentId, stage, round){
        var tournament = Tournaments.findOne(tournamentId);
        var matches = Matches.find({tournamentId: tournamentId, stage: stage, round: round});
        //ELO calculations from
        //https://metinmediamath.wordpress.com/2013/11/27/how-to-calculate-the-elo-rating-including-example/
        matches.forEach((match)=>{
            //for draws
            if (match.winnerId === null) {
                if (tournament.leagueId !== null && match.competitor2Id !== null) {
                    var K = 24;
                    var R1 = TournamentCompetitors.findOne(match.competitor1Id).ELO;
                    var R2 = TournamentCompetitors.findOne(match.competitor2Id).ELO;
                    var E1 = R1 / (R1 + R2);
                    var E2 = R2 / (R1 + R2);
                    var S = 0.5;
                    var newR1 = Math.round(R1 + K * (S - E1));
                    var newR2 = Math.round(R2 + K * (S - E2));
                    TournamentCompetitors.update(match.competitor1Id, {$inc: {draws: 1}, $set: {ELO: newR1}});
                    TournamentCompetitors.update(match.competitor2Id, {$inc: {draws: 1}, $set: {ELO: newR2}});
                }
                else {
                    TournamentCompetitors.update(match.competitor1Id, {$inc: {draws: 1}});
                    TournamentCompetitors.update(match.competitor2Id, {$inc: {draws: 1}});
                }
            }
            //for matches with results
            else {
                //no ELO update for byes
                if (tournament.leagueId !== null && match.competitor2Id !== null) {
                    var K = 24;
                    var R1 = TournamentCompetitors.findOne(match.winnerId).ELO;
                    var R2 = TournamentCompetitors.findOne(match.loserId).ELO;
                    var E1 = R1 / (R1 + R2);
                    var E2 = R2 / (R1 + R2);
                    var S1 = 1;
                    var S2 = 0;
                    var newR1 = Math.round(R1 + K * (S1 - E1));
                    var newR2 = Math.round(R2 + K * (S2 - E2));
                    //console.log("winner : from " + R1 + " to " + newR1);
                    //console.log("lsoer: from " + R2 + " to " + newR2);
                    TournamentCompetitors.update(match.winnerId, {$inc: {wins: 1}, $set: {ELO: newR1}});
                    TournamentCompetitors.update(match.loserId, {$inc: {losses: 1}, $set: {ELO: newR2}});
                }
                else {
                    TournamentCompetitors.update(match.winnerId, {$inc: {wins: 1}});
                    if (match.loserId !== null) {
                        TournamentCompetitors.update(match.loserId, {$inc: {losses: 1}});
                    }
                }
            }
            // Meteor.call('tournaments.updateDateLastActive', tournamentId);
        });
        Meteor.call('tournaments.updateDateLastActive', tournamentId);

    },
    //
    // 'tournamentCompetitors.updateName' (id, name) {
    //     TournamentCompetitors.update( id, {$set: {name: name}});
    // },
    //
    // 'tournamentCompetitors.updateRankingCriteria' (id, rankingValue) {
    //     TournamentCompetitors.update( id, {$set: {rankingCriteria1: rankingValue}});
    // },
    //
    // 'tournamentCompetitors.updateFullResult' (id, result, rankingValue) {
    //     TournamentCompetitors.update( id,
    //         {$inc: {[result]: 1}}, {$set: {rankingCriteria1: rankingValue}});
    // },
    //
    // //shouldn't need this function
    // 'tournamentCompetitors.fixResults' (id, erroneousEntry, properResult) {
    //     TournamentCompetitors.update( id, {$inc: {[properResult]: 1, [erroneousEntry]: -1}});
    // },
    //
    // 'tournamentCompetitors.drop' (id) {
    //     TournamentCompetitors.update(id, {$set: {"dropped": true}})
    // },

    'tournamentCompetitors.remove' (id) {
        TournamentCompetitors.remove(id);
    },
    'tournamentCompetitors.removeLeagueCompetitor' (tournamentId, compLeagueId){
        TournamentCompetitors.remove({tournamentId: tournamentId, leagueCompetitorId: compLeagueId});
    },

    'tournamentCompetitors.removeAllTournamentCompetitors' (tournamentId) {
        TournamentCompetitors.remove({tournamentId: tournamentId });
    }
});