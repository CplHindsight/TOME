import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const LeagueCompetitors = new Mongo.Collection('leagueCompetitors');

if(Meteor.isServer){
    Meteor.publish('leagueCompetitors', ()=> {
        return LeagueCompetitors.find();
    });
}

Meteor.methods({
    'leagueCompetitors.insert' (leagueId, competitorArray) {
        if (this.isSimulation) {

        }
        else if (competitorArray.length > 0) {
            check(leagueId, String);
            if(competitorArray.length > 0){
                for (var i = 0; i < competitorArray.length; i++) {
                    check(competitorArray[i].name, String);
                    check(competitorArray[i].email, String);
                    competitorArray[i].leagueId = leagueId;
                    competitorArray[i].tournamentsPlayed = 0;
                    competitorArray[i].totalWins = 0;
                    competitorArray[i].totalLosses = 0;
                    competitorArray[i].totalDraws = 0;
                    competitorArray[i].ELO = null; //what will ELO start at?
                    competitorArray[i].isActive = true;
                }

                if (!Meteor.userId()) {
                    throw new Meteor.Error("Not Authorized");
                }

                LeagueCompetitors.batchInsert(competitorArray, (err, result) => {
                    if (err) {
                        return;
                    }
                    //var leagueCompetitorIds = result; //need to see what is returned here with batchInsert

                });
            }
        }
    },

    // 'leagueCompetitors.update' (id, param, value){
    //     //https://stackoverflow.com/questions/14564188/how-to-dynamically-update-set-a-sub-attribute-of-a-collection-in-meteor
    //     LeagueCompetitors.update(id, {$set: {[param]: value}});
    // },
    //
    // 'leagueCompetitors.updateResults' (id, result){
    //     LeagueCompetitors.update(id, {$inc: {[result]: 1}});
    // },
    //
     'leagueCompetitors.updateValues' (id, name, email) {
         LeagueCompetitors.update(id, {$set: {name: name, email: email}});
     },
    //
    // 'leagueCompetitors.updateRankingCriteria' (id, rankingValue) {
    //     LeagueCompetitors.update(id, {$set: {rankingCriteria1: rankingValue}});
    // },
    //
    // 'leagueCompetitors.updateFullResult' (id, result, rankingValue) {
    //     LeagueCompetitors.update(id,
    //         {$inc: {[result]: 1}}, {$set: {rankingCriteria1: rankingValue}});
    // },

    // //shouldn't need this function
    // 'leagueCompetitors.fixResults' (id, erroneousEntry, properResult) {
    //     LeagueCompetitors.update(id, {$inc: {[properResult]: 1, [erroneousEntry]: -1}});
    // },


    'leagueCompetitors.remove' (id) {
        LeagueCompetitors.remove(id);
    },

    'leagueCompetitors.removeAllLeagueCompetitors' (leagueId) {
        LeagueCompetitors.remove({leagueId: leagueId });
    },

    'leagueCompetitors.setInactive' (id) {
        LeagueCompetitors.update(id, {$set: {isActive: false}});
    },
});