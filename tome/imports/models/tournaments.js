import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import { Leagues } from './leagues';
import { Stages } from './stages';
import { TournamentCompetitors } from './tournamentCompetitors';
import { LeagueCompetitors } from './leagueCompetitors';

export const Tournaments = new Mongo.Collection('tournaments');

if(Meteor.isServer){
    Meteor.publish('tournaments', ()=> {
        return Tournaments.find();
    });
}

Meteor.methods({
    'tournaments.insert' (newTournament) {
        if (this.isSimulation) {

        }
        else {
            if(newTournament.name !== null){
                check(newTournament.name, String);
            }
            check(newTournament.maxCompetitors, Number);
            check(newTournament.URL, String);
            if (newTournament.leagueId !== null) {
                check(newTournament.leagueId, String);
            }
            if(newTournament.organizerId !== null){
                check(newTournament.organizerId, String);
            }
            if(newTournament.coordinatorPassword !== null) {
                check(newTournament.coordinatorPassword, String);
            }

            /*if (newTournament.organizerId !== null && !Meteor.userId()) {
                throw new Meteor.Error("Not Authorized");
            }*/

            var today = new Date();
            var tournament = {
                name: newTournament.name, //string
                maxCompetitors: newTournament.maxCompetitors, //int
                URL: newTournament.URL, //string
                leagueId: newTournament.leagueId, //string or null
                organizerId: newTournament.organizerId, //string or null
                coordinatorPassword: newTournament.coordinatorPassword, //string
                currentStage: 1, //int
                currentRound: 0, //int
                dateCreated: today, //date as string
                dateLastActive: today, //date as string
                generatedFrom: newTournament.generatedFrom
            };


            return Tournaments.insert(tournament, (err, result) => {
                if (err) {
                    return;
                }
            });
        }
    },

    //should this just handle the CurrentRound and not bother checking?
    'tournaments.updateCurrentRound' (id, stage, round) {
        Tournaments.update(id, {$set: {currentStage: stage, currentRound: round, dateLastActive: new Date()}});
    },

    'tournaments.updateCurrentStage' (id) {
        Tournaments.update(id, {$inc: {currentStage: 1}}, {$set: {dateLastActive: new Date()}});
        if (Tournaments.findOne(id).leagueId !== null) {
            Meteor.call('leagues.updateDateLastActive', leagueId);
        }
    },

    'tournaments.updateMaxCompetitors' (id, maxCompetitors) {
        Tournaments.update(id, {$set: {maxCompetitors: maxCompetitors, dateLastActive: new Date()}});
    },

    'tournaments.updateDateLastActive' (id, leagueId=null) {
        if (leagueId !== null) {
            Meteor.call('leagues.updateDateLastActive', leagueId);
        }
        Tournaments.update(id, {$set: {dateLastActive: new Date()}});
    },

    'tournaments.deleteTournament' (id) {
        Meteor.call('matches.removeAllTournamentMatches', id);
        Meteor.call('tournamentCompetitors.removeAllTournamentCompetitors', id);
        Meteor.call('stages.removeAllTournamentStages', id);
        Meteor.call('tempDoubleMatches.removeAllTournamentMatches', id);
        var leagueId = Tournaments.findOne(id).leagueId;
        if (leagueId !== null) {
            Meteor.call('leagues.updateDateLastActive', leagueId);
        }
        Tournaments.remove(id);
    },

    'tournaments.removeAllLeagueTournaments' (leagueId) {
        var leagueTournaments = Tournaments.find({leagueId: leagueId}, {_id: 1});
        for (var i = 0; i < leagueTournaments.length; i++) {
            Meteor.call('tournaments.remove', leagueTournaments[0]._id);
        }
    },

    'tournaments.updateActiveCompetitors'(id) {
        Tournaments.update(id, {$set:
            {activeCompetitors: TournamentCompetitors.find({tournamentId: id, isActive: true}).count(),
                dateLastActive: new Date()}});
    },

    'tournament.finishTournament' (id) {
        var tournament = Tournaments.findOne(id);
        Tournaments.update(id, {$set: {isFinished: true, dateLastActive: new Date()}});
        if (tournament.leagueId !== null) {
            var competitors = TournamentCompetitors.find({tournamentId: id});
            competitors.forEach((comp)=>{
                LeagueCompetitors.update(comp.leagueCompetitorId,
                    {$inc: {tournamentsPlayed: 1, totalWins: comp.wins, totalLosses: comp.losses, totalDraws: comp.draws}, $set: {ELO: comp.ELO}})
            });
            Meteor.call('leagues.updateDateLastActive', tournament.leagueId);
        }
    }
});