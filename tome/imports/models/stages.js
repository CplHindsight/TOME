import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

import { Tournaments } from './tournaments';

export const Stages = new Mongo.Collection('stages');

if(Meteor.isServer){
    Meteor.publish('stages', ()=> {
        return Stages.find();
    });
}

Meteor.methods({
    'stages.insert' (tournamentId, stages){
        if (this.isSimulation) {

        }
        else if (stages.length > 0){
            check(tournamentId, String);
            for (var i = 0; i < stages.length; i++) {
                check(stages[i].type, String);
                check(stages[i].rounds, Number);
                if (stages[i].cutoffCriteria !== null && stages[i].cutoffNumber !== null) {
                    check(stages[i].cutoffCriteria, String);
                    check(stages[i].cutoffNumber, Number);
                }
                check(stages[i].stageNumber, Number);
                stages[i].tournamentId = tournamentId;
            }

            /*var tournament = Tournaments.findOne({tournamentId: tournamentId});

            if (tournament.organizerId !== null && !Meteor.userId()) {
                throw new Meteor.Error("Not Authorized");
            }*/

            return Stages.batchInsert(stages, (err, result) => {
                if (err) {
                    return;
                }
                // var stagesIds = result; //need to see what is returned here with batchInsert
            });
        }
    },

    'stages.updateRounds' (tournamentId, stageNumber, rounds) {
        Stages.update({tournamentId: tournamentId, stageNumber: stageNumber}, {$set : {rounds: rounds}});
    },

    'stages.remove' (id) {
        Stages.remove(id);
    },

    'stages.removeAllTournamentStages' (tournamentId) {
        Stages.remove({tournamentId: tournamentId });
    },
});