import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const TempDoubleMatches = new Mongo.Collection('tempDoubleMatches');

if(Meteor.isServer){
    Meteor.publish('tempDoubleMatches', ()=> {
        return TempDoubleMatches.find();
    });
}

Meteor.methods({
    'tempDoubleMatches.insert' (tournamentId, stage, round, matchesArray) {
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

            TempDoubleMatches.batchInsert(matchesArray, (err, result) => {
                if (err) {
                    return;
                }
                //var matchesIds = result; //need to see what is returned here with batchInsert
            });
        }
    },
    "tempDoubleMatches.removeAllTournamentMatches" (tournamentId) {
        TempDoubleMatches.remove({"tournamentId": tournamentId});
    },
});

//Store all upper bracket matches