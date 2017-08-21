import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { LeagueCompetitors } from './leagueCompetitors';

export const Leagues = new Mongo.Collection('leagues');


if(Meteor.isServer){
    Meteor.publish('leagues', ()=> {
        return Leagues.find();
    });
}

Meteor.methods({
    'leagues.insert' (newLeague) {
        var today = new Date();

        check(newLeague.name, String);
        check(newLeague.organizerId, String);
        check(newLeague.URL, String);

        newLeague.activeCompetitors = 0;
        newLeague.dateCreated = today;
        newLeague.dateLastActive = today;

        return Leagues.insert(newLeague, (err, result)=>{
            if(err){
                return;
            }
            var leagueId = result;
        });
    },

    'leagues.updateDateLastActive' (leagueId) {
        Leagues.update(leagueId, {$set: {dateLastActive: new Date()}});
    },

    'leagues.delete' (leagueId){
        Meteor.call('tournaments.removeAllLeagueTournaments', leagueId);
        Meteor.call('leagueCompetitors.removeAllLeagueCompetitors', leagueId);
        Leagues.remove(leagueId);
    },

    'leagues.updateActiveCompetitors'(id) {
        Leagues.update(id, {$set:
            {activeCompetitors: LeagueCompetitors.find({leagueId: id, isActive: true}).count(),
                dateLastActive: new Date()}});
    }
});