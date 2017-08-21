import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Matches = new Mongo.Collection('matches');


if(Meteor.isServer){
    Meteor.publish('matches', ()=> {
        return Matches.find();
    });
}


Meteor.methods({
    'matches.insert' (tournamentId, stage, round, matchesArray) {
        if (this.isSimulation) {

        }
        else if (matchesArray.length > 0) {
            check(tournamentId, String);
            check(stage, Number);
            check(round, Number);

            for (var i = 0; i < matchesArray.length; i++) {
                if (matchesArray[i].competitor1Id === null && matchesArray[i].competitor2Id === null) {
                    matchesArray[i].winnerId = null;
                    matchesArray[i].loserId = null;
                }

                else if (matchesArray[i].competitor1Id != null && matchesArray[i].competitor2Id != null) {
                    check(matchesArray[i].competitor1Id, String);
                    check(matchesArray[i].competitor2Id, String);
                }
                else {
                    check(matchesArray[i].competitor1Id, String);
                    matchesArray[i].competitor2Id = null;
                    matchesArray[i].winnerId = matchesArray[i].competitor1Id;
                    matchesArray[i].loserId = null;
                    matchesArray[i].competitor1Score = 1;
                    matchesArray[i].competitor2Score = 0;
                }
                matchesArray[i].tournamentId = tournamentId;
                matchesArray[i].stage = stage;
                matchesArray[i].round = round;
                matchesArray[i].roundMatchNumber = i + 1;
            }

            Matches.batchInsert(matchesArray, (err, result) => {
                if (err) {
                    return;
                }
                //var matchesIds = result; //need to see what is returned here with batchInsert
            });
        }

        //  Meteor.call('tournaments.updateCurrentRound', tournamentId, stage, round);
    },

    'matches.updateResult' (id, competitor1Id, competitor2Id, competitor1Score, competitor2Score)
    {
        var winnerId = null;
        var loserId = null;
        if (competitor1Score > competitor2Score) {
            winnerId = competitor1Id;
            loserId = competitor2Id;
        }
        else if (competitor2Score > competitor1Score) {
            winnerId = competitor2Id;
            loserId = competitor1Id;
        }
        //else is a draw, leaving the values as null
        Matches.update(id,
            {
                $set: {
                    competitor1Score: competitor1Score,
                    competitor2Score: competitor2Score,
                    winnerId: winnerId,
                    loserId: loserId
                }
            });
        //Meteor.call('tournaments.updateDateLastActive', tournamentId);
    },

    "matches.remove" (id) {
        Matches.remove(id);
    },

    "matches.removeAllTournamentMatches" (tournamentId) {
        Matches.remove({"tournamentId": tournamentId});
    },

    });