import angular from 'angular';
import angularMeteor from 'angular-meteor';

import { Meteor } from 'meteor/meteor';

import { Leagues } from '../models/leagues';
import { LeagueCompetitors } from '../models/leagueCompetitors';
import { Tournaments } from "../models/tournaments";

import template from '../views/league_dashboard.html';

const name = "league_dashboard";

export default angular.module(name, [
    angularMeteor
])
    .controller("leagueController", function($scope, $reactive, $routeParams){
        'ngInject';
        $reactive(this).attach($scope);

        this.subscribe("leagues");
        this.subscribe("leagueCompetitors");
        this.subscribe("tournaments");

        this.url = "";

        this.league = "";
        this.leagueId = "";

        this.viewComp = false;
        this.standings = false;

        //Warning flags
        this.editWarning = false;
        this.emailWarning = false;
        this.compWarning = false;
        this.emailOutput = "";
        this.compOutput = "";
        this.competitorLoaded = false;
        this.editCompetitor = false;

        const maxCompetitors = 128;

        this.autorun(()=> {
            this.url = $routeParams.url;

            this.leagueHandle = this.subscribe("leagues", () => [], {
                onReady() {
                    var self = this;
                    self.league = Leagues.findOne({URL: self.url});
                    if (self.league) {
                        self.leagueId = self.league._id;
                    }
                    self.leagueHandle.stop();
                }
            });
        });

        //File variable declaration
        var csvFile, compList, updatedCompList, incorrectCompList, compListOverMax;

        this.helpers({
            findLeague(){
                return Leagues.findOne({URL: this.getReactively("url")});
            },
            findLeagueCompetitors(){
                return LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true},
                    {sort: {ELO: -1, totalWins: -1, totalDraws: -1}});
            },
            leagueCompetitorsCount(){
                return LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true}).count();
            },
            hasLeagueCompetitors() { //used for spinner if necessary
                return (LeagueCompetitors.findOne({leagueId: this.getReactively("leagueId"), isActive: true}) !== undefined);
            },
            findLeagueTournaments(){
                return Tournaments.find({leagueId: this.getReactively("leagueId")}, {sort: {dateLastActive: -1}});
            },
        });

        this.viewCompetitors = ()=> {
            this.viewComp = true;
            this.standings = false;
        };

        this.hideCompetitors = ()=> {
            this.viewComp = false;
            this.standings = false;
        };

        this.viewStandings = ()=> {
          this.standings = true;
          //should this also set viewComp to a default?
        };

        //Add individual competitor
        this.addCompetitor = ()=> {
            var compSet = LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true});
            var compArray = [];
            var competitor = {};
            var flag = false;

            var currCompCount = LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true}).count();

            if(this.compName && this.compEmail){
                competitor = {
                    name: this.compName,
                    email: this.compEmail
                };
                compSet.forEach((val)=>{
                    if(competitor.email === val.email){
                        flag = true;
                    }
                });
            }
            if(competitor.name !== undefined && competitor.name !== null && competitor.name !== ""
                && competitor.email !== undefined && competitor.email !== null && competitor.email !== ""){
                if(currCompCount < maxCompetitors) {
                    if (this.leagueId && competitor && !flag) {
                        this.competitorLoaded = true;
                        compArray.push(competitor);
                        Meteor.call('leagueCompetitors.insert', this.leagueId, compArray);
                        this.compName = "";
                        this.compEmail = "";
                    }
                    else {
                        this.emailWarning = true;
                        this.emailOutput += competitor.email + '\n';
                        this.compName = "";
                        this.compEmail = "";
                    }
                }
                else{
                    this.compWarning = true;
                    this.compOutput += competitor.email + '\n';
                    this.compName = "";
                    this.compEmail = "";
                }
            }
        };

        //Retrieve CSV file from the view scope
        $scope.handleFiles = (files)=> {
            if(files) {
                this.getAsText(files[0]);
            }
        };

        //Gets file as blob
        this.getAsText = (fileToRead)=> {
            var reader = new FileReader();
            reader.readAsText(fileToRead);
            reader.onload = this.loadHandler;
            reader.onerror = this.errorHandler;
        };

        this.loadHandler = (event)=> {
            csvFile = event.target.result;
            this.processData(csvFile);
        };

        this.errorHandler = (evt)=> {
            if(evt.target.error.name == "NotReadableError"){
                alert("Cannot read file.")
            }
        };

        //File reader
        this.processData = (csv)=> {
            var compSet = LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true});
            var allTextLines = csv.split(/\r\n|\n/);
            var flag = false;
            var competitor = {};

            var currCompCount = LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true}).count();

            compList = [];
            incorrectCompList = [];
            compListOverMax = [];

            for (var i = 0; i < allTextLines.length; i++) {
                var data = allTextLines[i].split(',');
                if(data.length && !checkBlank(data)){
                    competitor = {
                        name: data[0],
                        email: data[1]
                    };
                    compSet.forEach((val)=>{
                        if(competitor.email === val.email){
                            incorrectCompList.push(competitor);
                            flag = true;
                        }
                    });
                    if(!flag){
                        if(currCompCount < maxCompetitors){
                            compList.push(competitor);
                        }
                        else{
                            compListOverMax.push(competitor);
                        }
                    }
                    else{
                        flag = false;
                    }
                }
            }

            function checkBlank(str){
                return (!str || /^\s*$/.test(str))
            }
        };

        //Upload data from file reader
        this.uploadCompFile = ()=> {
            var currCompCount = LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true}).count();
            var count = 0;

            updatedCompList = [];

            if(incorrectCompList.length){
                this.emailWarning = true;
                for(var i = 0; i < incorrectCompList.length; i++){
                    this.emailOutput += incorrectCompList[i].email + '\n';
                }
            }
            if(this.leagueId && compList) {
                if(compListOverMax.length > 0){
                    this.compWarning = true;
                    for(var i = 0; i < compListOverMax.length; i++){
                        this.compOutput += compListOverMax[i].email + '\n';
                    }
                }
                else{
                    this.competitorLoaded = true;
                    for(var i = 0; i < compList.length && currCompCount < maxCompetitors; i++){
                        updatedCompList.push(compList[i]);
                        count++;
                        currCompCount++;
                    }
                    if(updatedCompList.length < compList.length){
                        compListOverMax = [];

                        for(var i = count; i < compList.length; i++){
                            compListOverMax.push(compList[i]);
                        }
                        Meteor.call('leagueCompetitors.insert', this.leagueId, updatedCompList);
                        Meteor.call('leagues.updateActiveCompetitors', this.leagueId);
                        this.compWarning = true;
                        for(var i = 0; i < compListOverMax.length; i++){
                            this.compOutput += compListOverMax[i].email + '\n';
                        }
                    }
                    else{
                        Meteor.call('leagueCompetitors.insert', this.leagueId, compList);
                        Meteor.call('leagues.updateActiveCompetitors', this.leagueId);
                    }
                }
            }
            compList = "";
            csvFile = "";
            var input = $("#compFileUpload");
            input.replaceWith(input.val('').clone(true));
        };

        //Edit competitor fields
        this.editComp = (comp)=> {
            var compSet = LeagueCompetitors.find({leagueId: this.getReactively("leagueId"), isActive: true});
            var flag = false;
            this.editWarning = false;
            if(this.compEditName !== undefined && this.compEditName !== null
                && this.compEditName !== "" && this.compEditEmail !== undefined
                && this.compEditEmail !== null && this.compEditEmail !== "") {
                compSet.forEach((val) => {
                    if (this.compEditEmail === val.email) {
                        if (this.compEditEmail !== comp.email) {
                            flag = true;
                        }
                    }
                });
                if (!flag) {
                    this.emailWarning = false;
                    this.emailOutput = "";
                    comp.toggle = !comp.toggle;
                    Meteor.call("leagueCompetitors.updateValues", comp._id, this.compEditName, this.compEditEmail);
                }
                else {
                    this.emailWarning = true;
                    this.emailOutput += this.compEditEmail + '\n';
                    this.compEditName = comp.name;
                    this.compEditEmail = comp.email;
                }
            }
            else{
                this.editWarning = true;
            }
            this.editCompetitor = false;
        };

        //Toggle edit options
        this.toggleEdit = (comp)=> {
            if(!this.editCompetitor){
                this.editCompetitor = true;
            }
            else{
                this.editCompetitor = false;
            }
            comp.toggle = !comp.toggle;
            this.editWarning = false;
            this.emailWarning = false;
            this.emailOutput = "";
            this.compEditName = comp.name;
            this.compEditEmail = comp.email;
        };

        this.setInactive = (id)=> {
            bootbox.confirm({
                message: '<h2><strong>Are you sure you want to delete this competitor?</strong></h2>',
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Confirm'
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel'
                    }
                },
                callback: (result)=> {
                    if(result){
                        this.competitorLoaded = false;
                        Meteor.call("leagueCompetitors.setInactive", id);
                        Meteor.call('leagues.updateActiveCompetitors', this.leagueId);
                    }
                }
            });
        };

        this.deleteTournament = (tournamentId)=> {
            bootbox.confirm({
                message: '<h2><strong>Are you sure you want to delete this tournament?</strong></h2>',
                buttons: {
                    confirm: {
                        label: '<i class="fa fa-check"></i> Confirm'
                    },
                    cancel: {
                        label: '<i class="fa fa-times"></i> Cancel'
                    }
                },
                callback: (result)=> {
                    if(result){
                        Meteor.call("tournaments.deleteTournament", tournamentId);
                    }
                }
            });
        };
    })
    .config(config);

function config($routeProvider){
    'ngInject';
    $routeProvider
        .when('/league/:url', {
            templateUrl: template
        });
}

/*
function formatString (name){
    return name.replace(/_/g, " ");
}*/
